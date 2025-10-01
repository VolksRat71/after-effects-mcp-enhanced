import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerGetLayerPropertiesTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "get-layer-properties",
    "Get detailed information about a layer's properties including keyframe data",
    {
      compIndex: z.number().describe("1-based index of the composition"),
      layerIndex: z.number().describe("1-based index of the layer"),
      includeKeyframes: z.boolean().optional().describe("Include keyframe times and values")
    },
    async ({ compIndex, layerIndex, includeKeyframes = true }) => {
      const commandId = historyManager.startCommand('get-layer-properties', { compIndex, layerIndex, includeKeyframes });

      try {
        // Clear any stale results before running command
        fileManager.clearResultsFile();

        // Use direct panel command instead of customScript
        fileManager.writeCommandFile("getLayerProperties", {
          compIndex: compIndex,
          layerIndex: layerIndex,
          includeKeyframes: includeKeyframes
        });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to get layer properties has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing get layer properties: ${String(error)}`;
        historyManager.completeCommand(commandId, 'error', undefined, errorMsg);

        return {
          content: [
            {
              type: "text",
              text: errorMsg
            }
          ],
          isError: true
        };
      }
    }
  );
}