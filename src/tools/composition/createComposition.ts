import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext, ToolResponse } from '../types.js';
import colors from 'colors';

/**
 * Register the create-composition tool
 */
export function registerCreateCompositionTool(server: McpServer, context: ToolContext): void {
  const { fileManager } = context;

  server.tool(
    "create-composition",
    "Create a new composition in After Effects with specified parameters",
    {
      name: z.string().describe("Name of the composition"),
      width: z.number().int().positive().describe("Width of the composition in pixels"),
      height: z.number().int().positive().describe("Height of the composition in pixels"),
      pixelAspect: z.number().positive().optional().describe("Pixel aspect ratio (default: 1.0)"),
      duration: z.number().positive().optional().describe("Duration in seconds (default: 10.0)"),
      frameRate: z.number().positive().optional().describe("Frame rate in frames per second (default: 30.0)"),
      backgroundColor: z.object({
        r: z.number().int().min(0).max(255),
        g: z.number().int().min(0).max(255),
        b: z.number().int().min(0).max(255)
      }).optional().describe("Background color of the composition (RGB values 0-255)")
    },
    async (params) => {
      try {
        console.log(colors.cyan(`[MCP COMPOSITION] Creating composition: ${params.name}`));

        // Write command to file for After Effects to pick up
        fileManager.writeCommandFile("createComposition", params);

        console.log(colors.green(`[MCP COMPOSITION] Command queued successfully`));

        return {
          content: [
            {
              type: "text",
              text: `Command to create composition "${params.name}" has been queued.\n` +
                    `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        console.error(colors.red(`[MCP COMPOSITION] Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: `[MCP COMPOSITION] Error queuing composition creation: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
