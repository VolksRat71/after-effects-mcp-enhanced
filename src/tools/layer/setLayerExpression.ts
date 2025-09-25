import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import colors from 'colors';
import { LayerIdentifierSchema } from './setLayerKeyframe.js';

/**
 * Register the setLayerExpression tool
 */
export function registerSetLayerExpressionTool(server: McpServer, context: ToolContext): void {
  const { fileManager } = context;

  server.tool(
    "setLayerExpression",
    "Set or remove an expression for a specific layer property.",
    {
      ...LayerIdentifierSchema,
      propertyName: z.string().describe("Name of the property to apply the expression to (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
      expressionString: z.string().describe("The JavaScript expression string. Provide an empty string (\"\") to remove the expression.")
    },
    async (parameters) => {
      try {
        console.error(colors.cyan(`[MCP Layer] Setting expression for ${parameters.propertyName} on layer ${parameters.layerIndex}`));
        
        // Queue the command for After Effects
        fileManager.writeCommandFile("setLayerExpression", parameters);

        console.error(colors.green(`[MCP Layer] Expression command queued successfully`));

        return {
          content: [
            {
              type: "text",
              text: `Command to set expression for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for confirmation.`
            }
          ]
        };
      } catch (error) {
        console.error(colors.red(`[MCP Layer] Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: `Error queuing setLayerExpression command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}