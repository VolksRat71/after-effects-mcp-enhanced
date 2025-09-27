// Log message to panel
function logToPanel(message) {
    if (typeof globalLogText !== 'undefined' && globalLogText) {
        var timestamp = new Date().toLocaleTimeString();
        globalLogText.text = timestamp + ": " + message + "\n" + globalLogText.text;
    }
}

// Create the UI panel
function createUIPanel() {
    var aeVersion = parseFloat(app.version);
    var isAE2025OrLater = aeVersion >= 24.0;

    // Add version to panel title so you can verify correct version is loaded
    var panelTitle = "MCP Bridge Auto";
    var panel = new Window("palette", panelTitle, undefined);
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 10;
    panel.margins = 16;

    var statusText = panel.add("statictext", undefined, "Waiting for commands...");
    statusText.alignment = ["fill", "top"];

    var logPanel = panel.add("panel", undefined, "Command Log");
    logPanel.orientation = "column";
    logPanel.alignChildren = ["fill", "fill"];
    var logText = logPanel.add("edittext", undefined, "", {multiline: true, readonly: true});
    logText.preferredSize.height = 200;

    // Store globally so logToPanel can access it
    globalLogText = logText;
    globalStatusText = statusText;

    if (isAE2025OrLater) {
        var warning = panel.add("statictext", undefined, "AE 2025+: Dockable panels are not supported. Floating window only.");
        warning.graphics.foregroundColor = warning.graphics.newPen(warning.graphics.PenType.SOLID_COLOR, [1,0.3,0,1], 1);
    }

    var autoRunCheckbox = panel.add("checkbox", undefined, "Auto-run commands");
    autoRunCheckbox.value = true;

    return {
        panel: panel,
        statusText: statusText,
        logText: logText,
        autoRunCheckbox: autoRunCheckbox
    };
}
