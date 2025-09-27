import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';
import colors from 'colors';
import * as fs from 'fs';
import * as path from 'path';
import { getScriptExecutor } from '../../services/scriptExecutor.js';
import { sanitizeFilename, generateUniqueFilename } from '../../server/utils/sanitize.js';

export function registerRenderFrameTool(server: McpServer, context: ToolContext): void {
  const { historyManager } = context;

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
        const scriptExecutor = getScriptExecutor();
        const tempDir = path.join(process.cwd(), 'build', 'temp');

        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const outputFile = params.outputFile
          ? sanitizeFilename(params.outputFile)
          : generateUniqueFilename('frame', params.format || 'png');

        const outputPath = path.join(tempDir, outputFile);

        const extendScript = buildRenderFrameScript({
          comp: params.comp,
          time: params.time,
          frame: params.frame,
          outputPath: outputPath.replace(/\\/g, '/'),
          format: params.format || 'png'
        });

        console.log(colors.cyan(`[RENDER-FRAME] Executing render script for comp: ${params.comp}`));

        const { tempScriptPath } = scriptExecutor.executeCustomScript(extendScript, 'render-frame');
        const result = scriptExecutor.runExtendScript(tempScriptPath, {}, 300000);

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

        let responseText = `Successfully rendered frame from composition "${params.comp}"\n`;
        responseText += `Frame: ${resultData.frame}\n`;
        responseText += `Time: ${resultData.time}s\n`;
        responseText += `Resolution: ${resultData.width}x${resultData.height}\n`;
        responseText += `Output: ${resultData.outputPath}`;

        const responseContent: any = {
          type: "text",
          text: responseText
        };

        if (params.inline && fs.existsSync(outputPath)) {
          const imageBuffer = fs.readFileSync(outputPath);
          const base64Data = imageBuffer.toString('base64');
          const mimeType = params.format === 'jpg' ? 'image/jpeg' : 'image/png';
          resultData.inlineData = `data:${mimeType};base64,${base64Data}`;

          responseContent.text += `\n\nInline image data included in response.`;
        }

        historyManager.completeCommand(commandId, 'success', resultData);

        return {
          content: [responseContent]
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

function buildRenderFrameScript(params: {
  comp: string;
  time?: number;
  frame?: number;
  outputPath: string;
  format: string;
}): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `
(function() {
  try {
    var compName = "${esc(params.comp)}";
    var outputPath = "${esc(params.outputPath)}";
    var format = "${params.format}";

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

    var renderTime = ${params.time !== undefined ? params.time :
                      params.frame !== undefined ? `(${params.frame} / comp.frameRate)` :
                      'comp.time'};

    if (renderTime < 0 || renderTime > comp.duration) {
      return JSON.stringify({
        success: false,
        error: "Time " + renderTime + "s is out of composition range (0-" + comp.duration + "s)"
      });
    }

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

    app.project.renderQueue.render();

    var frameNumber = Math.floor(renderTime * comp.frameRate);

    return JSON.stringify({
      success: true,
      comp: compName,
      frame: frameNumber,
      time: renderTime,
      width: comp.width,
      height: comp.height,
      outputPath: outputPath
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();
`;
}