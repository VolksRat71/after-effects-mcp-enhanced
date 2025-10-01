import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerCopyAnimationTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "copy-animation",
    "Copy all keyframes from a source layer to target layers with optional time offset",
    {
      compIndex: z.number().describe("Index of the composition (1-based)"),
      sourceLayerIndex: z.number().describe("Index of the source layer to copy from"),
      targetLayerIndices: z.array(z.number()).describe("Array of target layer indices to copy to"),
      properties: z.array(z.string()).optional().describe("Properties to copy (default: all animated properties)"),
      timeOffset: z.number().optional().describe("Time offset in seconds for each successive layer")
    },
    async ({ compIndex, sourceLayerIndex, targetLayerIndices, properties, timeOffset = 0 }) => {
      const commandId = historyManager.startCommand('copy-animation', {
        compIndex, sourceLayerIndex, targetLayerIndices, properties, timeOffset
      });

      try {
        fileManager.clearResultsFile();
        fileManager.writeCommandFile("copyAnimation", {
          compIndex,
          sourceLayerIndex,
          targetLayerIndices,
          properties: properties || null,
          timeOffset
        });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to copy animation queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing copy animation: ${String(error)}`;
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