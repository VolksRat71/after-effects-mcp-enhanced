/**
 * Main Bridge Logic Module for MCP Bridge
 * Core initialization and command loop
 */

// Main execution
function main() {
    try {
        // Create and show the window
        var mcpWindow = createMCPWindow();

        // Log startup
        mcpWindow.log("MCP Bridge Auto started", "success");
        mcpWindow.log("Temp directory: " + getMCPDirectory(), "info");

        // Start checking for commands
        checkForCommands(mcpWindow);

    } catch (error) {
        alert("Error starting MCP Bridge: " + error.toString());
    }
}

// Check for commands periodically
function checkForCommands(mcpWindow) {
    var CHECK_INTERVAL = 500; // milliseconds
    var lastCommandTime = null;

    function pollCommands() {
        try {
            var commandData = readCommandFile();

            if (commandData && commandData.timestamp !== lastCommandTime) {
                lastCommandTime = commandData.timestamp;

                // Update status to "running"
                updateCommandStatus("running");

                // Execute the command
                var result = executeCommand(commandData, mcpWindow);

                // Write result
                writeResultFile(result);

                // Update status to "completed"
                updateCommandStatus("completed");
            }
        } catch (error) {
            mcpWindow.log("Error checking commands: " + error.toString(), "error");
            writeResultFile({
                success: false,
                error: "Command check error: " + error.toString()
            });
        }
    }

    // Use app.scheduleTask for AE-safe interval
    app.scheduleTask("pollCommands()", CHECK_INTERVAL / 1000, true);
}

// Start the bridge
main();