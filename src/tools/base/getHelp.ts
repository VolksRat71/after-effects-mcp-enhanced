import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import colors from "colors";
import { ToolRegistrar, ToolContext } from "../types.js";

/**
 * Tool for providing help and instructions on using the After Effects MCP integration
 */
export const registerGetHelpTool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
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

## Quick Links
- **Quick Start Guide**: Access via MCP resource \`docs://quickstart\`
- **Complete Tools Guide**: Access via MCP resource \`docs://tools/guide\`

## Setup Instructions

1. **Install the scripts in After Effects**
   - Run \`npm run bridge-install\` with administrator privileges
   - This copies the MCP Bridge panel to your After Effects installation

2. **Open After Effects**
   - Launch Adobe After Effects
   - Open a project that you want to work with

3. **Open the MCP Bridge Auto panel**
   - In After Effects, go to Window > mcp-bridge-auto.jsx
   - The panel will automatically check for commands every few seconds

4. **Enable Auto-run in the panel**
   - Make sure "Auto-run commands" is checked in the panel
   - The panel will poll for commands every 2 seconds

5. **Use MCP tools from your AI assistant**
   - All tools queue commands for the panel to execute
   - Always use \`get-results\` after running any tool to see the output

## Visual Debugging (NEW!)

**You can now SEE what you're working with:**
- \`render-frame-debug\`: Render a single frame to see the current state
- \`render-frames-sampled-debug\`: Render multiple frames to analyze animation
- Files are saved as PNG in \`build/temp/\` and auto-cleaned after 1 hour
- Read the image files to visually understand the composition

**For user exports:**
- \`render-frame-export\`: Export a single frame permanently
- \`render-frames-sampled-export\`: Export an animation sequence
- Files are saved in \`build/dist/\` and are permanent

## Core Tools Available:
- getProjectInfo: Information about the current project
- listCompositions: List all compositions in the project
- getLayerInfo: Information about layers in the active composition
- createComposition: Create a new composition
- createTextLayer: Create a new text layer
- createShapeLayer: Create a new shape layer
- createSolidLayer: Create a new solid layer
- setLayerProperties: Set properties for a layer
- set-layer-keyframe: Set a keyframe for a layer property
- set-layer-expression: Set an expression for a layer property
- applyEffect: Apply an effect to a layer
- applyEffectTemplate: Apply a predefined effect template to a layer

## Important Notes

- **TIFF to PNG Conversion**: After Effects renders to TIFF format, which is automatically converted to PNG
- **Auto-cleanup**: Debug renders in \`build/temp/\` are deleted after 1 hour
- **1-based indexing**: Compositions and layers use index 1, not 0
- **Always use get-results**: Every command needs \`get-results\` to retrieve output

## Need More Help?

Access the full documentation:
- **Quick Start**: \`docs://quickstart\` (via MCP resources)
- **Complete Guide**: \`docs://tools/guide\` (via MCP resources)

Note: The auto-running panel can be left open in After Effects to continuously listen for commands from external applications.`
          }
        ]
      };
    }
  );
};
