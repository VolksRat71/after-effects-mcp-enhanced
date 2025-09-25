import * as fs from "fs";
import * as path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import colors from "colors";
import { fileURLToPath } from 'url';
import { getTempFilePath } from './utils/resolvePaths.js';
import { HistoryManager } from './utils/historyManager.js';
import { initFileManager, getFileManager } from './services/fileManager.js';
import { initScriptExecutor, getScriptExecutor } from './services/scriptExecutor.js';
import { registerAllTools } from './tools/index.js';
import { ToolContext } from './tools/types.js';

// Create an MCP server
const server = new McpServer({
  name: "AfterEffectsServer",
  version: "1.0.0"
});

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const SCRIPTS_DIR = path.join(__dirname, "scripts");
const TEMP_DIR = path.join(__dirname, "temp");

// Initialize history manager
const historyManager = new HistoryManager();

// Initialize file manager
const fileManager = initFileManager(TEMP_DIR);

// Initialize script executor
const scriptExecutor = initScriptExecutor(TEMP_DIR, SCRIPTS_DIR);

// Helper function to run After Effects scripts (delegating to scriptExecutor)
function runExtendScript(scriptPath: string, args: Record<string, any> = {}): string {
  return scriptExecutor.runExtendScript(scriptPath, args);
}

// Create tool context for all tools to use
const toolContext: ToolContext = {
  fileManager,
  scriptExecutor,
  historyManager,
  tempDir: TEMP_DIR,
  scriptsDir: SCRIPTS_DIR
};

// Register all tools with the server
registerAllTools(server, toolContext);


// Add a resource to expose project compositions
server.resource(
  "compositions",
  "aftereffects://compositions",
  async (uri) => {
    const scriptPath = path.join(SCRIPTS_DIR, "listCompositions.jsx");
    console.error(`Using script path: ${scriptPath}`);
    const result = runExtendScript(scriptPath);

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: result
      }]
    };
  }
);

// Add prompts for common After Effects tasks
server.prompt(
  "list-compositions",
  "List compositions in the current After Effects project",
  () => {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Please list all compositions in the current After Effects project."
        }
      }]
    };
  }
);

server.prompt(
  "analyze-composition",
  {
    compositionName: z.string().describe("Name of the composition to analyze")
  },
  (args) => {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the composition named "${args.compositionName}" in the current After Effects project. Provide details about its duration, frame rate, resolution, and layers.`
        }
      }]
    };
  }
);

// Add a prompt for creating compositions
server.prompt(
  "create-composition",
  "Create a new composition with specified settings",
  () => {
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please create a new composition with custom settings. You can specify parameters like name, width, height, frame rate, etc.`
        }
      }]
    };
  }
);


// create-composition tool has been moved to src/tools/composition/createComposition.ts

// Layer tools have been moved to src/tools/layer/

