import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import { registerApplyEffectTool } from './applyEffect.js';
import { registerApplyEffectTemplateTool } from './applyEffectTemplate.js';
import colors from 'colors';

export function registerEffectsTools(server: McpServer, context: ToolContext): void {
  console.log(colors.yellow('[MCP TOOLS] Registering effects tools...'));

  registerApplyEffectTool(server, context);
  registerApplyEffectTemplateTool(server, context);
}
