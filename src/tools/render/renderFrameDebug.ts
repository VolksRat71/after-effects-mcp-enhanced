import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename, generateUniqueFilename } from '../../server/utils/sanitize.js';

export function registerRenderFrameDebugTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frame-debug",
    "VISUAL DEBUGGING TOOL FOR AI/LLM: Renders a single frame from an After Effects composition to help AI assistants 'see' what they're working with. Output goes to temp directory with auto-cleanup after 1 hour. Use this to visually inspect compositions, check animations at specific times, or debug visual issues. The AI can then read the image file to understand the visual state.",
    {
      comp: z.string().describe("Name of the composition to render for visual inspection"),
      time: z.number().optional().describe("Time in seconds to render (optional) - useful for checking animation states"),
      frame: z.number().int().optional().describe("Frame number to render (optional, alternative to time)"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format (png recommended for quality)")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frame-debug', params);

      try {
        const tempDir = path.join(process.cwd(), 'build', 'temp');

        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Always generate unique filename for debug renders
        const outputFile = generateUniqueFilename('debug_frame', params.format || 'png');
        const outputPath = path.join(tempDir, outputFile);

        fileManager.writeCommandFile("renderFrame", {
          comp: params.comp,
          time: params.time,
          frame: params.frame,
          outputPath: outputPath.replace(/\\/g, '/'),
          format: params.format || 'png'
        });

        // Schedule cleanup of the debug frame after 1 hour
        fileManager.scheduleFileCleanup(outputPath);

        historyManager.completeCommand(commandId, 'success', { queued: true });

        return {
          content: [
            {
              type: "text",
              text: `Visual debug frame from "${params.comp}" has been queued for rendering.\n` +
                    `Output: ${outputPath}\n` +
                    `\nThis frame will help you visually understand the composition state.\n` +
                    `After rendering completes, you can use the Read tool to view the image.\n` +
                    `Note: File will be auto-cleaned after 1 hour.\n` +
                    `\nPlease ensure the "MCP Bridge Auto" panel is open in After Effects.`
            }
          ]
        };

      } catch (error) {
        historyManager.completeCommand(commandId, 'error', undefined, String(error));

        return {
          content: [
            {
              type: "text",
              text: `Error: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
