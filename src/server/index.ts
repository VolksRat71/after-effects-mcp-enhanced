import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import colors from 'colors';
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