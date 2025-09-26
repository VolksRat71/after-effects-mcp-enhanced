// Get the MCP project directory based on the operating system
function getMCPDirectory() {
    var isWindows = $.os.indexOf("Windows") !== -1;

    if (isWindows) {
        var userFolder = Folder.userData.parent.parent;
        return userFolder.fsName + "\\after-effects-mcp\\build\\temp";
    } else {
        return "/Users/" + $.getenv("USER") + "/Desktop/projects/after-effects-mcp/build/temp";
    }
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