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
  registerCopyAnimationTool,
  registerSetMultipleKeyframesTool,
  registerApplyAnimationTemplateTool
} from "./animation/index.js";

import {
  registerApplyEffectTool,
  registerApplyEffectTemplateTool
} from "./effects/index.js";

import {
  registerImportAssetsTool,
  registerReplaceFootageTool
} from "./media/index.js";

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
  console.log(colors.yellow('[MCP TOOLS] Registering animation tools...'));
  registerCopyAnimationTool(server, context);
  registerSetMultipleKeyframesTool(server, context);
  registerApplyAnimationTemplateTool(server, context);

  // Register effects tools
  console.log(colors.yellow('[MCP TOOLS] Registering effects tools...'));
  registerApplyEffectTool(server, context);
  registerApplyEffectTemplateTool(server, context);

  // Register media tools
  console.log(colors.yellow('[MCP TOOLS] Registering media tools...'));
  registerImportAssetsTool(server, context);
  registerReplaceFootageTool(server, context);

  console.log(colors.green('[MCP TOOLS] All tools registered successfully!'));
}
