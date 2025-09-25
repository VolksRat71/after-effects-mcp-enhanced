import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerTestAnimationTool(server: McpServer, context: ToolContext): void {
  const { scriptExecutor } = context;

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
}