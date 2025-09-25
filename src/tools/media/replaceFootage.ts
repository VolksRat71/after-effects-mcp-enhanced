import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerReplaceFootageTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "replace-footage",
    "Replace the source footage of an existing layer with a new file",
    {
      compIndex: z.number().describe("1-based index of the composition"),
      layerIndex: z.number().optional().describe("1-based index of the layer to replace footage for"),
      layerName: z.string().optional().describe("Name of the layer to replace footage for"),
      newFootagePath: z.string().describe("Absolute path to the new footage file")
    },
    async ({ compIndex, layerIndex, layerName, newFootagePath }) => {
      const commandId = historyManager.startCommand('replace-footage', { compIndex, layerIndex, layerName, newFootagePath });

      try {
        const scriptContent = `(function() {
  try {
    var compIndex = ${compIndex};
    var layerIndex = ${layerIndex || 'null'};
    var layerName = ${layerName ? JSON.stringify(layerName) : 'null'};
    var newFootagePath = ${JSON.stringify(newFootagePath)};

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

    // Find the layer
    var layer = null;
    if (layerIndex) {
      layer = comp.layer(layerIndex);
    } else if (layerName) {
      for (var j = 1; j <= comp.numLayers; j++) {
        if (comp.layer(j).name === layerName) {
          layer = comp.layer(j);
          break;
        }
      }
    }

    if (!layer) {
      return JSON.stringify({
        success: false,
        error: "Layer not found"
      });
    }

    if (!(layer instanceof AVLayer) || !layer.source) {
      return JSON.stringify({
        success: false,
        error: "Layer does not have replaceable source footage"
      });
    }

    // Import the new footage
    var file = new File(newFootagePath);
    if (!file.exists) {
      return JSON.stringify({
        success: false,
        error: "New footage file does not exist: " + newFootagePath
      });
    }

    var importOptions = new ImportOptions(file);
    var newFootage = app.project.importFile(importOptions);

    // Store old source info
    var oldSource = layer.source;
    var oldSourceName = oldSource.name;

    // Replace the source
    layer.replaceSource(newFootage, false);

    return JSON.stringify({
      success: true,
      message: "Footage replaced successfully",
      layer: layer.name,
      oldSource: oldSourceName,
      newSource: newFootage.name
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;

        const tempScriptName = `replace_footage_${Date.now()}.jsx`;
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
              text: `Command to replace footage has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing replace footage: ${String(error)}`;
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