// --- BEGIN NEW TESTING TOOL ---
// Add a special tool for directly testing the keyframe functionality
server.tool(
  "test-animation",
  "Test animation functionality in After Effects",
  {
    operation: z.enum(["keyframe", "expression"]).describe("The animation operation to test"),
    compIndex: z.number().int().positive().describe("Composition index (usually 1)"),
    layerIndex: z.number().int().positive().describe("Layer index (usually 1)")
  },
  async (params) => {
    try {
      // Use scriptExecutor to create the test animation script
      const tempFile = scriptExecutor.createTestAnimationScript(
        params.operation,
        params.compIndex,
        params.layerIndex
      );

      // Tell the user what to do
      return {
        content: [
          {
            type: "text",
            text: `I've created a direct test script for the ${params.operation} operation.

Please run this script manually in After Effects:
1. In After Effects, go to File > Scripts > Run Script File...
2. Navigate to: ${tempFile}
3. You should see an alert confirming the result.

This bypasses the MCP Bridge Auto panel and will directly modify the specified layer.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating test script: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);
// --- END NEW TESTING TOOL ---

// --- BEGIN NEW EFFECTS TOOLS ---

// Add a tool for applying effects to layers
server.tool(
  "apply-effect",
  "Apply an effect to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    effectName: z.string().optional().describe("Display name of the effect to apply (e.g., 'Gaussian Blur')."),
    effectMatchName: z.string().optional().describe("After Effects internal name for the effect (more reliable, e.g., 'ADBE Gaussian Blur 2')."),
    effectCategory: z.string().optional().describe("Optional category for filtering effects."),
    presetPath: z.string().optional().describe("Optional path to an effect preset file (.ffx)."),
    effectSettings: z.record(z.any()).optional().describe("Optional parameters for the effect (e.g., { 'Blurriness': 25 }).")
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      fileManager.writeCommandFile("applyEffect", parameters);

      return {
        content: [
          {
            type: "text",
            text: `Command to apply effect to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
                  `Use the "get-results" tool after a few seconds to check for confirmation.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing apply-effect command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add a tool for applying effect templates
server.tool(
  "apply-effect-template",
  "Apply a predefined effect template to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    templateName: z.enum([
      "gaussian-blur",
      "directional-blur",
      "color-balance",
      "brightness-contrast",
      "curves",
      "glow",
      "drop-shadow",
      "cinematic-look",
      "text-pop"
    ]).describe("Name of the effect template to apply."),
    customSettings: z.record(z.any()).optional().describe("Optional custom settings to override defaults.")
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      fileManager.writeCommandFile("applyEffectTemplate", parameters);

      return {
        content: [
          {
            type: "text",
            text: `Command to apply effect template '${parameters.templateName}' to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
                  `Use the "get-results" tool after a few seconds to check for confirmation.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing apply-effect-template command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// --- END NEW EFFECTS TOOLS ---

// Add direct MCP function for applying effects
server.tool(
  "mcp_aftereffects_applyEffect",
  "Apply an effect to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    effectName: z.string().optional().describe("Display name of the effect to apply (e.g., 'Gaussian Blur')."),
    effectMatchName: z.string().optional().describe("After Effects internal name for the effect (more reliable, e.g., 'ADBE Gaussian Blur 2')."),
    effectSettings: z.record(z.any()).optional().describe("Optional parameters for the effect (e.g., { 'Blurriness': 25 }).")
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      fileManager.writeCommandFile("applyEffect", parameters);

      // Wait a bit for After Effects to process the command
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the results
      const result = fileManager.readResultsFromTempFile();

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error applying effect: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add direct MCP function for applying effect templates
server.tool(
  "mcp_aftereffects_applyEffectTemplate",
  "Apply a predefined effect template to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    templateName: z.enum([
      "gaussian-blur",
      "directional-blur",
      "color-balance",
      "brightness-contrast",
      "curves",
      "glow",
      "drop-shadow",
      "cinematic-look",
      "text-pop"
    ]).describe("Name of the effect template to apply."),
    customSettings: z.record(z.any()).optional().describe("Optional custom settings to override defaults.")
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      fileManager.writeCommandFile("applyEffectTemplate", parameters);

      // Wait a bit for After Effects to process the command
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the results
      const result = fileManager.readResultsFromTempFile();

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error applying effect template: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Update help information to include the new effects tools
server.tool(
  "mcp_aftereffects_get_effects_help",
  "Get help on using After Effects effects",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `# After Effects Effects Help

## Common Effect Match Names
These are internal names used by After Effects that can be used with the \`effectMatchName\` parameter:

### Blur & Sharpen
- Gaussian Blur: "ADBE Gaussian Blur 2"
- Camera Lens Blur: "ADBE Camera Lens Blur"
- Directional Blur: "ADBE Motion Blur"
- Radial Blur: "ADBE Radial Blur"
- Smart Blur: "ADBE Smart Blur"
- Unsharp Mask: "ADBE Unsharp Mask"

### Color Correction
- Brightness & Contrast: "ADBE Brightness & Contrast 2"
- Color Balance: "ADBE Color Balance (HLS)"
- Color Balance (RGB): "ADBE Pro Levels2"
- Curves: "ADBE CurvesCustom"
- Exposure: "ADBE Exposure2"
- Hue/Saturation: "ADBE HUE SATURATION"
- Levels: "ADBE Pro Levels2"
- Vibrance: "ADBE Vibrance"

### Stylistic
- Glow: "ADBE Glow"
- Drop Shadow: "ADBE Drop Shadow"
- Bevel Alpha: "ADBE Bevel Alpha"
- Noise: "ADBE Noise"
- Fractal Noise: "ADBE Fractal Noise"
- CC Particle World: "CC Particle World"
- CC Light Sweep: "CC Light Sweep"

## Effect Templates
The following predefined effect templates are available:

- \`gaussian-blur\`: Simple Gaussian blur effect
- \`directional-blur\`: Motion blur in a specific direction
- \`color-balance\`: Adjust hue, lightness, and saturation
- \`brightness-contrast\`: Basic brightness and contrast adjustment
- \`curves\`: Advanced color adjustment using curves
- \`glow\`: Add a glow effect to elements
- \`drop-shadow\`: Add a customizable drop shadow
- \`cinematic-look\`: Combination of effects for a cinematic appearance
- \`text-pop\`: Effects to make text stand out (glow and shadow)

## Example Usage
To apply a Gaussian blur effect:

\`\`\`json
{
  "compIndex": 1,
  "layerIndex": 1,
  "effectMatchName": "ADBE Gaussian Blur 2",
  "effectSettings": {
    "Blurriness": 25
  }
}
\`\`\`

To apply the "cinematic-look" template:

\`\`\`json
{
  "compIndex": 1,
  "layerIndex": 1,
  "templateName": "cinematic-look"
}
\`\`\`
`
        }
      ]
    };
  }
);

// Add a direct tool for our bridge test effects
server.tool(
  "run-bridge-test",
  "Run the bridge test effects script to verify communication and apply test effects",
  {},
  async () => {
    try {
      // Clear any stale result data
      fileManager.clearResultsFile();

      // Write command to file for After Effects to pick up
      fileManager.writeCommandFile("bridgeTestEffects", {});

      return {
        content: [
          {
            type: "text",
            text: `Bridge test effects command has been queued.\n` +
                  `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                  `Use the "get-results" tool after a few seconds to check for the test results.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing bridge test command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add tool for running custom scripts
server.tool(
  "run-custom-script",
  "Run custom ExtendScript code in After Effects (use with caution)",
  {
    script: z.string().describe("ExtendScript code to execute"),
    description: z.string().optional().describe("Description of what this script does")
  },
  async ({ script, description }) => {
    // Start tracking this command
    const commandId = historyManager.startCommand('run-custom-script', {
      script: script.substring(0, 200) + (script.length > 200 ? '...' : ''), // Truncate for history
      description
    });

    try {
      // Use scriptExecutor to prepare the custom script
      const { tempScriptPath } = scriptExecutor.executeCustomScript(script, description);

      // Schedule cleanup of temp file
      fileManager.scheduleFileCleanup(tempScriptPath);

      // Clear any stale result data
      fileManager.clearResultsFile();

      // Write command to file for After Effects to pick up
      fileManager.writeCommandFile("customScript", { scriptPath: tempScriptPath });

      historyManager.completeCommand(commandId, 'success', {
        scriptPath: tempScriptPath,
        description
      });

      return {
        content: [
          {
            type: "text",
            text: `Custom script has been queued for execution.\n` +
                  (description ? `Description: ${description}\n` : '') +
                  `Script saved to: ${tempScriptPath}\n` +
                  `Use the "get-results" tool after a few seconds to check for results.`
          }
        ]
      };
    } catch (error) {
      const errorMsg = `Error preparing custom script: ${String(error)}`;
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

// Add tool to query command history
server.tool(
  "get-command-history",
  "Query the command history of After Effects operations",
  {
    filter: z.object({
      tool: z.string().optional().describe("Filter by specific tool name"),
      timeRange: z.object({
        from: z.string().describe("ISO 8601 date string for start time"),
        to: z.string().describe("ISO 8601 date string for end time")
      }).optional().describe("Filter by time range"),
      result: z.enum(['success', 'error', 'pending']).optional().describe("Filter by result status"),
      limit: z.number().optional().describe("Limit number of results returned")
    }).optional().describe("Optional filters for querying history"),
    includeStats: z.boolean().optional().describe("Include statistics summary")
  },
  async ({ filter, includeStats }) => {
    try {
      const history = historyManager.queryHistory(filter);
      const stats = includeStats ? historyManager.getStatistics() : null;

      let responseText = `Found ${history.length} command(s) in history.\n\n`;

      if (stats) {
        responseText += `📊 Statistics:\n`;
        responseText += `  Total Commands: ${stats.totalCommands}\n`;
        responseText += `  Success: ${stats.successCount}\n`;
        responseText += `  Errors: ${stats.errorCount}\n`;
        responseText += `  Pending: ${stats.pendingCount}\n`;
        responseText += `  Avg Duration: ${Math.round(stats.averageDuration)}ms\n\n`;

        if (stats.mostUsedTools.length > 0) {
          responseText += `  Most Used Tools:\n`;
          stats.mostUsedTools.slice(0, 5).forEach(tool => {
            responseText += `    - ${tool.tool}: ${tool.count} times\n`;
          });
          responseText += '\n';
        }
      }

      responseText += `Recent Commands:\n`;
      responseText += `${'='.repeat(80)}\n`;

      // Show most recent commands first
      const recentCommands = history.slice(-20).reverse();

      for (const cmd of recentCommands) {
        const timestamp = new Date(cmd.timestamp).toLocaleString();
        responseText += `\n[${timestamp}] ${cmd.tool}\n`;
        responseText += `  ID: ${cmd.id}\n`;
        responseText += `  Status: ${cmd.result}${cmd.duration ? ` (${cmd.duration}ms)` : ''}\n`;

        if (cmd.parameters && Object.keys(cmd.parameters).length > 0) {
          responseText += `  Parameters: ${JSON.stringify(cmd.parameters, null, 2).split('\n').join('\n  ')}\n`;
        }

        if (cmd.error) {
          responseText += `  Error: ${cmd.error}\n`;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying command history: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add tool to export command history as script
server.tool(
  "export-history-as-script",
  "Export command history as an ExtendScript file",
  {},
  async () => {
    try {
      const script = historyManager.exportAsScript();
      const scriptPath = path.join(TEMP_DIR, `history_export_${Date.now()}.jsx`);

      fs.writeFileSync(scriptPath, script);

      return {
        content: [
          {
            type: "text",
            text: `Command history exported as ExtendScript to:\n${scriptPath}\n\n` +
                  `Preview (first 50 lines):\n${'='.repeat(80)}\n` +
                  script.split('\n').slice(0, 50).join('\n')
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error exporting history: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add tool for copying animation from one layer to others


// Tool for importing assets from disk
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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

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

// Tool for replacing footage in existing layers
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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

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

// Tool for getting layer properties with keyframe information
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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

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


// Start the MCP server
async function main() {
  console.log(colors.yellow("[MCP SERVER] After Effects MCP Server starting..."));

  console.log(colors.blue(`[MCP INFO] Scripts directory: ${SCRIPTS_DIR}`));
  console.log(colors.blue(`[MCP INFO] Temp directory: ${TEMP_DIR}`));

  // Clean up old JSX files on startup
  fileManager.cleanupOldJSXFiles();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log(colors.green("[MCP SERVER] After Effects MCP Server running..."));
}

main().catch(error => {
  console.error(colors.red(`[MCP SERVER] Fatal error: ${error}`));
  process.exit(1);
});
