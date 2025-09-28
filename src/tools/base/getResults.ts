import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import colors from "colors";
import { ToolRegistrar, ToolContext } from "../types.js";
import { ImageConverter } from "../../services/imageConverter.js";

/**
 * Tool for getting results from the last script executed in After Effects
 */
export const registerGetResultsTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  const imageConverter = new ImageConverter();

  server.tool(
    "get-results",
    "Get results from the last script executed in After Effects",
    {},
    async () => {
      try {
        const result = context.fileManager.readResultsFromTempFile();
        console.log(colors.green(`[MCP BASE] Tool success: get-results | Retrieved ${result.length} bytes`));

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: result
              }
            ]
          };
        }

        if (parsedResult && parsedResult.needsConversion) {
          console.log(colors.yellow(`[MCP BASE] Converting TIFF to ${parsedResult.targetFormat}...`));

          if (parsedResult.frames && Array.isArray(parsedResult.frames)) {
            for (let i = 0; i < parsedResult.frames.length; i++) {
              const frame = parsedResult.frames[i];
              if (frame.outputPath) {
                const convertedPath = await imageConverter.convertTiffToFormat(
                  frame.outputPath,
                  parsedResult.targetFormat
                );
                parsedResult.frames[i].outputPath = convertedPath;
              }
            }
            parsedResult.needsConversion = false;
            parsedResult.converted = true;
            console.log(colors.green(`[MCP BASE] Converted ${parsedResult.frames.length} frames`));
          } else {
            parsedResult = await imageConverter.processRenderResult(parsedResult);
            console.log(colors.green(`[MCP BASE] Conversion complete: ${parsedResult.outputPath}`));
          }
        }

        return {
          content: [
            {
              type: "text",
              text: typeof parsedResult === 'object' ? JSON.stringify(parsedResult, null, 2) : result
            }
          ]
        };
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
