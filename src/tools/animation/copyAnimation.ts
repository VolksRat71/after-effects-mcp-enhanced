import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerCopyAnimationTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "copy-animation",
    "Copy all keyframes from a source layer to target layers with optional time offset",
    {
      compIndex: z.number().describe("Index of the composition (1-based)"),
      sourceLayerIndex: z.number().describe("Index of the source layer to copy from"),
      targetLayerIndices: z.array(z.number()).describe("Array of target layer indices to copy to"),
      properties: z.array(z.string()).optional().describe("Properties to copy (default: all animated properties)"),
      timeOffset: z.number().optional().describe("Time offset in seconds for each successive layer")
    },
    async ({ compIndex, sourceLayerIndex, targetLayerIndices, properties, timeOffset = 0 }) => {
      const commandId = historyManager.startCommand('copy-animation', {
        compIndex, sourceLayerIndex, targetLayerIndices, properties, timeOffset
      });

      try {
        // Create script to copy animation
        const scriptContent = `
(function() {
  try {
    // Get composition by index using our helper function
    var comp = getCompositionByIndex(${compIndex});
    if (!comp) {
      return JSON.stringify({error: "Composition not found at index ${compIndex}"});
    }

    var sourceLayer = comp.layer(${sourceLayerIndex});
    if (!sourceLayer) {
      return JSON.stringify({error: "Source layer not found at index ${sourceLayerIndex}"});
    }

    var propertiesToCopy = ${properties ? JSON.stringify(properties) : 'null'};
    var timeOffset = ${timeOffset};
    var targetIndices = ${JSON.stringify(targetLayerIndices)};

    var results = [];
    var copiedProps = [];

    // Helper function to copy all keyframes from a property
    function copyPropertyKeyframes(sourceProp, targetProp, offset) {
      if (sourceProp.numKeys > 0) {
        // Clear existing keyframes on target
        while (targetProp.numKeys > 0) {
          targetProp.removeKey(1);
        }

        // Copy all keyframes with offset
        for (var k = 1; k <= sourceProp.numKeys; k++) {
          var time = sourceProp.keyTime(k);
          var value = sourceProp.keyValue(k);

          targetProp.setValueAtTime(time + offset, value);

          // Copy interpolation if possible
          try {
            var inInterp = sourceProp.keyInInterpolationType(k);
            var outInterp = sourceProp.keyOutInterpolationType(k);
            targetProp.setInterpolationTypeAtKey(targetProp.numKeys, inInterp, outInterp);
          } catch (e) {
            // Some properties don't support interpolation settings
          }
        }
        return true;
      }
      return false;
    }

    // Copy to each target layer
    for (var i = 0; i < targetIndices.length; i++) {
      var targetLayer = comp.layer(targetIndices[i]);
      if (!targetLayer) {
        results.push({
          layerIndex: targetIndices[i],
          error: "Layer not found"
        });
        continue;
      }

      var offset = timeOffset * i;
      var copiedForLayer = [];

      // If specific properties requested, copy only those
      if (propertiesToCopy && propertiesToCopy.length > 0) {
        for (var p = 0; p < propertiesToCopy.length; p++) {
          var propName = propertiesToCopy[p];
          try {
            var sourceProp = sourceLayer.property("Transform").property(propName);
            var targetProp = targetLayer.property("Transform").property(propName);

            if (sourceProp && targetProp && copyPropertyKeyframes(sourceProp, targetProp, offset)) {
              copiedForLayer.push(propName);
            }
          } catch (e) {
            // Property might not exist or not be in Transform group
          }
        }
      } else {
        // Copy all animated transform properties
        var transformProps = ["Position", "Scale", "Rotation", "Opacity", "Anchor Point"];
        for (var t = 0; t < transformProps.length; t++) {
          try {
            var sourceProp = sourceLayer.property("Transform").property(transformProps[t]);
            var targetProp = targetLayer.property("Transform").property(transformProps[t]);

            if (sourceProp && targetProp && sourceProp.numKeys > 0) {
              if (copyPropertyKeyframes(sourceProp, targetProp, offset)) {
                copiedForLayer.push(transformProps[t]);
              }
            }
          } catch (e) {
            // Property might not exist
          }
        }
      }

      results.push({
        layerIndex: targetIndices[i],
        layerName: targetLayer.name,
        copiedProperties: copiedForLayer,
        timeOffset: offset,
        success: copiedForLayer.length > 0
      });
    }

    return JSON.stringify({
      success: true,
      sourceLayer: sourceLayer.name,
      results: results
    });

  } catch (error) {
    return JSON.stringify({
      error: error.toString(),
      line: error.line
    });
  }
})();`;

        // Save script to temp file
        const tempScriptName = `copy_animation_${Date.now()}.jsx`;
        const tempScriptPath = path.join(tempDir, tempScriptName);

        fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

        // Schedule cleanup of temp file
        fileManager.scheduleFileCleanup(tempScriptPath);

        // Clear any stale results
        fileManager.clearResultsFile();

        // Write command for After Effects
        fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

        historyManager.completeCommand(commandId, 'success');

        return {
          content: [
            {
              type: "text",
              text: `Command to copy animation queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing copy animation: ${String(error)}`;
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