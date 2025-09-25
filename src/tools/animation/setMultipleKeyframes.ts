import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerSetMultipleKeyframesTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "set-multiple-keyframes",
    "Set multiple keyframes for different properties at once on a layer",
    {
      compIndex: z.number().describe("Index of the composition (1-based)"),
      layerIndex: z.number().describe("Index of the layer (1-based)"),
      keyframes: z.array(z.object({
        property: z.string().describe("Property name (e.g., 'Position', 'Scale')"),
        time: z.number().describe("Time in seconds"),
        value: z.any().describe("Value for the keyframe")
      })).describe("Array of keyframe data")
    },
    async ({ compIndex, layerIndex, keyframes }) => {
      const commandId = historyManager.startCommand('set-multiple-keyframes', {
        compIndex, layerIndex, keyframeCount: keyframes.length
      });

      try {
        // Build script to set multiple keyframes
        const keyframeData = JSON.stringify(keyframes);
        const scriptContent = `
(function() {
  try {
    var comp = getCompositionByIndex(${compIndex});
    if (!comp) {
      return JSON.stringify({error: "Composition not found at index ${compIndex}"});
    }

    var layer = comp.layer(${layerIndex});
    if (!layer) {
      return JSON.stringify({error: "Layer not found at index ${layerIndex}"});
    }

    var keyframes = ${keyframeData};
    var results = [];

    for (var i = 0; i < keyframes.length; i++) {
      var kf = keyframes[i];
      try {
        var prop = layer.property("Transform").property(kf.property);
        if (!prop) {
          // Try other property groups
          if (layer.property("Effects") && layer.property("Effects").property(kf.property)) {
            prop = layer.property("Effects").property(kf.property);
          } else if (layer.property("Text") && layer.property("Text").property(kf.property)) {
            prop = layer.property("Text").property(kf.property);
          }
        }

        if (prop && prop.canVaryOverTime) {
          prop.setValueAtTime(kf.time, kf.value);
          results.push({
            property: kf.property,
            time: kf.time,
            success: true
          });
        } else {
          results.push({
            property: kf.property,
            time: kf.time,
            success: false,
            error: "Property not found or cannot be keyframed"
          });
        }
      } catch (e) {
        results.push({
          property: kf.property,
          time: kf.time,
          success: false,
          error: e.toString()
        });
      }
    }

    return JSON.stringify({
      success: true,
      layer: layer.name,
      results: results
    });

  } catch (error) {
    return JSON.stringify({
      error: error.toString(),
      line: error.line
    });
  }
})();`;

        // Save and execute
        const tempScriptName = `multi_keyframes_${Date.now()}.jsx`;
        const tempScriptPath = path.join(tempDir, tempScriptName);

        fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

        // Schedule cleanup of temp file
        fileManager.scheduleFileCleanup(tempScriptPath);

        fileManager.clearResultsFile();
        fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to set ${keyframes.length} keyframes queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing multiple keyframes: ${String(error)}`;
        historyManager.completeCommand(commandId, 'error', undefined, errorMsg);

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