import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename } from '../../server/utils/sanitize.js';

export function registerRenderFramesSampledExportTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frames-sampled-export",
    "USER EXPORT TOOL: Renders multiple sampled frames for permanent export. Output goes to build/dist/<sessionName> directory with NO auto-cleanup. Use this when the user requests image sequences for delivery, creating animations externally, documentation, or archival. Files are preserved until manually deleted.",
    {
      comp: z.string().describe("Name of the composition to export"),
      startTime: z.number().min(0).describe("Start time in seconds"),
      endTime: z.number().positive().describe("End time in seconds (must be > startTime)"),
      sampleCount: z.number().int().positive().optional().describe("Number of frames to sample evenly"),
      sampleFps: z.number().positive().optional().describe("Sample at specific FPS"),
      frameStep: z.number().int().positive().optional().describe("Sample every N frames"),
      sessionName: z.string().describe("Name for the export session directory (required for organization)"),
      outputPrefix: z.string().optional().default('frame').describe("Prefix for frame filenames"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format"),
      maxFrames: z.number().int().positive().optional().default(100).describe("Maximum frames to render")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frames-sampled-export', params);

      try {
        if (params.endTime <= params.startTime) {
          throw new Error('endTime must be greater than startTime');
        }

        const samplingStrategies = [params.sampleCount, params.sampleFps, params.frameStep].filter(s => s !== undefined);
        if (samplingStrategies.length > 1) {
          throw new Error('Only one sampling strategy (sampleCount, sampleFps, or frameStep) can be specified');
        }

        // User exports go to build/dist with custom session name
        const distDir = path.join(process.cwd(), 'build', 'dist');
        const sessionName = sanitizeFilename(params.sessionName);
        const sessionDir = path.join(distDir, sessionName);

        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }

        const outputPrefix = params.outputPrefix
          ? sanitizeFilename(params.outputPrefix)
          : 'frame';

        fileManager.writeCommandFile("renderFramesSampled", {
          comp: params.comp,
          startTime: params.startTime,
          endTime: params.endTime,
          sampleCount: params.sampleCount,
          sampleFps: params.sampleFps,
          frameStep: params.frameStep,
          sessionDir: sessionDir.replace(/\\/g, '/'),
          outputPrefix,
          format: params.format || 'png',
          maxFrames: params.maxFrames || 100
        });

        // NO cleanup scheduled for user exports

        historyManager.completeCommand(commandId, 'success', { queued: true });

        // Determine sampling description
        let samplingDesc = '';
        if (params.sampleCount) {
          samplingDesc = `${params.sampleCount} frames evenly distributed`;
        } else if (params.sampleFps) {
          samplingDesc = `sampled at ${params.sampleFps} FPS`;
        } else if (params.frameStep) {
          samplingDesc = `every ${params.frameStep} frames`;
        } else {
          samplingDesc = '5 frames evenly distributed (default)';
        }

        return {
          content: [
            {
              type: "text",
              text: `User export sequence from "${params.comp}" has been queued.\n` +
                    `Time range: ${params.startTime}s - ${params.endTime}s\n` +
                    `Sampling: ${samplingDesc}\n` +
                    `Output directory: ${sessionDir}\n` +
                    `\nThese frames will be permanently saved for user access.\n` +
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
