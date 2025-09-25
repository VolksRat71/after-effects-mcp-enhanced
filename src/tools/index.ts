import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolContext } from "./types.js";
import colors from "colors";

// Import all tool registrars
import {
  registerGetResultsTool,
  registerGetHelpTool,
  registerRunScriptTool
} from "./base/index.js";

import {
  registerCreateCompositionTool
} from "./composition/index.js";

import {
  registerSetLayerKeyframeTool,
  registerSetLayerExpressionTool
} from "./layer/index.js";

import {
  registerAnimationTools
} from "./animation/index.js";

import {
  registerEffectsTools
} from "./effects/index.js";

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer, context: ToolContext): void {
  console.log(colors.yellow('[MCP TOOLS] Registering tools...'));

  // Register base tools
  console.log(colors.yellow('[MCP TOOLS] Registering base tools...'));
  registerGetResultsTool(server, context);
  registerGetHelpTool(server, context);
  registerRunScriptTool(server, context);

  // Register composition tools
  console.log(colors.yellow('[MCP TOOLS] Registering composition tools...'));
  registerCreateCompositionTool(server, context);

  // Register layer tools
  console.log(colors.yellow('[MCP TOOLS] Registering layer tools...'));
  registerSetLayerKeyframeTool(server, context);
  registerSetLayerExpressionTool(server, context);

  // Register animation tools
  registerAnimationTools(server, context);

  // Register effects tools
  registerEffectsTools(server, context);

  // TODO: Register media tools

  console.log(colors.green('[MCP TOOLS] All tools registered successfully!'));
}
