import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import colors from "colors";
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
      try {
        const result = context.fileManager.readResultsFromTempFile();
        console.log(colors.green(`[MCP BASE] Tool success: get-results | Retrieved ${result.length} bytes`));

        // Try to parse and format as JSON for better readability
        try {
          const parsedResult = JSON.parse(result);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(parsedResult, null, 2)
              }
            ]
          };
        } catch (e) {
          // If not JSON, return as-is
          return {
            content: [
              {
                type: "text",
                text: result
              }
            ]
          };
        }
      } catch (error) {
        console.error(colors.red(`[MCP BASE] Tool failed: get-results | Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: `[MCP BASE] Error getting results: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};
