import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import colors from 'colors';
import { resolveAfterEffectsPaths, validateAfterEffectsInstallation } from '../utils/resolvePaths.js';
import { getFileManager } from './fileManager.js';

/**
 * ScriptExecutor handles execution of ExtendScript files in After Effects
 */
export class ScriptExecutor {
  private tempDir: string;
  private scriptsDir: string;

  constructor(tempDir: string, scriptsDir: string) {
    this.tempDir = tempDir;
    this.scriptsDir = scriptsDir;
  }

  /**
   * Run an ExtendScript file in After Effects
   */
  runExtendScript(scriptPath: string, args: Record<string, any> = {}, timeout: number = 30000): string {
    try {
      console.log(colors.cyan(`[MCP SCRIPTEXECUTOR] Running script: ${scriptPath}`));
      console.log(colors.cyan(`[MCP SCRIPTEXECUTOR] Script args: ${JSON.stringify(args).substring(0, 200)}${JSON.stringify(args).length > 200 ? '...' : ''}`));

      // Ensure temp directory exists
      const fileManager = getFileManager();
      fileManager.ensureTempDirectory();

      // Create a temporary file to hold the script arguments
      const argsPath = path.join(this.tempDir, "args.json");
      fs.writeFileSync(argsPath, JSON.stringify(args));

      // Find After Effects executable location using cross-platform resolution
      const aePaths = resolveAfterEffectsPaths();
      const aePath = aePaths.executable;

      // Verify After Effects executable exists
      if (!aePath || !fs.existsSync(aePath)) {
        const validation = validateAfterEffectsInstallation();
        const errorMsg = `Error: ${validation.message}`;
        console.error(colors.red(`[MCP SCRIPTEXECUTOR] ${errorMsg}`));
        return errorMsg;
      }

      // Verify script file exists
      if (!fs.existsSync(scriptPath)) {
        const errorMsg = `Error: Script file not found at "${scriptPath}".`;
        console.error(colors.red(`[MCP SCRIPTEXECUTOR] ${errorMsg}`));
        return errorMsg;
      }

      // Try using the -m flag instead of -r for running scripts (alternative method)
      // The -m flag tells After Effects to run a script without showing a dialog
      const command = `"${aePath}" -m "${scriptPath}" "${argsPath}"`;
      console.log(colors.blue(`[MCP SCRIPTEXECUTOR] Running command with -m flag: ${command}`));

      try {
        const output = execSync(command, { encoding: 'utf8', timeout: timeout });
        console.log(colors.green(`[MCP SCRIPTEXECUTOR] Script executed successfully`));
        return output;
      } catch (execError: any) {
        console.error(colors.red(`[MCP SCRIPTEXECUTOR] Command execution error:`), execError);

        // If -m flag fails, try creating a JSX file that calls the script via BridgeTalk
        // This is a different approach that can work if direct execution fails
        console.log(colors.yellow(`[MCP SCRIPTEXECUTOR] Trying alternative approach using BridgeTalk...`));

        const bridgeScriptPath = path.join(this.tempDir, "bridge_script.jsx");
        const bridgeScriptContent = `
#include "${scriptPath.replace(/\\/g, "/")}"
alert("Script execution completed");
      `;

        fs.writeFileSync(bridgeScriptPath, bridgeScriptContent);

        const errorMsg = `Error executing After Effects command: ${String(execError?.message || execError)}.
      This might be because After Effects cannot be accessed in headless mode.
      Please try running the script "${path.basename(scriptPath)}" manually in After Effects.`;
        console.error(colors.red(`[MCP SCRIPTEXECUTOR] ${errorMsg}`));
        return errorMsg;
      }
    } catch (error) {
      const errorMsg = `Error: ${String(error)}`;
      console.error(colors.red(`[MCP SCRIPTEXECUTOR] Error running ExtendScript:`), error);
      return errorMsg;
    }
  }

