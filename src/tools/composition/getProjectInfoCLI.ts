import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import colors from "colors";
import { ToolRegistrar, ToolContext } from "../types.js";

/**
 * Tool for getting information about the current After Effects project via pure CLI
 */
export const registerGetProjectInfoCLITool: ToolRegistrar = (server: McpServer, context: ToolContext) => {
  server.tool(
    "get-project-info-cli",
    "Get information about the current After Effects project using pure CLI approach (no panel required)",
    {},
    async () => {
      try {
        // Create a temporary JSX script
        const tempDir = os.tmpdir();
        const scriptPath = path.join(tempDir, `ae_get_project_${Date.now()}.jsx`);
        const outputPath = path.join(tempDir, `ae_project_info_${Date.now()}.json`);

        const jsxScript = `
// Get project information
var project = app.project;
var result = {
    projectName: project.file ? project.file.name : "Untitled Project",
    path: project.file ? project.file.fsName : "",
    numItems: project.numItems,
    bitsPerChannel: project.bitsPerChannel,
    items: []
};

var countByType = {
    compositions: 0,
    footage: 0,
    folders: 0,
    solids: 0
};

for (var i = 1; i <= Math.min(project.numItems, 50); i++) {
    var item = project.item(i);
    var itemType = "";

    if (item instanceof CompItem) {
        itemType = "Composition";
        countByType.compositions++;
    } else if (item instanceof FolderItem) {
        itemType = "Folder";
        countByType.folders++;
    } else if (item instanceof FootageItem) {
        if (item.mainSource instanceof SolidSource) {
            itemType = "Solid";
            countByType.solids++;
        } else {
            itemType = "Footage";
            countByType.footage++;
        }
    }

    result.items.push({
        id: item.id,
        name: item.name,
        type: itemType
    });
}

result.itemCounts = countByType;

// Write to file
var file = new File("${outputPath}");
file.open("w");
file.write(JSON.stringify(result, null, 2));
file.close();
`;

        // Write the JSX script
        fs.writeFileSync(scriptPath, jsxScript);

        // Execute via osascript
        const cmd = `osascript -e 'tell application "Adobe After Effects 2025" to DoScript "$.evalFile(\\"${scriptPath}\\")"'`;
        execSync(cmd, { encoding: 'utf-8', timeout: 10000 });

        // Wait briefly for file to be written
        await new Promise(resolve => setTimeout(resolve, 500));

        // Read the result
        if (!fs.existsSync(outputPath)) {
          throw new Error('Output file was not created');
        }

        const projectInfo = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

        // Clean up
        fs.unlinkSync(scriptPath);
        fs.unlinkSync(outputPath);

        console.log(colors.green(`[MCP COMPOSITION CLI] Tool success: get-project-info-cli`));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                data: projectInfo
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(colors.red(`[MCP COMPOSITION CLI] Tool failed: get-project-info-cli | Error: ${String(error)}`));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );
};
