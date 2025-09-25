import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerApplyEffectTool(server: McpServer, context: ToolContext): void {
  const { fileManager } = context;

  server.tool(
    "apply-effect",
    "Apply an effect to a layer in After Effects",
    {
      compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
      layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
      effectName: z.string().optional().describe("Display name of the effect to apply (e.g., 'Gaussian Blur')."),
      effectMatchName: z.string().optional().describe("After Effects internal name for the effect (more reliable, e.g., 'ADBE Gaussian Blur 2')."),
      effectCategory: z.string().optional().describe("Optional category for filtering effects."),
      presetPath: z.string().optional().describe("Optional path to an effect preset file (.ffx)."),
      effectSettings: z.record(z.any()).optional().describe("Optional parameters for the effect (e.g., { 'Blurriness': 25 }).")
    },
    async (parameters) => {
      try {
        // Queue the command for After Effects
        fileManager.writeCommandFile("applyEffect", parameters);

        return {
          content: [
            {
              type: "text",
              text: `Command to apply effect to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for confirmation.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error queuing apply-effect command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}