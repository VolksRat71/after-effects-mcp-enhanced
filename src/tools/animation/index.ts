import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import { registerCopyAnimationTool } from './copyAnimation.js';
import { registerSetMultipleKeyframesTool } from './setMultipleKeyframes.js';
import { registerApplyAnimationTemplateTool } from './applyAnimationTemplate.js';
import colors from 'colors';

export function registerAnimationTools(server: McpServer, context: ToolContext): void {
  console.log(colors.yellow('[MCP TOOLS] Registering animation tools...'));

  registerCopyAnimationTool(server, context);
  registerSetMultipleKeyframesTool(server, context);
  registerApplyAnimationTemplateTool(server, context);

  console.log(colors.green('[MCP TOOLS] Animation tools registered successfully'));
}