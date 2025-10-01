import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import colors from 'colors';
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createServer, PATHS } from './config.js';
import { initializeServices } from './services.js';
import { registerAllTools } from '../tools/index.js';

// ES modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main entry point for the After Effects MCP Server
 */
async function main() {
  console.log(colors.cyan("[MCP SERVER] After Effects MCP Server starting..."));

  // Display configuration
  console.log(colors.blue(`[MCP INFO] Scripts directory: ${PATHS.SCRIPTS_DIR}`));
  console.log(colors.blue(`[MCP INFO] Temp directory: ${PATHS.TEMP_DIR}`));

  // Create server instance
  const server = createServer();

  // Initialize all services and get the context
  const context = initializeServices(PATHS);

  // Clean up old JSX files on startup
  context.fileManager.cleanupOldFiles();

  // Schedule periodic cleanup every 10 minutes
  setInterval(() => {
    console.log(colors.cyan("[MCP SERVER] Running periodic cleanup..."));
    context.fileManager.cleanupOldFiles();
  }, 600000); // 10 minutes in milliseconds

  // Clear any pending commands from previous sessions
  const commandFilePath = path.join(PATHS.TEMP_DIR, 'ae_command.json');
  try {
    await fs.promises.writeFile(commandFilePath, '{}', 'utf-8');
    console.log(colors.cyan("[MCP SERVER] Cleared pending commands from previous session"));
  } catch (e) {
    // File might not exist yet, which is fine
  }

  // Start TIFF converter watchers
  const buildTempDir = path.join(path.dirname(PATHS.TEMP_DIR), 'temp');
  const buildDistDir = path.join(path.dirname(PATHS.TEMP_DIR), 'dist');

  // Watch build/temp with auto-delete of originals
  context.tiffConverter.watchDirectory(buildTempDir, {
    deleteOriginal: true,
    targetFormat: 'png'
  });
  console.log(colors.cyan(`[MCP SERVER] TIFF converter watching: ${buildTempDir} (auto-delete TIFFs enabled)`));

  // Watch build/dist with auto-delete of originals (keep PNGs only)
  context.tiffConverter.watchDirectory(buildDistDir, {
    deleteOriginal: true,
    targetFormat: 'png'
  });
  console.log(colors.cyan(`[MCP SERVER] TIFF converter watching: ${buildDistDir} (auto-delete TIFFs enabled)`));

  // Convert any existing TIFF files on startup (delete TIFFs in both directories)
  context.tiffConverter.convertExistingTiffs(buildTempDir, 'png', true);
  context.tiffConverter.convertExistingTiffs(buildDistDir, 'png', true);

  // Register all tools with the server
  registerAllTools(server, context);

  // Register documentation resources for LLMs
  const projectRoot = path.dirname(path.dirname(__dirname));

  // Register Quick Start Guide
  server.registerResource(
    "quickstart",
    "docs://quickstart",
    {
      title: "After Effects MCP Quick Start",
      description: "Essential information for using After Effects MCP tools - start here!",
      mimeType: "text/markdown"
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: await fs.promises.readFile(
          path.join(projectRoot, 'MCP_QUICK_START.md'),
          'utf-8'
        )
      }]
    })
  );

  // Register Comprehensive Tools Guide
  server.registerResource(
    "tools-guide",
    "docs://tools/guide",
    {
      title: "Complete After Effects MCP Tools Guide",
      description: "Comprehensive documentation of all 30+ tools with parameters and examples",
      mimeType: "text/markdown"
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: await fs.promises.readFile(
          path.join(projectRoot, 'MCP_TOOLS_GUIDE.md'),
          'utf-8'
        )
      }]
    })
  );

  console.log(colors.green("[MCP SERVER] Documentation resources registered"));

  // Set up file watcher for command and result files
  // commandFilePath already declared above
  const resultFilePath = path.join(PATHS.TEMP_DIR, 'ae_mcp_result.json');

  let watcherReady = false;

  const watcher = chokidar.watch([commandFilePath, resultFilePath], {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  const handleFileEvent = (filePath: string) => {
    try {
      const fileName = path.basename(filePath);

      if (fileName === 'ae_command.json') {
        // Command file changed - read and log the dispatched command
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content || content.trim() === '') {
          return;
        }
        const commandData = JSON.parse(content);

        if (commandData.status === 'pending') {
          console.log(colors.magenta(`[MCP WATCHER] → Dispatched command: ${colors.bold(commandData.command)}`));
        } else if (commandData.status === 'running') {
          console.log(colors.yellow(`[MCP WATCHER] ⚡ Executing command: ${colors.bold(commandData.command)}`));
        } else if (commandData.status === 'completed' && commandData.command) {
          console.log(colors.cyan(`[MCP WATCHER] ✓ Completed command: ${colors.bold(commandData.command)}`));
        }
      } else if (fileName === 'ae_mcp_result.json') {
        // Result file changed - read and log the received result
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content || content.trim() === '') {
          return;
        }
        const resultData = JSON.parse(content);

        const commandName = resultData._commandExecuted || resultData.command || 'unknown';

        if (resultData.status === 'success' || resultData.success === true) {
          const message = resultData.message || JSON.stringify(resultData).substring(0, 100);
          console.log(colors.green(`[MCP WATCHER] ✓ Success result (${commandName}): ${colors.bold(message)}`));
        } else if (resultData.status === 'error' || resultData.success === false || resultData.error) {
          const errorMsg = resultData.error || resultData.message || 'Unknown error';
          console.log(colors.red(`[MCP WATCHER] ✗ Error result (${commandName}): ${colors.bold(errorMsg)}`));
        }
      }
    } catch (error) {
      console.error(colors.red(`[MCP WATCHER] Error parsing file event: ${error}`));
    }
  };

  watcher.on('add', handleFileEvent);
  watcher.on('change', handleFileEvent);

  watcher.on('ready', () => {
    if (!watcherReady) {
      watcherReady = true;
      console.log(colors.cyan(`[MCP WATCHER] Watching command and result files...`));
    }
  });

  watcher.on('error', (error: unknown) => {
    console.error(colors.red(`[MCP WATCHER] Watcher error: ${error}`));
  });

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log(colors.green("[MCP SERVER] After Effects MCP Server running..."));
}

// Start the server
main().catch(error => {
  console.error(colors.red(`[MCP SERVER] Fatal error: ${error}`));
  process.exit(1);
});
