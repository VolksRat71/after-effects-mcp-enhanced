import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeFilename, generateSessionId } from '../../server/utils/sanitize.js';

export function registerRenderFramesSampledTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frames-sampled",
    "Render multiple frames from a composition using sampling strategies",
    {
      comp: z.string().describe("Name of the composition to render"),
      startTime: z.number().min(0).describe("Start time in seconds"),
      endTime: z.number().describe("End time in seconds (must be > startTime)"),
      sampleCount: z.number().int().positive().optional().describe("Number of frames to sample evenly (mutually exclusive)"),
      sampleFps: z.number().positive().optional().describe("Sample at specific FPS (mutually exclusive)"),
      frameStep: z.number().int().positive().optional().describe("Sample every N frames (mutually exclusive)"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format"),
      outputPrefix: z.string().optional().describe("Output filename prefix (optional)"),
      inline: z.boolean().optional().default(false).describe("Return base64 inline image data for frames"),
      inlineMax: z.number().int().positive().optional().default(3).describe("Maximum number of frames to inline (default: 3)"),
      maxFrames: z.number().int().positive().optional().default(100).describe("Maximum frames to render (default: 100)")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frames-sampled', params);

      try {
        if (params.endTime <= params.startTime) {
          throw new Error('endTime must be greater than startTime');
        }

        const samplingStrategies = [params.sampleCount, params.sampleFps, params.frameStep].filter(s => s !== undefined);
        if (samplingStrategies.length > 1) {
          throw new Error('Only one sampling strategy (sampleCount, sampleFps, or frameStep) can be specified');
        }

        const tempDir = path.join(process.cwd(), 'build', 'temp');
        const sessionId = generateSessionId();
        const sessionDir = path.join(tempDir, sessionId);

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
          maxFrames: params.maxFrames || 100,
          inline: params.inline,
          inlineMax: params.inlineMax
        });

        historyManager.completeCommand(commandId, 'success', { queued: true });

        return {
          content: [
            {
              type: "text",
              text: `Command to render sampled frames from composition "${params.comp}" has been queued.\n` +
                    `Time range: ${params.startTime}s - ${params.endTime}s\n` +
                    `Output directory: ${sessionDir}\n` +
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
              text: `[RENDER-FRAMES] Error: ${String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
}