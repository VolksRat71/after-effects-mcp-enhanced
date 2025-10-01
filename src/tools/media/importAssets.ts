import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerImportAssetsTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "import-assets",
    "Import image or video files from disk into the After Effects project",
    {
      files: z.array(z.string()).describe("Array of absolute file paths to import"),
      addToComp: z.boolean().optional().describe("Whether to add imported items to a composition"),
      compIndex: z.number().optional().describe("1-based index of the composition to add items to"),
      position: z.array(z.number()).length(2).optional().describe("Position [x, y] for the layers in the composition"),
      scale: z.array(z.number()).length(2).optional().describe("Scale [x, y] percentage for the layers")
    },
    async ({ files, addToComp, compIndex, position, scale }) => {
      const commandId = historyManager.startCommand('import-assets', { files, addToComp, compIndex, position, scale });

      try {
        fileManager.clearResultsFile();
        fileManager.writeCommandFile("importAssets", {
          files,
          addToComp: addToComp || false,
          compIndex: compIndex || 1,
          position: position || [960, 540],
          scale: scale || [100, 100]
        });

        historyManager.completeCommand(commandId, 'success', { filesImported: files.length });

        return {
          content: [
            {
              type: "text",
              text: `Command to import ${files.length} file(s) has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing import: ${String(error)}`;
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