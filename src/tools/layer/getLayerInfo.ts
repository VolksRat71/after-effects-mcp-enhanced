import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import colors from "colors";
import { ToolRegistrar, ToolContext } from "../types.js";

/**
 * Tool for getting information about layers in the active composition
 */
export const registerGetLayerInfoTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  server.tool(
    "get-layer-info",
    "Get information about layers in the active composition",
    {},
    async () => {
      try {
        // Queue the command for After Effects
        context.fileManager.writeCommandFile("getLayerInfo", {});

        console.log(colors.green(`[MCP LAYER] Tool success: get-layer-info | Command queued`));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: "Command 'getLayerInfo' has been queued for execution. Use 'get-results' to retrieve the layer information."
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(colors.red(`[MCP LAYER] Tool failed: get-layer-info | Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: `Error getting layer info: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
};