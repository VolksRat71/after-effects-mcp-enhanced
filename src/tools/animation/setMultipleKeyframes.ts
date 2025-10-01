import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerSetMultipleKeyframesTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "set-multiple-keyframes",
    "Set multiple keyframes for different properties at once on a layer",
    {
      compIndex: z.number().describe("Index of the composition (1-based)"),
      layerIndex: z.number().describe("Index of the layer (1-based)"),
      keyframes: z.array(z.object({
        property: z.string().describe("Property name (e.g., 'Position', 'Scale')"),
        time: z.number().describe("Time in seconds"),
        value: z.any().describe("Value for the keyframe")
      })).describe("Array of keyframe data")
    },
    async ({ compIndex, layerIndex, keyframes }) => {
      const commandId = historyManager.startCommand('set-multiple-keyframes', {
        compIndex, layerIndex, keyframeCount: keyframes.length
      });

      try {
        fileManager.clearResultsFile();
        fileManager.writeCommandFile("setMultipleKeyframes", {
          compIndex,
          layerIndex,
          keyframes
        });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to set ${keyframes.length} keyframes queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing multiple keyframes: ${String(error)}`;
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