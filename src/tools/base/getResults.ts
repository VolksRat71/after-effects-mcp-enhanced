import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolRegistrar, ToolContext } from "../types.js";

/**
 * Tool for getting results from the last script executed in After Effects
 */
export const registerGetResultsTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  server.tool(
    "get-results",
    "Get results from the last script executed in After Effects",
    {},
    async () => {
      console.error(`[MCP] Tool invoked: get-results`);

      try {
        const result = context.fileManager.readResultsFromTempFile();
        console.error(`[MCP] Tool success: get-results | Retrieved ${result.length} bytes`);

        return {
          content: [
            {
              type: "text",
              text: result
            }
          ]
        };
      } catch (error) {
        console.error(`[MCP] Tool failed: get-results | Error: ${String(error)}`);
        return {
          content: [
            {
              type: "text",
              text: `Error getting results: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};