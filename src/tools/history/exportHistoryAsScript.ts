import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../types.js';

export function registerExportHistoryAsScriptTool(server: McpServer, context: ToolContext): void {
  const { historyManager, tempDir } = context;

  server.tool(
    "export-history-as-script",
    "Export command history as an ExtendScript file",
    {},
    async () => {
      try {
        const script = historyManager.exportAsScript();
        const scriptPath = path.join(tempDir, `history_export_${Date.now()}.jsx`);

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
}