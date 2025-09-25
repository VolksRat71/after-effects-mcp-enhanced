import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerRunCustomScriptTool(server: McpServer, context: ToolContext): void {
  const { fileManager, scriptExecutor, historyManager } = context;

  server.tool(
    "run-custom-script",
    "Run custom ExtendScript code in After Effects (use with caution)",
    {
      script: z.string().describe("ExtendScript code to execute"),
      description: z.string().optional().describe("Description of what this script does")
    },
    async ({ script, description }) => {
      // Start tracking this command
      const commandId = historyManager.startCommand('run-custom-script', {
        script: script.substring(0, 200) + (script.length > 200 ? '...' : ''), // Truncate for history
        description
      });

      try {
        // Use scriptExecutor to prepare the custom script
        const { tempScriptPath } = scriptExecutor.executeCustomScript(script, description);

        // Schedule cleanup of temp file
        fileManager.scheduleFileCleanup(tempScriptPath);

        // Clear any stale result data
        fileManager.clearResultsFile();

        // Write command to file for After Effects to pick up
        fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

        historyManager.completeCommand(commandId, 'success', {
          scriptPath: tempScriptPath,
          description
        });

        return {
          content: [
            {
              type: "text",
              text: `Custom script has been queued for execution.\n` +
                  (description ? `Description: ${description}\n` : '') +
                  `Script saved to: ${tempScriptPath}\n` +
                  `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing custom script: ${String(error)}`;
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