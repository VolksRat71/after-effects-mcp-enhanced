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
// test-animation tool moved to src/tools/utility/testAnimation.ts
// --- END NEW TESTING TOOL ---

// --- BEGIN NEW EFFECTS TOOLS ---

// --- EFFECTS TOOLS MOVED TO src/tools/effects/ ---


// Add a direct tool for our bridge test effects
// run-bridge-test tool moved to src/tools/utility/runBridgeTest.ts

// run-custom-script tool moved to src/tools/utility/runCustomScript.ts

// get-command-history tool moved to src/tools/history/getCommandHistory.ts

// export-history-as-script tool moved to src/tools/history/exportHistoryAsScript.ts

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
