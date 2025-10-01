import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { generateSessionId } from '../../server/utils/sanitize.js';

export function registerRenderFramesSampledDebugTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager } = context;

  server.tool(
    "render-frames-sampled-debug",
    "VISUAL DEBUGGING TOOL FOR AI/LLM: Renders multiple sampled frames to help AI assistants understand animations, transitions, and visual changes over time. Perfect for debugging animations, checking motion paths, or understanding visual progression. Output goes to temp session directory with auto-cleanup after 10 minutes. The AI can read these images sequentially to understand the animation flow.",
    {
      comp: z.string().describe("Name of the composition to visually analyze"),
      startTime: z.number().min(0).describe("Start time in seconds for visual sampling"),
      endTime: z.number().positive().describe("End time in seconds (must be > startTime)"),
      sampleCount: z.number().int().positive().optional().describe("Number of frames to sample evenly across time range (e.g., 5 for quick overview)"),
      sampleFps: z.number().positive().optional().describe("Sample at specific FPS for smooth motion analysis"),
      frameStep: z.number().int().positive().optional().describe("Sample every N frames for detailed inspection"),
      format: z.enum(['png', 'jpg']).optional().default('png').describe("Output format (png recommended for quality)"),
      maxFrames: z.number().int().positive().optional().default(10).describe("Safety limit for debug renders (default: 10)")
    },
    async (params) => {
      const commandId = historyManager.startCommand('render-frames-sampled-debug', params);

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
        const sessionDir = path.join(tempDir, `debug_${sessionId}`);

        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }

        const outputPrefix = 'debug_frame';

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
          maxFrames: params.maxFrames || 10
        });

        // Schedule cleanup of the debug session directory after 10 minutes
        fileManager.scheduleFileCleanup(sessionDir);

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
              text: `Visual debug sequence from "${params.comp}" has been queued.\n` +
                    `Time range: ${params.startTime}s - ${params.endTime}s\n` +
                    `Sampling: ${samplingDesc}\n` +
                    `Output directory: ${sessionDir}\n` +
                    `\nThese frames will help you understand the animation progression.\n` +
                    `After rendering, use the Read tool on each frame to analyze the visual changes.\n` +
                    `Note: Session directory will be auto-cleaned after 1 hour.\n` +
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
