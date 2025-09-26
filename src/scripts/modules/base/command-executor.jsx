// import { getCommandFilePath, getResultFilePath } from "./file-operations"
// import { logToPanel } from "./ui-panel"
// import { getProjectInfo, listCompositions, getLayerInfo } from "../composition/getProjectInfo"
// import { createComposition } from "../composition/createComposition"
// import { createTextLayer, createShapeLayer, createSolidLayer } from "../layer/createLayers"
// import { setLayerProperties } from "../layer/setLayerProperties"
// import { setLayerKeyframe, setLayerExpression } from "../layer/keyframeAndExpression"
// import { applyEffect } from "../effects/applyEffect"
// import { applyEffectTemplate } from "../effects/applyEffectTemplate"
// import { executeCustomScript } from "../utility/customScript"

// Update command file status
function updateCommandStatus(status) {
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                var commandData = JSON.parse(content);
                commandData.status = status;

                commandFile.open("w");
                commandFile.write(JSON.stringify(commandData, null, 2));
                commandFile.close();
            }
        }
    } catch (e) {
        logToPanel("Error updating command status: " + e.toString());
    }
}

// Execute command
function executeCommand(command, args) {
    var result = "";

    logToPanel("Executing command: " + command);
    globalStatusText.text = "Running: " + command;
    globalPanel.update();

    try {
        logToPanel("Attempting to execute: " + command);
        switch (command) {
            case "getProjectInfo":
                result = getProjectInfo();
                break;
            case "listCompositions":
                result = listCompositions();
                break;
            case "getLayerInfo":
                result = getLayerInfo();
                break;
            case "createComposition":
                logToPanel("Calling createComposition function...");
                result = createComposition(args);
                logToPanel("Returned from createComposition.");
                break;
            case "createTextLayer":
                logToPanel("Calling createTextLayer function...");
                result = createTextLayer(args);
                logToPanel("Returned from createTextLayer.");
                break;
            case "createShapeLayer":
                logToPanel("Calling createShapeLayer function...");
                result = createShapeLayer(args);
                logToPanel("Returned from createShapeLayer. Result type: " + typeof result);
                break;
            case "createSolidLayer":
                logToPanel("Calling createSolidLayer function...");
                result = createSolidLayer(args);
                logToPanel("Returned from createSolidLayer.");
                break;
            case "setLayerProperties":
                logToPanel("Calling setLayerProperties function...");
                result = setLayerProperties(args);
                logToPanel("Returned from setLayerProperties.");
                break;
            case "setLayerKeyframe":
                logToPanel("Calling setLayerKeyframe function...");
                result = setLayerKeyframe(args.compIndex, args.layerIndex, args.propertyName, args.timeInSeconds, args.value);
                logToPanel("Returned from setLayerKeyframe.");
                break;
            case "setLayerExpression":
                logToPanel("Calling setLayerExpression function...");
                result = setLayerExpression(args.compIndex, args.layerIndex, args.propertyName, args.expressionString);
                logToPanel("Returned from setLayerExpression.");
                break;
            case "applyEffect":
                logToPanel("Calling applyEffect function...");
                result = applyEffect(args);
                logToPanel("Returned from applyEffect.");
                break;
            case "applyEffectTemplate":
                logToPanel("Calling applyEffectTemplate function...");
                result = applyEffectTemplate(args);
                logToPanel("Returned from applyEffectTemplate.");
                break;
            case "customScript":
                logToPanel("Executing custom script from: " + (args.scriptPath || "unknown"));
                result = executeCustomScript(args);
                logToPanel("Custom script execution complete.");
                break;
            default:
                result = JSON.stringify({ error: "Unknown command: " + command });
        }
        logToPanel("Execution finished for: " + command);

        logToPanel("Preparing to write result file...");
        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);

        try {
            var resultObj = JSON.parse(resultString);
            resultObj._responseTimestamp = new Date().toISOString();
            resultObj._commandExecuted = command;
            resultString = JSON.stringify(resultObj, null, 2);
            logToPanel("Added timestamp to result JSON for tracking freshness.");
        } catch (parseError) {
            logToPanel("Could not parse result as JSON to add timestamp: " + parseError.toString());
        }

        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8";
        logToPanel("Opening result file for writing...");
        var opened = resultFile.open("w");
        if (!opened) {
            logToPanel("ERROR: Failed to open result file for writing: " + resultFile.fsName);
            throw new Error("Failed to open result file for writing.");
        }
        logToPanel("Writing to result file...");
        var written = resultFile.write(resultString);
        if (!written) {
             logToPanel("ERROR: Failed to write to result file (write returned false): " + resultFile.fsName);
        }
        logToPanel("Closing result file...");
        var closed = resultFile.close();
         if (!closed) {
             logToPanel("ERROR: Failed to close result file: " + resultFile.fsName);
        }
        logToPanel("Result file write process complete.");

        logToPanel("Command completed successfully: " + command);
        globalStatusText.text = "Command completed: " + command;

        logToPanel("Updating command status to completed...");
        updateCommandStatus("completed");
        logToPanel("Command status updated.");

    } catch (error) {
        var errorMsg = "ERROR in executeCommand for '" + command + "': " + error.toString() + (error.line ? " (line: " + error.line + ")" : "");
        logToPanel(errorMsg);
        globalStatusText.text = "Error: " + error.toString();

        try {
            logToPanel("Attempting to write ERROR to result file...");
            var errorResult = JSON.stringify({
                status: "error",
                command: command,
                message: error.toString(),
                line: error.line,
                fileName: error.fileName
            });
            var errorFile = new File(getResultFilePath());
            errorFile.encoding = "UTF-8";
            if (errorFile.open("w")) {
                errorFile.write(errorResult);
                errorFile.close();
                logToPanel("Successfully wrote ERROR to result file.");
            } else {
                 logToPanel("CRITICAL ERROR: Failed to open result file to write error!");
            }
        } catch (writeError) {
             logToPanel("CRITICAL ERROR: Failed to write error to result file: " + writeError.toString());
        }

        logToPanel("Updating command status to error...");
        updateCommandStatus("error");
        logToPanel("Command status updated to error.");
    }
}

// Check for new commands
var isChecking = false;
function checkForCommands() {
    if (!globalAutoRunCheckbox.value || isChecking) return;

    isChecking = true;

    try {
        var commandPath = getCommandFilePath();
        logToPanel("Checking for commands at: " + commandPath);

        var commandFile = new File(commandPath);
        if (commandFile.exists) {
            logToPanel("Command file found!");
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                logToPanel("Command content: " + content.substring(0, 100) + "...");
                try {
                    var commandData = JSON.parse(content);

                    if (commandData.status === "pending") {
                        logToPanel("Executing command: " + commandData.command);
                        updateCommandStatus("running");

                        executeCommand(commandData.command, commandData.args || {});
                    } else {
                        logToPanel("Command status is: " + commandData.status + " (skipping)");
                    }
                } catch (parseError) {
                    logToPanel("Error parsing command file: " + parseError.toString());
                }
            }
        }
    } catch (e) {
        logToPanel("Error checking for commands: " + e.toString());
    }

    isChecking = false;
}

// Set up timer to check for commands
function startCommandChecker() {
    var checkInterval = 2000;
    app.scheduleTask("checkForCommands()", checkInterval, true);
}