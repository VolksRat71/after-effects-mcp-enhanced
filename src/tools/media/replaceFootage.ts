import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerReplaceFootageTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "replace-footage",
    "Replace the source footage of an existing layer with a new file",
    {
      compIndex: z.number().describe("1-based index of the composition"),
      layerIndex: z.number().optional().describe("1-based index of the layer to replace footage for"),
      layerName: z.string().optional().describe("Name of the layer to replace footage for"),
      newFootagePath: z.string().describe("Absolute path to the new footage file")
    },
    async ({ compIndex, layerIndex, layerName, newFootagePath }) => {
      const commandId = historyManager.startCommand('replace-footage', { compIndex, layerIndex, layerName, newFootagePath });

      try {
        fileManager.clearResultsFile();
        fileManager.writeCommandFile("replaceFootage", {
          compIndex,
          layerIndex,
          layerName,
          newFootagePath
        });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to replace footage has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing replace footage: ${String(error)}`;
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