// Get the MCP project directory based on the operating system
function getMCPDirectory() {
    return "{{MCP_TEMP_PATH}}";
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
