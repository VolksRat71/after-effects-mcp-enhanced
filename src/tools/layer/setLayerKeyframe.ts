import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import colors from 'colors';

// Common layer identification schema
export const LayerIdentifierSchema = {
  compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
  layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition.")
};

// Keyframe value schema
const KeyframeValueSchema = z.any().describe("The value for the keyframe (e.g., [x,y] for Position, [w,h] for Scale, angle for Rotation, percentage for Opacity)");

/**
 * Register the set-layer-keyframe tool
 */
export function registerSetLayerKeyframeTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "set-layer-keyframe",
    "Set a keyframe for a specific layer property at a given time.",
    {
      ...LayerIdentifierSchema,
      propertyName: z.string().describe("Name of the property to keyframe (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
      timeInSeconds: z.number().describe("The time (in seconds) for the keyframe."),
      value: KeyframeValueSchema
    },
    async (parameters) => {
      // Start tracking this command
      const commandId = historyManager.startCommand('set-layer-keyframe', parameters);

      try {
        // Queue the command for After Effects
        fileManager.writeCommandFile("set-layer-keyframe", parameters);

        // Mark as successful (actual execution happens in After Effects)
        historyManager.completeCommand(commandId, 'success', { queued: true });

        return {
          content: [
            {
              type: "text",
              text: `Command to set keyframe for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for confirmation.`
            }
          ]
        };
      } catch (error) {
        historyManager.completeCommand(commandId, 'error', undefined, String(error));

        return {
          content: [
            {
              type: "text",
              text: `[MCP LAYER] Error queuing set-layer-keyframe command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
