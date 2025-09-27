import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename, generateUniqueFilename } from '../../server/utils/sanitize.js';

export function registerRenderFrameTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frame",
    "Render a single frame from a composition in After Effects",
    {
      comp: z.string().describe("Name of the composition to render"),
      time: z.number().optional().describe("Time in seconds to render (optional)"),
      frame: z.number().int().optional().describe("Frame number to render (optional, alternative to time)"),
      outputFile: z.string().optional().describe("Output filename (optional, will be auto-generated if not provided)"),
      inline: z.boolean().optional().default(false).describe("Return base64 inline image data"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format (png or jpg)")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frame', params);

      try {
        const tempDir = path.join(process.cwd(), 'build', 'temp');

        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const outputFile = params.outputFile
          ? sanitizeFilename(params.outputFile)
          : generateUniqueFilename('frame', params.format || 'png');

        const outputPath = path.join(tempDir, outputFile);

        fileManager.writeCommandFile("renderFrame", {
          comp: params.comp,
          time: params.time,
          frame: params.frame,
          outputPath: outputPath.replace(/\\/g, '/'),
          format: params.format || 'png',
          inline: params.inline
        });

        historyManager.completeCommand(commandId, 'success', { queued: true });

        return {
          content: [
            {
              type: "text",
              text: `Command to render frame from composition "${params.comp}" has been queued.\n` +
                    `Output will be saved to: ${outputPath}\n` +
                    `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                    `Use the "get-results" tool after rendering completes to check for results.`
            }
          ]
        };

      } catch (error) {
        historyManager.completeCommand(commandId, 'error', undefined, String(error));

        return {
          content: [
            {
              type: "text",
              text: `[RENDER-FRAME] Error: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}