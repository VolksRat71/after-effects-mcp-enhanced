import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerImportAssetsTool(server: McpServer, context: ToolContext): void {
  const { fileManager, historyManager, tempDir } = context;

  server.tool(
    "import-assets",
    "Import image or video files from disk into the After Effects project",
    {
      files: z.array(z.string()).describe("Array of absolute file paths to import"),
      addToComp: z.boolean().optional().describe("Whether to add imported items to a composition"),
      compIndex: z.number().optional().describe("1-based index of the composition to add items to"),
      position: z.array(z.number()).length(2).optional().describe("Position [x, y] for the layers in the composition"),
      scale: z.array(z.number()).length(2).optional().describe("Scale [x, y] percentage for the layers")
    },
    async ({ files, addToComp, compIndex, position, scale }) => {
      const commandId = historyManager.startCommand('import-assets', { files, addToComp, compIndex, position, scale });

      try {
        // Create the import script
        const scriptContent = `(function() {
  try {
    var importedItems = [];
    var files = ${JSON.stringify(files)};
    var addToComp = ${addToComp || false};
    var compIndex = ${compIndex || 1};
    var position = ${position ? JSON.stringify(position) : '[960, 540]'};
    var scale = ${scale ? JSON.stringify(scale) : '[100, 100]'};

    // Import each file
    for (var i = 0; i < files.length; i++) {
      var file = new File(files[i]);

      if (!file.exists) {
        importedItems.push({
          path: files[i],
          success: false,
          error: "File does not exist"
        });
        continue;
      }

      try {
        var importOptions = new ImportOptions(file);
        var importedItem = app.project.importFile(importOptions);

        importedItems.push({
          path: files[i],
          success: true,
          name: importedItem.name,
          id: importedItem.id,
          type: importedItem.typeName
        });

        // Add to composition if requested
        if (addToComp && importedItem instanceof FootageItem) {
          var comp = null;
          var compCount = 0;

          // Find the target composition by index
          for (var j = 1; j <= app.project.numItems; j++) {
            if (app.project.item(j) instanceof CompItem) {
              compCount++;
              if (compCount === compIndex) {
                comp = app.project.item(j);
                break;
              }
            }
          }

          if (comp) {
            var layer = comp.layers.add(importedItem);
            layer.position.setValue(position);
            layer.scale.setValue(scale);

            importedItems[importedItems.length - 1].addedToComp = comp.name;
            importedItems[importedItems.length - 1].layerIndex = layer.index;
          }
        }
      } catch (importError) {
        importedItems.push({
          path: files[i],
          success: false,
          error: importError.toString()
        });
      }
    }

    // Count successes and failures (ExtendScript doesn't have filter)
    var successCount = 0;
    var failCount = 0;
    for (var k = 0; k < importedItems.length; k++) {
      if (importedItems[k].success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return JSON.stringify({
      success: true,
      imported: importedItems,
      totalImported: successCount,
      totalFailed: failCount
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;

        const tempScriptName = `import_assets_${Date.now()}.jsx`;
        const tempScriptPath = path.join(tempDir, tempScriptName);

        fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

        // Schedule cleanup of temp file
        fileManager.scheduleFileCleanup(tempScriptPath);

        fileManager.clearResultsFile();
        fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

        historyManager.completeCommand(commandId, 'success', { filesImported: files.length });

        return {
          content: [
            {
              type: "text",
              text: `Command to import ${files.length} file(s) has been queued.\n` +
                    `Use the "get-results" tool after a few seconds to check for results.`
            }
          ]
        };
      } catch (error) {
        const errorMsg = `Error preparing import: ${String(error)}`;
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