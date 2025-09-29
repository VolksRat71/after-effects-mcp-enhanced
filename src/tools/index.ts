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
  registerSetLayerExpressionTool,
  registerGetLayerPropertiesTool
} from "./layer/index.js";

import {
  registerCopyAnimationTool,
  registerSetMultipleKeyframesTool,
  registerApplyAnimationTemplateTool
} from "./animation/index.js";

import {
  registerApplyEffectTool,
  registerApplyEffectTemplateTool,
  registerGetEffectsHelpTool
} from "./effects/index.js";

import {
  registerImportAssetsTool,
  registerReplaceFootageTool
} from "./media/index.js";

import {
  registerTestAnimationTool,
  registerRunCustomScriptTool,
  registerRunBridgeTestTool
} from "./utility/index.js";

import {
  registerGetCommandHistoryTool,
  registerExportHistoryAsScriptTool
} from "./history/index.js";

import {
  registerRenderFrameDebugTool,
  registerRenderFramesSampledDebugTool,
  registerRenderFrameExportTool,
  registerRenderFramesSampledExportTool
} from "./render/index.js";

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer, context: ToolContext): void {
  console.log(colors.cyan('[MCP TOOLS] Registering tools...'));

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
  registerGetLayerPropertiesTool(server, context);

  // Register animation tools
  console.log(colors.yellow('[MCP TOOLS] Registering animation tools...'));
  registerCopyAnimationTool(server, context);
  registerSetMultipleKeyframesTool(server, context);
  registerApplyAnimationTemplateTool(server, context);

  // Register effects tools
  console.log(colors.yellow('[MCP TOOLS] Registering effects tools...'));
  registerApplyEffectTool(server, context);
  registerApplyEffectTemplateTool(server, context);
  registerGetEffectsHelpTool(server, context);

  // Register media tools
  console.log(colors.yellow('[MCP TOOLS] Registering media tools...'));
  registerImportAssetsTool(server, context);
  registerReplaceFootageTool(server, context);

  // Register utility tools
  console.log(colors.yellow('[MCP TOOLS] Registering utility tools...'));
  registerTestAnimationTool(server, context);
  registerRunCustomScriptTool(server, context);
  registerRunBridgeTestTool(server, context);

  // Register history tools
  console.log(colors.yellow('[MCP TOOLS] Registering history tools...'));
  registerGetCommandHistoryTool(server, context);
  registerExportHistoryAsScriptTool(server, context);

  // Register render tools
  console.log(colors.yellow('[MCP TOOLS] Registering render tools...'));
  // Debug tools for AI/LLM visual understanding
  registerRenderFrameDebugTool(server, context);
  registerRenderFramesSampledDebugTool(server, context);
  // Export tools for user deliverables
  registerRenderFrameExportTool(server, context);
  registerRenderFramesSampledExportTool(server, context);

  console.log(colors.green('[MCP TOOLS] All tools registered successfully!'));
}
