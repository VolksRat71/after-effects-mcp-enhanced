import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerApplyEffectTemplateTool(server: McpServer, context: ToolContext): void {
  const { fileManager } = context;

  server.tool(
    "apply-effect-template",
    "Apply a predefined effect template to a layer in After Effects",
    {
      compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
      layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
      templateName: z.enum([
        "gaussian-blur",
        "directional-blur",
        "color-balance",
        "brightness-contrast",
        "curves",
        "glow",
        "drop-shadow",
        "cinematic-look",
        "text-pop"
      ]).describe("Name of the effect template to apply."),
      customSettings: z.record(z.any()).optional().describe("Optional custom settings to override defaults.")
    },
    async (parameters) => {
      try {
        // Queue the command for After Effects
        fileManager.writeCommandFile("applyEffectTemplate", parameters);

        return {
          content: [
            {
              type: "text",
              text: `Command to apply effect template '${parameters.templateName}' to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for confirmation.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error queuing apply-effect-template command: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}