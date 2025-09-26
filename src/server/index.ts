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

  const watcher = chokidar.watch([commandFilePath, resultFilePath], {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  watcher.on('change', (filePath: string) => {
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
        }
      } else if (fileName === 'ae_mcp_result.json') {
        // Result file changed - read and log the received result
        const content = fs.readFileSync(filePath, 'utf8');
        const resultData = JSON.parse(content);

        if (resultData.status === 'success') {
          console.log(colors.green(`[MCP WATCHER] ✓ Received result: ${colors.bold(resultData.command || 'unknown')}`));
        } else if (resultData.status === 'error') {
          console.log(colors.red(`[MCP WATCHER] ✗ Error result: ${colors.bold(resultData.command || 'unknown')} - ${resultData.error}`));
        }
      }
    } catch (error) {
      console.error(colors.red(`[MCP WATCHER] Error parsing file change: ${error}`));
    }
  });

  watcher.on('ready', () => {
    console.log(colors.cyan(`[MCP WATCHER] Watching command and result files...`));
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