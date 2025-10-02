import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolContext } from "../types.js";
import { AfterEffectsLauncher } from "../../utils/appLauncher.js";

export function registerLaunchAfterEffectsTool(
  server: McpServer,
  context: ToolContext
): void {
  const { fileManager } = context;

  server.tool(
    "launch-after-effects",
    "Launch Adobe After Effects or check if running. Automatically checks for open projects if already running.",
    {
      projectPath: z.string().optional().describe("Path to a project file (.aep or .aet) to open"),
    },
    async ({ projectPath }) => {
      try {
        // Check if After Effects is running
        const isRunning = AfterEffectsLauncher.isRunning();

        if (isRunning) {
          // Get open project info
          fileManager.clearResultsFile();
          fileManager.writeCommandFile("getProjectInfo", {});

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    alreadyRunning: true,
                    message: "After Effects is already running. Use get-results to see open project info.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Launch After Effects
        const result = AfterEffectsLauncher.launch({
          projectPath: projectPath,
        });

        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    alreadyRunning: false,
                    message: result.message,
                    pid: result.pid,
                    projectOpened: projectPath || null,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    message: result.message,
                    error: result.error,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
