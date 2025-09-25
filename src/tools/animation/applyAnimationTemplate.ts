import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import colors from 'colors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types.js';

export function registerApplyAnimationTemplateTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "apply-animation-template",
    "Apply a predefined animation template to a layer",
    {
      template: z.enum(["fade-in", "fade-out", "slide-left", "slide-right", "slide-up", "slide-down", "bounce", "spin", "zoom-in", "zoom-out", "shake", "slide-and-fall"]).describe("Name of the animation template"),
      compIndex: z.number().describe("1-based index of the composition"),
      layerIndex: z.number().describe("1-based index of the layer"),
      duration: z.number().optional().describe("Duration of the animation in seconds (default: 1)"),
      startTime: z.number().optional().describe("Start time for the animation (default: current time indicator)")
    },
    async ({ template, compIndex, layerIndex, duration = 1, startTime }) => {
      console.log(colors.cyan(`[MCP ANIMATION] Applying animation template: ${template} to layer ${layerIndex} in comp ${compIndex}`));

      const commandId = historyManager.startCommand('apply-animation-template', { template, compIndex, layerIndex, duration, startTime });

      try {
        const scriptContent = `(function() {
  try {
    var template = ${JSON.stringify(template)};
    var compIndex = ${compIndex};
    var layerIndex = ${layerIndex};
    var duration = ${duration};
    var startTime = ${startTime !== undefined ? startTime : 'comp.time'};

    // Find composition
    var comp = null;
    var compCount = 0;
    for (var i = 1; i <= app.project.numItems; i++) {
      if (app.project.item(i) instanceof CompItem) {
        compCount++;
        if (compCount === compIndex) {
          comp = app.project.item(i);
          break;
        }
      }
    }

    if (!comp) {
      return JSON.stringify({
        success: false,
        error: "Composition not found"
      });
    }

    var layer = comp.layer(layerIndex);
    if (!layer) {
      return JSON.stringify({
        success: false,
        error: "Layer not found"
      });
    }

    if (startTime === 'comp.time') {
      startTime = comp.time;
    }

    var endTime = startTime + duration;
    var transform = layer.property("Transform");

    // Helper to safely set keyframes
    function setKeyframe(prop, time, value) {
      if (prop.numKeys > 0 || prop.isTimeVarying) {
        prop.setValueAtTime(time, value);
      } else {
        // First keyframe - set value at current time, then at target time
        prop.setValueAtTime(startTime, prop.value);
        prop.setValueAtTime(time, value);
      }
    }

    // Apply template
    switch(template) {
      case "fade-in":
        var opacity = transform.property("Opacity");
        setKeyframe(opacity, startTime, 0);
        setKeyframe(opacity, endTime, 100);
        break;

      case "fade-out":
        var opacity = transform.property("Opacity");
        setKeyframe(opacity, startTime, 100);
        setKeyframe(opacity, endTime, 0);
        break;

      case "slide-left":
        var position = transform.property("Position");
        var currentPos = position.value;
        setKeyframe(position, startTime, [comp.width + 200, currentPos[1]]);
        setKeyframe(position, endTime, currentPos);
        break;

      case "slide-right":
        var position = transform.property("Position");
        var currentPos = position.value;
        setKeyframe(position, startTime, [-200, currentPos[1]]);
        setKeyframe(position, endTime, currentPos);
        break;

      case "slide-up":
        var position = transform.property("Position");
        var currentPos = position.value;
        setKeyframe(position, startTime, [currentPos[0], comp.height + 200]);
        setKeyframe(position, endTime, currentPos);
        break;

      case "slide-down":
        var position = transform.property("Position");
        var currentPos = position.value;
        setKeyframe(position, startTime, [currentPos[0], -200]);
        setKeyframe(position, endTime, currentPos);
        break;

      case "bounce":
        var position = transform.property("Position");
        var currentPos = position.value;
        var bounceHeight = 100;
        setKeyframe(position, startTime, currentPos);
        setKeyframe(position, startTime + duration * 0.25, [currentPos[0], currentPos[1] - bounceHeight]);
        setKeyframe(position, startTime + duration * 0.5, currentPos);
        setKeyframe(position, startTime + duration * 0.65, [currentPos[0], currentPos[1] - bounceHeight * 0.5]);
        setKeyframe(position, startTime + duration * 0.8, currentPos);
        setKeyframe(position, startTime + duration * 0.9, [currentPos[0], currentPos[1] - bounceHeight * 0.25]);
        setKeyframe(position, endTime, currentPos);
        break;

      case "spin":
        var rotation = transform.property("Rotation");
        setKeyframe(rotation, startTime, 0);
        setKeyframe(rotation, endTime, 360);
        break;

      case "zoom-in":
        var scale = transform.property("Scale");
        setKeyframe(scale, startTime, [0, 0]);
        setKeyframe(scale, endTime, [100, 100]);
        break;

      case "zoom-out":
        var scale = transform.property("Scale");
        setKeyframe(scale, startTime, [100, 100]);
        setKeyframe(scale, endTime, [0, 0]);
        break;

      case "shake":
        var position = transform.property("Position");
        position.expression = "wiggle(10, 25)";
        break;

      case "slide-and-fall":
        var position = transform.property("Position");
        var rotation = transform.property("Rotation");
        var scale = transform.property("Scale");
        var currentPos = position.value;

        // Slide in from right
        setKeyframe(position, startTime, [comp.width + 200, currentPos[1] - 100]);
        setKeyframe(position, startTime + duration * 0.3, [currentPos[0], currentPos[1]]);

        // Hold
        setKeyframe(position, startTime + duration * 0.7, [currentPos[0], currentPos[1]]);

        // Fall down with rotation
        setKeyframe(position, endTime, [currentPos[0] + 50, comp.height + 200]);
        setKeyframe(rotation, startTime + duration * 0.7, 0);
        setKeyframe(rotation, endTime, -15);

        // Scale down as it falls
        setKeyframe(scale, startTime + duration * 0.7, [100, 100]);
        setKeyframe(scale, endTime, [80, 80]);
        break;

      default:
        return JSON.stringify({
          success: false,
          error: "Unknown template: " + template
        });
    }

    return JSON.stringify({
      success: true,
      message: "Animation template '" + template + "' applied successfully",
      layer: layer.name,
      startTime: startTime,
      endTime: endTime
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;

        const tempScriptName = `animation_template_${Date.now()}.jsx`;
        const tempScriptPath = path.join(tempDir, tempScriptName);

        fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

        // Schedule cleanup of temp file
        fileManager.scheduleFileCleanup(tempScriptPath);

        fileManager.clearResultsFile();
        fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

        historyManager.completeCommand(commandId, 'success');

        console.log(colors.green(`[MCP ANIMATION] Animation template command queued: ${template} (${duration}s duration)`));

        return {
          content: [
            {
              type: "text",
              text: `Command to apply "${template}" animation template has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing animation template: ${String(error)}`;
        historyManager.completeCommand(commandId, 'error', undefined, errorMsg);

        console.error(colors.red(`[MCP ANIMATION] ${errorMsg}`));

        return {
          content: [
            {
              type: "text",
              text: errorMsg
            }
          ],
          isError: true
        };
      }
    }
  );
}
