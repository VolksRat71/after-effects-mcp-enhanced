/**
 * UI Window Module for MCP Bridge
 * Creates a floating window with enhanced logging
 */

function createMCPWindow() {
    // Create floating window (compatible with all AE versions)
    var win = new Window("dialog", "MCP Bridge Auto", undefined, {resizeable: true});
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 16;
    win.preferredSize.width = 500;

    // Header with status indicator
    var header = win.add("group");
    header.orientation = "row";
    header.alignment = ["fill", "top"];

    var statusIndicator = header.add("panel");
    statusIndicator.preferredSize = [20, 20];

    var statusText = header.add("statictext", undefined, "Ready");
    statusText.alignment = ["fill", "center"];
    statusText.graphics.font = ScriptUI.newFont("dialog", "BOLD", 14);

    // Command info panel
    var commandPanel = win.add("panel", undefined, "Current Command");
    commandPanel.orientation = "column";
    commandPanel.alignChildren = ["fill", "top"];
    commandPanel.margins = 10;

    var commandName = commandPanel.add("statictext", undefined, "Waiting for commands...");
    var commandTimestamp = commandPanel.add("statictext", undefined, "");
    commandTimestamp.graphics.foregroundColor = commandTimestamp.graphics.newPen(
        commandTimestamp.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1
    );

    // Enhanced log area with better formatting
    var logPanel = win.add("panel", undefined, "Activity Log");
    logPanel.orientation = "column";
    logPanel.alignChildren = ["fill", "fill"];
    logPanel.margins = 10;

    var logText = logPanel.add("edittext", undefined, "", {
        multiline: true,
        readonly: true,
        scrolling: true
    });
    logText.preferredSize.height = 300;
    logText.graphics.font = ScriptUI.newFont("dialog", "REGULAR", 11);

    // Controls panel
    var controlsPanel = win.add("panel", undefined, "Controls");
    controlsPanel.orientation = "row";
    controlsPanel.alignment = ["fill", "bottom"];
    controlsPanel.margins = 10;

    // Auto-run checkbox
    var autoRunCheckbox = controlsPanel.add("checkbox", undefined, "Auto-run commands");
    autoRunCheckbox.value = true;

    // Check interval control
    controlsPanel.add("statictext", undefined, "Check interval:");
    var intervalInput = controlsPanel.add("edittext", undefined, "2000");
    intervalInput.preferredSize.width = 60;
    controlsPanel.add("statictext", undefined, "ms");

    // Buttons
    var buttonGroup = win.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = ["fill", "bottom"];
    buttonGroup.alignChildren = ["fill", "center"];

    var clearLogBtn = buttonGroup.add("button", undefined, "Clear Log");
    var checkNowBtn = buttonGroup.add("button", undefined, "Check Now");
    var closeBtn = buttonGroup.add("button", undefined, "Close");

    // Helper functions for enhanced logging
    win.log = function(message, type) {
        var timestamp = new Date().toLocaleTimeString();
        var prefix = "";

        switch(type) {
            case "success":
                prefix = "✓ ";
                break;
            case "error":
                prefix = "✗ ";
                break;
            case "info":
                prefix = "ℹ ";
                break;
            case "command":
                prefix = "► ";
                break;
            default:
                prefix = "  ";
        }

        var logEntry = "[" + timestamp + "] " + prefix + message + "\n";
        logText.text = logEntry + logText.text; // Add to top

        // Keep log size manageable
        var lines = logText.text.split("\n");
        if (lines.length > 100) {
            logText.text = lines.slice(0, 100).join("\n");
        }
    };

    win.setStatus = function(status, message) {
        statusText.text = message || status;

        // Update status indicator color
        var g = statusIndicator.graphics;
        var color;

        switch(status) {
            case "ready":
                color = [0, 0.8, 0]; // Green
                break;
            case "running":
                color = [1, 0.7, 0]; // Orange
                break;
            case "error":
                color = [1, 0, 0]; // Red
                break;
            case "success":
                color = [0, 1, 0]; // Bright green
                break;
            default:
                color = [0.5, 0.5, 0.5]; // Gray
        }

        g.backgroundColor = g.newBrush(g.BrushType.SOLID_COLOR, color);
    };

    win.setCommand = function(cmdName, timestamp) {
        commandName.text = cmdName || "No command";
        commandTimestamp.text = timestamp ? "Started: " + timestamp : "";
    };

    // Button handlers
    clearLogBtn.onClick = function() {
        logText.text = "";
        win.log("Log cleared", "info");
    };

    closeBtn.onClick = function() {
        win.close();
    };

    // Return window object with all controls
    return {
        window: win,
        controls: {
            statusText: statusText,
            statusIndicator: statusIndicator,
            commandName: commandName,
            commandTimestamp: commandTimestamp,
            logText: logText,
            autoRunCheckbox: autoRunCheckbox,
            intervalInput: intervalInput,
            checkNowBtn: checkNowBtn
        },
        log: win.log,
        setStatus: win.setStatus,
        setCommand: win.setCommand
    };
}