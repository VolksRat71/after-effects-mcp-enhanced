import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { fileURLToPath } from 'url';
import { resolveAfterEffectsPaths, getTempFilePath, validateAfterEffectsInstallation } from './utils/resolvePaths.js';
import { HistoryManager } from './utils/historyManager.js';

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

// Helper function to run After Effects scripts
function runExtendScript(scriptPath: string, args: Record<string, any> = {}): string {
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Create a temporary file to hold the script arguments
    const argsPath = path.join(TEMP_DIR, "args.json");
    fs.writeFileSync(argsPath, JSON.stringify(args));

    // Find After Effects executable location using cross-platform resolution
    const aePaths = resolveAfterEffectsPaths();
    const aePath = aePaths.executable;

    // Verify After Effects executable exists
    if (!aePath || !fs.existsSync(aePath)) {
      const validation = validateAfterEffectsInstallation();
      return `Error: ${validation.message}`;
    }

    // Verify script file exists
    if (!fs.existsSync(scriptPath)) {
      return `Error: Script file not found at "${scriptPath}".`;
    }

    // Try using the -m flag instead of -r for running scripts (alternative method)
    // The -m flag tells After Effects to run a script without showing a dialog
    const command = `"${aePath}" -m "${scriptPath}" "${argsPath}"`;
    console.error(`Running command with -m flag: ${command}`);
    
    try {
      const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
      return output;
    } catch (execError: any) {
      console.error("Command execution error:", execError);
      
      // If -m flag fails, try creating a JSX file that calls the script via BridgeTalk
      // This is a different approach that can work if direct execution fails
      console.error("Trying alternative approach using BridgeTalk...");
      
      const bridgeScriptPath = path.join(TEMP_DIR, "bridge_script.jsx");
      const bridgeScriptContent = `
#include "${scriptPath.replace(/\\/g, "/")}"
alert("Script execution completed");
      `;
      
      fs.writeFileSync(bridgeScriptPath, bridgeScriptContent);
      
      return `Error executing After Effects command: ${String(execError?.message || execError)}. 
      This might be because After Effects cannot be accessed in headless mode.
      Please try running the script "${path.basename(scriptPath)}" manually in After Effects.`;
    }
  } catch (error) {
    console.error("Error running ExtendScript:", error);
    return `Error: ${String(error)}`;
  }
}

// Helper function to read results from After Effects temp file
function readResultsFromTempFile(): string {
  try {
    const tempFilePath = getTempFilePath('ae_mcp_result.json');
    
    // Add debugging info
    console.error(`Checking for results at: ${tempFilePath}`);
    
    if (fs.existsSync(tempFilePath)) {
      // Get file stats to check modification time
      const stats = fs.statSync(tempFilePath);
      console.error(`Result file exists, last modified: ${stats.mtime.toISOString()}`);
      
      const content = fs.readFileSync(tempFilePath, 'utf8');
      console.error(`Result file content length: ${content.length} bytes`);
      
      // If the result file is older than 30 seconds, warn the user
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      if (stats.mtime < thirtySecondsAgo) {
        console.error(`WARNING: Result file is older than 30 seconds. After Effects may not be updating results.`);
        return JSON.stringify({ 
          warning: "Result file appears to be stale (not recently updated).",
          message: "This could indicate After Effects is not properly writing results or the MCP Bridge Auto panel isn't running.",
          lastModified: stats.mtime.toISOString(),
          originalContent: content
        });
      }
      
      return content;
    } else {
      console.error(`Result file not found at: ${tempFilePath}`);
      return JSON.stringify({ error: "No results file found. Please run a script in After Effects first." });
    }
  } catch (error) {
    console.error("Error reading results file:", error);
    return JSON.stringify({ error: `Failed to read results: ${String(error)}` });
  }
}

// Helper function to write command to file
function writeCommandFile(command: string, args: Record<string, any> = {}): void {
  try {
    const commandFile = getTempFilePath('ae_command.json');
    const commandData = {
      command,
      args,
      timestamp: new Date().toISOString(),
      status: "pending"  // pending, running, completed, error
    };
    fs.writeFileSync(commandFile, JSON.stringify(commandData, null, 2));
    console.error(`Command "${command}" written to ${commandFile}`);
  } catch (error) {
    console.error("Error writing command file:", error);
  }
}

