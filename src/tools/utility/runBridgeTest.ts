import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerRunBridgeTestTool(server: McpServer, context: ToolContext): void {
  const { fileManager } = context;

  server.tool(
    "run-bridge-test",
    "Run the bridge test effects script to verify communication and apply test effects",
    {},
    async () => {
      try {
        // Clear any stale result data
        fileManager.clearResultsFile();

        // Write command to file for After Effects to pick up
        fileManager.writeCommandFile("bridgeTestEffects", {});

        return {
          content: [
            {
              type: "text",
              text: `Bridge test effects command has been queued.\n` +
                    `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                    `Use the "get-results" tool after a few seconds to check for the test results.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error queuing bridge test command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}