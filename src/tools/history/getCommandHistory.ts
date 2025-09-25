import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerGetCommandHistoryTool(server: McpServer, context: ToolContext): void {
  const { historyManager } = context;

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
            stats.mostUsedTools.slice(0, 5).forEach((tool: any) => {
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
}