/**
 * File Operations Module for MCP Bridge
 * Handles reading/writing command and result files
 */

function getMCPDirectory() {
    // This will be replaced during build with the actual path
    var tempPath = "{{MCP_TEMP_PATH}}";

    // If the path wasn't replaced, the build is corrupted
    if (tempPath.indexOf("{{") === 0) {
        // Show error dialog
        alert(
            "MCP Bridge Build Error!\n\n" +
            "The MCP Bridge script appears to be corrupted or not properly built.\n\n" +
            "This usually happens when:\n" +
            "• The script was copied without running the build process\n" +
            "• The build process failed to complete\n" +
            "• You're running the source file instead of the built file\n\n" +
            "To fix this:\n" +
            "1. Navigate to the after-effects-mcp project directory\n" +
            "2. Run: npm install\n" +
            "3. Run: npm run build\n" +
            "4. Use the file from: build/scripts/mcp-bridge-auto.jsx\n\n"
        );
    }

    // Use the injected path
    var tempDir = new Folder(tempPath);
    if (!tempDir.exists) {
        tempDir.create();
    }

    return tempPath;
}

// Command file path - using cross-platform directory
function getCommandFilePath() {
    var mcpDir = getMCPDirectory();
    var separator = $.os.indexOf("Windows") !== -1 ? "\\" : "/";
    return mcpDir + separator + "ae_command.json";
}

// Result file path - using cross-platform directory
function getResultFilePath() {
    var mcpDir = getMCPDirectory();
    var separator = $.os.indexOf("Windows") !== -1 ? "\\" : "/";
    return mcpDir + separator + "ae_mcp_result.json";
}

// Read command file
function readCommandFile() {
    var commandFile = new File(getCommandFilePath());

    if (commandFile.exists) {
        commandFile.open("r");
        var content = commandFile.read();
        commandFile.close();

        if (content && content.length > 0) {
            try {
                return JSON.parse(content);
            } catch (e) {
                return null;
            }
        }
    }

    return null;
}

// Write result file
function writeResultFile(result) {
    try {
        var resultFile = new File(getResultFilePath());
        resultFile.open("w");
        resultFile.encoding = "UTF-8";
        resultFile.write(typeof result === "string" ? result : JSON.stringify(result, null, 2));
        resultFile.close();
        return true;
    } catch (error) {
        return false;
    }
}

// Update command status
function updateCommandStatus(status) {
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                var cmdData = JSON.parse(content);
                cmdData.status = status;
                cmdData.lastChecked = new Date().toISOString();

                commandFile.open("w");
                commandFile.encoding = "UTF-8";
                commandFile.write(JSON.stringify(cmdData, null, 2));
                commandFile.close();
                return true;
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return false;
}
