import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename } from '../../server/utils/sanitize.js';

export function registerRenderFrameExportTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frame-export",
    "USER EXPORT TOOL: Renders a single frame from an After Effects composition for permanent export. Output goes to build/dist directory with NO auto-cleanup. Use this when the user requests specific frames for delivery, documentation, or external use. Files are preserved until manually deleted.",
    {
      comp: z.string().describe("Name of the composition to render"),
      time: z.number().optional().describe("Time in seconds to render (optional)"),
      frame: z.number().int().optional().describe("Frame number to render (optional, alternative to time)"),
      outputFile: z.string().describe("Output filename (required for user exports)"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format (png or jpg)")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frame-export', params);

      try {
        // User exports go to build/dist (permanent storage)
        const distDir = path.join(process.cwd(), 'build', 'dist');

        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }

        // Use user-provided filename (sanitized)
        const outputFile = sanitizeFilename(params.outputFile);

        // Ensure correct extension
        const ext = params.format || 'png';
        const finalOutputFile = outputFile.endsWith(`.${ext}`)
          ? outputFile
          : outputFile.replace(/\.[^.]+$/, '').replace(/\.$/, '') + `.${ext}`;

        const outputPath = path.join(distDir, finalOutputFile);

        fileManager.writeCommandFile("renderFrame", {
          comp: params.comp,
          time: params.time,
          frame: params.frame,
          outputPath: outputPath.replace(/\\/g, '/'),
          format: params.format || 'png'
        });

        // NO cleanup scheduled for user exports

        historyManager.completeCommand(commandId, 'success', { queued: true });

        return {
          content: [
            {
              type: "text",
              text: `User export frame from "${params.comp}" has been queued.\n` +
                    `Output: ${outputPath}\n` +
                    `\nThis file will be permanently saved for user access.\n` +
                    `No auto-cleanup will be applied to this export.\n` +
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
