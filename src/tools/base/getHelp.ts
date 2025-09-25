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
      console.log(colors.cyan(`[MCP BASE] Tool invoked: get-help`));

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
};
