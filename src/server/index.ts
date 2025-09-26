import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import colors from 'colors';
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { createServer, PATHS } from './config.js';
import { initializeServices } from './services.js';
import { registerAllTools } from '../tools/index.js';

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
  context.fileManager.cleanupOldJSXFiles();

  // Register all tools with the server
  registerAllTools(server, context);

  // Set up file watcher for command and result files
  const commandFilePath = path.join(PATHS.TEMP_DIR, 'ae_command.json');
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