  /**
   * Execute custom ExtendScript code by creating a temporary script file
   */
  executeCustomScript(script: string, description?: string): { tempScriptPath: string; wrappedScript: string } {
    console.log(colors.cyan(`[MCP SCRIPTEXECUTOR] Preparing custom script, description: ${description || 'none'}`));
    console.log(colors.cyan(`[MCP SCRIPTEXECUTOR] Script length: ${script.length} characters`));

    // Create a temporary script file
    const tempScriptName = `custom_${Date.now()}.jsx`;
    const tempScriptPath = path.join(this.tempDir, tempScriptName);

    // Wrap the script with error handling and capture return value
    const wrappedScript = `
(function() {
  try {
    return (function() {
      ${script}
    })();
  } catch (error) {
    return { error: error.toString(), line: error.line };
  }
})();
`;

    fs.writeFileSync(tempScriptPath, wrappedScript);
    console.log(colors.green(`[MCP SCRIPTEXECUTOR] Custom script written to: ${tempScriptPath}`));

    return {
      tempScriptPath,
      wrappedScript
    };
  }

  /**
   * Create a test script for animation operations
   */
  createTestAnimationScript(operation: string, compIndex: number, layerIndex: number): string {
    const timestamp = new Date().getTime();
    const tempFile = path.join(this.tempDir, `ae_test_${timestamp}.jsx`);

    let scriptContent = "";
    if (operation === "keyframe") {
      scriptContent = `
        // Direct keyframe test script
        try {
          var comp = app.project.items[${compIndex}];
          var layer = comp.layers[${layerIndex}];
          var prop = layer.property("Transform").property("Opacity");
          var time = 1; // 1 second
          var value = 25; // 25% opacity

          // Set a keyframe
          prop.setValueAtTime(time, value);

          // Write direct result
          var resultFile = new File("${path.join(this.tempDir, 'ae_test_result.txt').replace(/\\/g, '\\\\')}");
          resultFile.open("w");
          resultFile.write("SUCCESS: Added keyframe at time " + time + " with value " + value);
          resultFile.close();

          // Visual feedback
          alert("Test successful: Added opacity keyframe at " + time + "s with value " + value + "%");
        } catch (e) {
          var errorFile = new File("${path.join(this.tempDir, 'ae_test_error.txt').replace(/\\/g, '\\\\')}");
          errorFile.open("w");
          errorFile.write("ERROR: " + e.toString());
          errorFile.close();

          alert("Test failed: " + e.toString());
        }
      `;
    } else if (operation === "expression") {
      scriptContent = `
        // Direct expression test script
        try {
          var comp = app.project.items[${compIndex}];
          var layer = comp.layers[${layerIndex}];
          var prop = layer.property("Transform").property("Position");
          var expression = "wiggle(3, 30)";

          // Set the expression
          prop.expression = expression;

          // Write direct result
          var resultFile = new File("${path.join(this.tempDir, 'ae_test_result.txt').replace(/\\/g, '\\\\')}");
          resultFile.open("w");
          resultFile.write("SUCCESS: Added expression: " + expression);
          resultFile.close();

          // Visual feedback
          alert("Test successful: Added position expression: " + expression);
        } catch (e) {
          var errorFile = new File("${path.join(this.tempDir, 'ae_test_error.txt').replace(/\\/g, '\\\\')}");
          errorFile.open("w");
          errorFile.write("ERROR: " + e.toString());
          errorFile.close();

          alert("Test failed: " + e.toString());
        }
      `;
    }

    // Write the script to a temp file
    fs.writeFileSync(tempFile, scriptContent);
    console.log(colors.green(`[MCP SCRIPTEXECUTOR] Test script created: ${tempFile}`));

    return tempFile;
  }
}

// Export singleton instance
let scriptExecutorInstance: ScriptExecutor | null = null;

export function initScriptExecutor(tempDir: string, scriptsDir: string): ScriptExecutor {
  if (!scriptExecutorInstance) {
    scriptExecutorInstance = new ScriptExecutor(tempDir, scriptsDir);
  }
  return scriptExecutorInstance;
}

export function getScriptExecutor(): ScriptExecutor {
  if (!scriptExecutorInstance) {
    throw new Error('ScriptExecutor not initialized. Call initScriptExecutor first.');
  }
  return scriptExecutorInstance;
}