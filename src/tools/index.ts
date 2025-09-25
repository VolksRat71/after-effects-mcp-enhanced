import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolContext } from "./types.js";

// Import all tool registrars
import {
  registerGetResultsTool,
  registerGetHelpTool,
  registerRunScriptTool
} from "./base/index.js";

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer, context: ToolContext): void {
  console.error('[MCP] Registering tools...');

  // Register base tools
  console.error('[MCP] Registering base tools...');
  registerGetResultsTool(server, context);
  registerGetHelpTool(server, context);
  registerRunScriptTool(server, context);

  // TODO: Register composition tools
  // TODO: Register layer tools
  // TODO: Register animation tools
  // TODO: Register effects tools
  // TODO: Register media tools

  console.error('[MCP] All tools registered successfully');
}