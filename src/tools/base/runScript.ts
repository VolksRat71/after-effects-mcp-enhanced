import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolRegistrar, ToolContext } from "../types.js";
import colors from "colors";

/**
 * Tool for running predefined scripts in After Effects
 */
export const registerRunScriptTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  server.tool(
    "run-script",
    "Run a read-only script in After Effects",
    {
      script: z.string().describe("Name of the predefined script to run"),
      parameters: z.record(z.any()).optional().describe("Optional parameters for the script")
    },
    async ({ script, parameters = {} }) => {
      console.error(colors.cyan(`[MCP BASE] Tool invoked: run-script | Script: ${script}`));
      console.error(colors.cyan(`[MCP BASE] Parameters: ${JSON.stringify(parameters)}`));

      // Start tracking this command
      const commandId = context.historyManager.startCommand('run-script', { script, parameters });

      // Validate that script is safe (only allow predefined scripts)
      const allowedScripts = [
        "listCompositions",
        "getProjectInfo",
        "getLayerInfo",
        "createComposition",
        "createTextLayer",
        "createShapeLayer",
        "createSolidLayer",
        "setLayerProperties",
        "setLayerKeyframe",
        "setLayerExpression",
        "applyEffect",
        "applyEffectTemplate",
        "test-animation",
        "bridgeTestEffects"
      ];

      if (!allowedScripts.includes(script)) {
        const errorMsg = `Error: Script "${script}" is not allowed. Allowed scripts are: ${allowedScripts.join(", ")}`;
        context.historyManager.completeCommand(commandId, 'error', undefined, errorMsg);
        console.error(colors.red(`[MCP BASE] Tool failed: run-script | ${errorMsg}`));

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

      try {
        // Clear any stale result data
        context.fileManager.clearResultsFile();

        // Write command to file for After Effects to pick up
        context.fileManager.writeCommandFile(script, parameters);

        // Mark as successful (actual execution happens in After Effects)
        context.historyManager.completeCommand(commandId, 'success', { queued: true });

        console.error(colors.cyan(`[MCP BASE] Tool success: run-script | Script queued: ${script}`));
        console.error(colors.cyan(`[MCP BASE] Reply sent: Command queued for After Effects execution`));

        return {
          content: [
            {
              type: "text",
              text: `Command to run "${script}" has been queued.\n` +
                    `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        context.historyManager.completeCommand(commandId, 'error', undefined, String(error));

        return {
          content: [
            {
              type: "text",
              text: `[MCP BASE] Error queuing command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};