// Helper function to clear the results file to avoid stale cache
function clearResultsFile(): void {
  try {
    const resultFile = getTempFilePath('ae_mcp_result.json');
    
    // Write a placeholder message to indicate the file is being reset
    const resetData = {
      status: "waiting",
      message: "Waiting for new result from After Effects...",
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(resultFile, JSON.stringify(resetData, null, 2));
    console.error(`Results file cleared at ${resultFile}`);
  } catch (error) {
    console.error("Error clearing results file:", error);
  }
}

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

// Add a tool for running read-only scripts
server.tool(
  "run-script",
  "Run a read-only script in After Effects",
  {
    script: z.string().describe("Name of the predefined script to run"),
    parameters: z.record(z.any()).optional().describe("Optional parameters for the script")
  },
  async ({ script, parameters = {} }) => {
    // Start tracking this command
    const commandId = historyManager.startCommand('run-script', { script, parameters });

    // Validate that script is safe (only allow predefined scripts)
    const allowedScripts = [
      "listCompositions",
      "getProjectInfo",
      "getLayerInfo",
      "createComposition",
      "createTextLayer",
      "createShapeLayer",
      "createSolidLayer",
      "setLayerProperties",
      "setLayerKeyframe",
      "setLayerExpression",
      "applyEffect",
      "applyEffectTemplate",
      "test-animation",
      "bridgeTestEffects"
    ];

    if (!allowedScripts.includes(script)) {
      const errorMsg = `Error: Script "${script}" is not allowed. Allowed scripts are: ${allowedScripts.join(", ")}`;
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

    try {
      // Clear any stale result data
      clearResultsFile();

      // Write command to file for After Effects to pick up
      writeCommandFile(script, parameters);

      // Mark as successful (actual execution happens in After Effects)
      historyManager.completeCommand(commandId, 'success', { queued: true });

      return {
        content: [
          {
            type: "text",
            text: `Command to run "${script}" has been queued.\n` +
                  `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                  `Use the "get-results" tool after a few seconds to check for results.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add a tool to get the results from the last script execution
server.tool(
  "get-results",
  "Get results from the last script executed in After Effects",
  {},
  async () => {
    try {
      const result = readResultsFromTempFile();
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
            text: `Error getting results: ${String(error)}`
          }
        ],
        isError: true
      };
    }
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

// Add a tool to provide help and instructions
server.tool(
  "get-help",
  "Get help on using the After Effects MCP integration",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `# After Effects MCP Integration Help

To use this integration with After Effects, follow these steps:

1. **Install the scripts in After Effects**
   - Run \`node install-script.js\` with administrator privileges
   - This copies the necessary scripts to your After Effects installation

2. **Open After Effects**
   - Launch Adobe After Effects 
   - Open a project that you want to work with

3. **Open the MCP Bridge Auto panel**
   - In After Effects, go to Window > mcp-bridge-auto.jsx
   - The panel will automatically check for commands every few seconds

4. **Run scripts through MCP**
   - Use the \`run-script\` tool to queue a command
   - The Auto panel will detect and run the command automatically
   - Results will be saved to a temp file

5. **Get results through MCP**
   - After a command is executed, use the \`get-results\` tool
   - This will retrieve the results from After Effects

Available scripts:
- getProjectInfo: Information about the current project
- listCompositions: List all compositions in the project
- getLayerInfo: Information about layers in the active composition
- createComposition: Create a new composition
- createTextLayer: Create a new text layer
- createShapeLayer: Create a new shape layer
- createSolidLayer: Create a new solid layer
- setLayerProperties: Set properties for a layer
- setLayerKeyframe: Set a keyframe for a layer property
- setLayerExpression: Set an expression for a layer property
- applyEffect: Apply an effect to a layer
- applyEffectTemplate: Apply a predefined effect template to a layer

Effect Templates:
- gaussian-blur: Simple Gaussian blur effect
- directional-blur: Motion blur in a specific direction
- color-balance: Adjust hue, lightness, and saturation
- brightness-contrast: Basic brightness and contrast adjustment
- curves: Advanced color adjustment using curves
- glow: Add a glow effect to elements
- drop-shadow: Add a customizable drop shadow
- cinematic-look: Combination of effects for a cinematic appearance
- text-pop: Effects to make text stand out (glow and shadow)

Note: The auto-running panel can be left open in After Effects to continuously listen for commands from external applications.`
        }
      ]
    };
  }
);

// Add a tool specifically for creating compositions
server.tool(
  "create-composition",
  "Create a new composition in After Effects with specified parameters",
  {
    name: z.string().describe("Name of the composition"),
    width: z.number().int().positive().describe("Width of the composition in pixels"),
    height: z.number().int().positive().describe("Height of the composition in pixels"),
    pixelAspect: z.number().positive().optional().describe("Pixel aspect ratio (default: 1.0)"),
    duration: z.number().positive().optional().describe("Duration in seconds (default: 10.0)"),
    frameRate: z.number().positive().optional().describe("Frame rate in frames per second (default: 30.0)"),
    backgroundColor: z.object({
      r: z.number().int().min(0).max(255),
      g: z.number().int().min(0).max(255),
      b: z.number().int().min(0).max(255)
    }).optional().describe("Background color of the composition (RGB values 0-255)")
  },
  async (params) => {
    try {
      // Write command to file for After Effects to pick up
      writeCommandFile("createComposition", params);
      
      return {
        content: [
          {
            type: "text",
            text: `Command to create composition "${params.name}" has been queued.\n` +
                  `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
                  `Use the "get-results" tool after a few seconds to check for results.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing composition creation: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// --- BEGIN NEW TOOLS --- 

// Zod schema for common layer identification
const LayerIdentifierSchema = {
  compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
  layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition.")
};

// Zod schema for keyframe value (more specific types might be needed depending on property)
// Using z.any() for flexibility, but can be refined (e.g., z.array(z.number()) for position/scale)
const KeyframeValueSchema = z.any().describe("The value for the keyframe (e.g., [x,y] for Position, [w,h] for Scale, angle for Rotation, percentage for Opacity)");

// Tool for setting a layer keyframe
server.tool(
  "setLayerKeyframe", // Corresponds to the function name in ExtendScript
  "Set a keyframe for a specific layer property at a given time.",
  {
    ...LayerIdentifierSchema, // Reuse common identifiers
    propertyName: z.string().describe("Name of the property to keyframe (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    timeInSeconds: z.number().describe("The time (in seconds) for the keyframe."),
    value: KeyframeValueSchema
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      writeCommandFile("setLayerKeyframe", parameters);
      
      return {
        content: [
          {
            type: "text",
            text: `Command to set keyframe for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
                  `Use the "get-results" tool after a few seconds to check for confirmation.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing setLayerKeyframe command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool for setting a layer expression
server.tool(
  "setLayerExpression", // Corresponds to the function name in ExtendScript
  "Set or remove an expression for a specific layer property.",
  {
    ...LayerIdentifierSchema, // Reuse common identifiers
    propertyName: z.string().describe("Name of the property to apply the expression to (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    expressionString: z.string().describe("The JavaScript expression string. Provide an empty string (\"\") to remove the expression.")
  },
  async (parameters) => {
    try {
      // Queue the command for After Effects
      writeCommandFile("setLayerExpression", parameters);
      
      return {
        content: [
          {
            type: "text",
            text: `Command to set expression for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
                  `Use the "get-results" tool after a few seconds to check for confirmation.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error queuing setLayerExpression command: ${String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// --- END NEW TOOLS --- 

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
      // Generate a unique timestamp
      const timestamp = new Date().getTime();
      const tempFile = getTempFilePath(`ae_test_${timestamp}.jsx`);
      
      // Create a direct test script that doesn't rely on command files
      let scriptContent = "";
      if (params.operation === "keyframe") {
        scriptContent = `
          // Direct keyframe test script
          try {
            var comp = app.project.items[${params.compIndex}];
            var layer = comp.layers[${params.layerIndex}];
            var prop = layer.property("Transform").property("Opacity");
            var time = 1; // 1 second
            var value = 25; // 25% opacity
            
            // Set a keyframe
            prop.setValueAtTime(time, value);
            
            // Write direct result
            var resultFile = new File("${getTempFilePath('ae_test_result.txt').replace(/\\/g, '\\\\')}");
            resultFile.open("w");
            resultFile.write("SUCCESS: Added keyframe at time " + time + " with value " + value);
            resultFile.close();
            
            // Visual feedback
            alert("Test successful: Added opacity keyframe at " + time + "s with value " + value + "%");
          } catch (e) {
            var errorFile = new File("${getTempFilePath('ae_test_error.txt').replace(/\\/g, '\\\\')}");
            errorFile.open("w");
            errorFile.write("ERROR: " + e.toString());
            errorFile.close();
            
            alert("Test failed: " + e.toString());
          }
        `;
      } else if (params.operation === "expression") {
        scriptContent = `
          // Direct expression test script
          try {
            var comp = app.project.items[${params.compIndex}];
            var layer = comp.layers[${params.layerIndex}];
            var prop = layer.property("Transform").property("Position");
            var expression = "wiggle(3, 30)";
            
            // Set the expression
            prop.expression = expression;
            
            // Write direct result
            var resultFile = new File("${getTempFilePath('ae_test_result.txt').replace(/\\/g, '\\\\')}");
            resultFile.open("w");
            resultFile.write("SUCCESS: Added expression: " + expression);
            resultFile.close();
            
            // Visual feedback
            alert("Test successful: Added position expression: " + expression);
          } catch (e) {
            var errorFile = new File("${getTempFilePath('ae_test_error.txt').replace(/\\/g, '\\\\')}");
            errorFile.open("w");
            errorFile.write("ERROR: " + e.toString());
            errorFile.close();
            
            alert("Test failed: " + e.toString());
          }
        `;
      }
      
      // Write the script to a temp file
      fs.writeFileSync(tempFile, scriptContent);
      console.error(`Written test script to: ${tempFile}`);
      
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
      writeCommandFile("applyEffect", parameters);
      
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
      writeCommandFile("applyEffectTemplate", parameters);
      
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
      writeCommandFile("applyEffect", parameters);
      
      // Wait a bit for After Effects to process the command
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the results
      const result = readResultsFromTempFile();
      
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
      writeCommandFile("applyEffectTemplate", parameters);
      
      // Wait a bit for After Effects to process the command
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the results
      const result = readResultsFromTempFile();
      
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
      clearResultsFile();
      
      // Write command to file for After Effects to pick up
      writeCommandFile("bridgeTestEffects", {});
      
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
      // Create a temporary script file
      const tempScriptName = `custom_${Date.now()}.jsx`;
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

      // Wrap the script with error handling
      const wrappedScript = `
(function() {
  try {
    ${script}
  } catch (error) {
    return { error: error.toString(), line: error.line };
  }
})();
`;

      fs.writeFileSync(tempScriptPath, wrappedScript);

      // Clear any stale result data
      clearResultsFile();

      // Write command to file for After Effects to pick up
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

      fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

      // Clear any stale results
      clearResultsFile();

      // Write command for After Effects
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

      historyManager.completeCommand(commandId, 'success', { scriptPath: tempScriptPath });

      return {
        content: [
          {
            type: "text",
            text: `Command to copy animation queued.\n` +
                  `Source layer: ${sourceLayerIndex}\n` +
                  `Target layers: ${targetLayerIndices.join(', ')}\n` +
                  `Time offset: ${timeOffset}s\n` +
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

// Add tool for setting multiple keyframes at once
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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

      fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');
      clearResultsFile();
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

      historyManager.completeCommand(commandId, 'success', { keyframesSet: keyframes.length });

      return {
        content: [
          {
            type: "text",
            text: `Command to set ${keyframes.length} keyframes queued.\n` +
                  `Layer: ${layerIndex} in composition ${compIndex}\n` +
                  `Use the "get-results" tool to check for results.`
          }
        ]
      };
    } catch (error) {
      const errorMsg = `Error setting multiple keyframes: ${String(error)}`;
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
      clearResultsFile();
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

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
      clearResultsFile();
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

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
      clearResultsFile();
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

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

// Tool for applying animation templates
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
      const tempScriptPath = path.join(TEMP_DIR, tempScriptName);

      fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');
      clearResultsFile();
      writeCommandFile("customScript", { scriptPath: tempScriptPath });

      historyManager.completeCommand(commandId, 'success', { template });

      return {
        content: [
          {
            type: "text",
            text: `Command to apply "${template}" animation template has been queued.\n` +
                  `Layer: ${layerIndex} in composition ${compIndex}\n` +
                  `Duration: ${duration} seconds\n` +
                  `Use the "get-results" tool after a few seconds to check for results.`
          }
        ]
      };
    } catch (error) {
      const errorMsg = `Error preparing animation template: ${String(error)}`;
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
  console.error("After Effects MCP Server starting...");
  console.error(`Scripts directory: ${SCRIPTS_DIR}`);
  console.error(`Temp directory: ${TEMP_DIR}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("After Effects MCP Server running...");
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});