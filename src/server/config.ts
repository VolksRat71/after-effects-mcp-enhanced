import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server configuration
export const SERVER_CONFIG = {
  name: "AfterEffectsServer",
  version: "1.0.0"
};

// Path configuration - resolve paths relative to src directory
const srcDir = path.resolve(__dirname, '..');

export const PATHS = {
  SCRIPTS_DIR: path.join(srcDir, "scripts"),
  TEMP_DIR: path.join(srcDir, "..", "build", "temp"),
  SRC_DIR: srcDir
};

// Create and configure the MCP server instance
export function createServer(): McpServer {
  return new McpServer(SERVER_CONFIG);
}