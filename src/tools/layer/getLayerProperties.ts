import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerGetLayerPropertiesTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "get-layer-properties",
    "Get detailed information about a layer's properties including keyframe data",
    {
      compIndex: z.number().describe("1-based index of the composition"),
      layerIndex: z.number().describe("1-based index of the layer"),
      includeKeyframes: z.boolean().optional().describe("Include keyframe times and values")
    },
    async ({ compIndex, layerIndex, includeKeyframes = true }) => {
      const commandId = historyManager.startCommand('get-layer-properties', { compIndex, layerIndex, includeKeyframes });

      try {
        const scriptContent = `(function() {
  try {
    var compIndex = ${compIndex};
    var layerIndex = ${layerIndex};
    var includeKeyframes = ${includeKeyframes};

    // Find the composition
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
        error: "Composition not found at index " + compIndex
      });
    }

    var layer = comp.layer(layerIndex);
    if (!layer) {
      return JSON.stringify({
        success: false,
        error: "Layer not found at index " + layerIndex
      });
    }

    // Get transform properties
    var transform = layer.property("Transform");
    var properties = {};

    // Helper function to get property info
    function getPropertyInfo(prop, propName) {
      var info = {
        value: prop.value,
        canSetExpression: prop.canSetExpression,
        expression: prop.expression || "",
        expressionEnabled: prop.expressionEnabled,
        numKeys: prop.numKeys
      };

      if (includeKeyframes && prop.numKeys > 0) {
        info.keyframes = [];
        for (var k = 1; k <= prop.numKeys; k++) {
          info.keyframes.push({
            time: prop.keyTime(k),
            value: prop.keyValue(k)
          });
        }
      }

      return info;
    }

    // Get all transform properties
    properties.position = getPropertyInfo(transform.property("Position"), "Position");
    properties.scale = getPropertyInfo(transform.property("Scale"), "Scale");
    properties.rotation = getPropertyInfo(transform.property("Rotation"), "Rotation");
    properties.opacity = getPropertyInfo(transform.property("Opacity"), "Opacity");
    properties.anchorPoint = getPropertyInfo(transform.property("Anchor Point"), "Anchor Point");

    // Get layer info
    var layerInfo = {
      name: layer.name,
      index: layer.index,
      inPoint: layer.inPoint,
      outPoint: layer.outPoint,
      startTime: layer.startTime,
      duration: layer.duration,
      enabled: layer.enabled,
      solo: layer.solo,
      shy: layer.shy,
      locked: layer.locked,
      hasVideo: layer.hasVideo,
      active: layer.active,
      nullLayer: layer.nullLayer,
      parent: layer.parent ? layer.parent.name : null
    };

    // Check for effects
    var effects = [];
    if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
      var effectsGroup = layer.property("Effects");
      for (var e = 1; e <= effectsGroup.numProperties; e++) {
        var effect = effectsGroup.property(e);
        effects.push({
          name: effect.name,
          enabled: effect.enabled,
          index: e
        });
      }
    }

    return JSON.stringify({
      success: true,
      layer: layerInfo,
      properties: properties,
      effects: effects
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;

        const tempScriptName = `get_layer_props_${Date.now()}.jsx`;
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
              text: `Command to get layer properties has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing get layer properties: ${String(error)}`;
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