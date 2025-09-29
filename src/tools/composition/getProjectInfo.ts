import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import colors from "colors";
import { ToolRegistrar, ToolContext } from "../types.js";

/**
 * Tool for getting information about the current After Effects project
 */
export const registerGetProjectInfoTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  server.tool(
    "get-project-info",
    "Get information about the current After Effects project",
    {},
    async () => {
      try {
        // Queue the command for After Effects
        context.fileManager.writeCommandFile("getProjectInfo", {});

        console.log(colors.green(`[MCP COMPOSITION] Tool success: get-project-info | Command queued`));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Command 'getProjectInfo' has been queued for execution. Use 'get-results' to retrieve the project information."
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(colors.red(`[MCP COMPOSITION] Tool failed: get-project-info | Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: `Error getting project info: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};