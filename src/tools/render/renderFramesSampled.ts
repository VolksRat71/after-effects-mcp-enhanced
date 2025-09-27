import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';
import { getScriptExecutor } from '../../services/scriptExecutor.js';
import { sanitizeFilename, generateSessionId } from '../../server/utils/sanitize.js';

export function registerRenderFramesSampledTool(server: McpServer, context: ToolContext): void {
  const { historyManager } = context;

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

        const scriptExecutor = getScriptExecutor();
        const tempDir = path.join(process.cwd(), 'build', 'temp');
        const sessionId = generateSessionId();
        const sessionDir = path.join(tempDir, sessionId);

        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }

        const outputPrefix = params.outputPrefix
          ? sanitizeFilename(params.outputPrefix)
          : 'frame';

        const extendScript = buildRenderFramesSampledScript({
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

        console.log(colors.cyan(`[RENDER-FRAMES] Executing sampled render for comp: ${params.comp}`));

        const { tempScriptPath } = scriptExecutor.executeCustomScript(extendScript, 'render-frames-sampled');
        const result = scriptExecutor.runExtendScript(tempScriptPath, {}, 600000);

        try {
          fs.unlinkSync(tempScriptPath);
        } catch (err) {
        }

        let resultData;
        try {
          resultData = JSON.parse(result);
        } catch (parseError) {
          throw new Error(`Failed to parse ExtendScript result: ${result}`);
        }

        if (!resultData.success) {
          throw new Error(resultData.error || 'Render failed');
        }

        if (params.inline && resultData.frames && resultData.frames.length > 0) {
          const inlineLimit = Math.min(params.inlineMax || 3, resultData.frames.length);
          for (let i = 0; i < inlineLimit; i++) {
            const frame = resultData.frames[i];
            if (fs.existsSync(frame.outputPath)) {
              const imageBuffer = fs.readFileSync(frame.outputPath);
              const base64Data = imageBuffer.toString('base64');
              const mimeType = params.format === 'jpg' ? 'image/jpeg' : 'image/png';
              frame.inlineData = `data:${mimeType};base64,${base64Data}`;
            }
          }
        }

        let responseText = `Successfully rendered ${resultData.framesRendered} frames from composition "${params.comp}"\n`;
        responseText += `Time range: ${params.startTime}s - ${params.endTime}s\n`;
        responseText += `Session directory: ${sessionDir}\n`;

        if (resultData.warning) {
          responseText += `\nWarning: ${resultData.warning}\n`;
        }

        responseText += `\nFrames:\n`;
        resultData.frames.forEach((frame: any) => {
          responseText += `  [${frame.index}] Frame ${frame.frameNumber} @ ${frame.time}s -> ${frame.outputPath}\n`;
        });

        historyManager.completeCommand(commandId, 'success', resultData);

        return {
          content: [
            {
              type: "text",
              text: responseText
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

function buildRenderFramesSampledScript(params: {
  comp: string;
  startTime: number;
  endTime: number;
  sampleCount?: number;
  sampleFps?: number;
  frameStep?: number;
  sessionDir: string;
  outputPrefix: string;
  format: string;
  maxFrames: number;
}): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `
(function() {
  try {
    var compName = "${esc(params.comp)}";
    var startTime = ${params.startTime};
    var endTime = ${params.endTime};
    var sessionDir = "${esc(params.sessionDir)}";
    var outputPrefix = "${esc(params.outputPrefix)}";
    var format = "${params.format}";
    var maxFrames = ${params.maxFrames};

    var comp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
      if (app.project.item(i) instanceof CompItem && app.project.item(i).name === compName) {
        comp = app.project.item(i);
        break;
      }
    }

    if (!comp) {
      return JSON.stringify({
        success: false,
        error: "Composition '" + compName + "' not found"
      });
    }

    if (startTime < 0 || endTime > comp.duration) {
      return JSON.stringify({
        success: false,
        error: "Time range (" + startTime + "s - " + endTime + "s) is out of composition range (0-" + comp.duration + "s)"
      });
    }

    var times = [];
    var samplingMode = "";

    ${params.sampleCount !== undefined ? `
    samplingMode = "sampleCount";
    var sampleCount = ${params.sampleCount};
    if (sampleCount <= 1) {
      times.push(startTime);
    } else {
      for (var i = 0; i < sampleCount; i++) {
        var t = startTime + (i * (endTime - startTime) / (sampleCount - 1));
        times.push(t);
      }
    }
    ` : params.sampleFps !== undefined ? `
    samplingMode = "sampleFps";
    var sampleFps = ${params.sampleFps};
    var interval = 1 / sampleFps;
    for (var t = startTime; t <= endTime; t += interval) {
      times.push(t);
    }
    if (times[times.length - 1] < endTime) {
      times.push(endTime);
    }
    ` : params.frameStep !== undefined ? `
    samplingMode = "frameStep";
    var frameStep = ${params.frameStep};
    var startFrame = Math.floor(startTime * comp.frameRate);
    var endFrame = Math.floor(endTime * comp.frameRate);
    for (var f = startFrame; f <= endFrame; f += frameStep) {
      times.push(f / comp.frameRate);
    }
    ` : `
    samplingMode = "default";
    var sampleCount = 5;
    if (sampleCount <= 1) {
      times.push(startTime);
    } else {
      for (var i = 0; i < sampleCount; i++) {
        var t = startTime + (i * (endTime - startTime) / (sampleCount - 1));
        times.push(t);
      }
    }
    `}

    var uniqueTimes = {};
    var dedupedTimes = [];
    for (var i = 0; i < times.length; i++) {
      var key = times[i].toFixed(5);
      if (!uniqueTimes[key]) {
        uniqueTimes[key] = true;
        dedupedTimes.push(parseFloat(key));
      }
    }
    times = dedupedTimes;

    var warning = null;
    if (times.length > maxFrames) {
      warning = "Requested " + times.length + " frames, truncated to maxFrames=" + maxFrames;
      times = times.slice(0, maxFrames);
    }

    var frames = [];

    for (var i = 0; i < times.length; i++) {
      var renderTime = times[i];
      var frameNumber = Math.floor(renderTime * comp.frameRate);
      var outputFile = outputPrefix + "_" + frameNumber + "." + format;
      var outputPath = sessionDir + "/" + outputFile;

      var rqItem = app.project.renderQueue.items.add(comp);
      rqItem.timeSpanStart = renderTime;
      rqItem.timeSpanDuration = 1 / comp.frameRate;

      var outputModule = rqItem.outputModule(1);

      if (format === "jpg") {
        outputModule.file = new File(outputPath);
        try {
          outputModule.applyTemplate("JPEG Sequence");
        } catch (e) {
          outputModule.file = new File(outputPath);
        }
      } else {
        outputModule.file = new File(outputPath);
        try {
          outputModule.applyTemplate("PNG Sequence");
        } catch (e) {
          outputModule.file = new File(outputPath);
        }
      }

      frames.push({
        index: i,
        time: renderTime,
        frameNumber: frameNumber,
        outputPath: outputPath
      });
    }

    app.project.renderQueue.render();

    for (var i = 0; i < frames.length; i++) {
      var file = new File(frames[i].outputPath);
      if (!file.exists) {
        return JSON.stringify({
          success: false,
          error: "Frame " + i + " was not rendered to " + frames[i].outputPath
        });
      }
    }

    var result = {
      success: true,
      comp: compName,
      samplingMode: samplingMode,
      framesRendered: frames.length,
      sessionDir: sessionDir,
      frames: frames
    };

    if (warning) {
      result.warning = warning;
    }

    return JSON.stringify(result);

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
`;
}