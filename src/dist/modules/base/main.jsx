
// Global variables for UI components
var globalPanel;
var globalStatusText;
var globalLogText;
var globalAutoRunCheckbox;

// Main function to initialize the bridge
function main() {
    var ui = createUIPanel();
    globalPanel = ui.panel;
    globalStatusText = ui.statusText;
    globalLogText = ui.logText;
    globalAutoRunCheckbox = ui.autoRunCheckbox;

    var checkButton = globalPanel.add("button", undefined, "Check for Commands Now");
    checkButton.onClick = function() {
        logToPanel("Manual check triggered");
        checkForCommands();
    };

    logToPanel("MCP Bridge Auto started");
    globalStatusText.text = "Ready - Auto-run is " + (globalAutoRunCheckbox.value ? "ON" : "OFF");

    globalPanel.center();
    globalPanel.show();
}

// Start the bridge
main();
