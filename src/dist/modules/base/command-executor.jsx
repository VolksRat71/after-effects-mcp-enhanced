
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

    logToPanel("▶ Executing: " + command);
    globalStatusText.text = "Running: " + command;
    globalPanel.update();

    try {
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
                result = createComposition(args);
                break;
            case "createTextLayer":
                result = createTextLayer(args);
                break;
            case "createShapeLayer":
                result = createShapeLayer(args);
                break;
            case "createSolidLayer":
                result = createSolidLayer(args);
                break;
            case "setLayerProperties":
                result = setLayerProperties(args);
                break;
            case "set-layer-keyframe":
                result = setLayerKeyframe(args.compIndex, args.layerIndex, args.propertyName, args.timeInSeconds, args.value);
                break;
            case "set-layer-expression":
                result = setLayerExpression(args.compIndex, args.layerIndex, args.propertyName, args.expressionString);
                break;
            case "applyEffect":
                result = applyEffect(args);
                break;
            case "applyEffectTemplate":
                result = applyEffectTemplate(args);
                break;
            case "customScript":
                result = executeCustomScript(args);
                break;
            case "renderFrame":
                result = renderFrame(args);
                break;
            case "renderFramesSampled":
                result = renderFramesSampled(args);
                break;
            default:
                result = JSON.stringify({ error: "Unknown command: " + command });
        }

        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);

        try {
            var resultObj = JSON.parse(resultString);
            resultObj._responseTimestamp = new Date().toString();
            resultObj._commandExecuted = command;
            resultString = JSON.stringify(resultObj, null, 2);
        } catch (parseError) {
            // Silently continue if we can't add timestamp
        }

        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8";
        var opened = resultFile.open("w");
        if (!opened) {
            throw new Error("Failed to open result file for writing.");
        }
        var written = resultFile.write(resultString);
        if (!written) {
             logToPanel("ERROR: Failed to write to result file");
        }
        resultFile.close();

        logToPanel("✓ Completed: " + command);
        globalStatusText.text = "Ready";

        updateCommandStatus("completed");

    } catch (error) {
        logToPanel("✗ Error: " + command + " - " + error.toString());
        globalStatusText.text = "Error";

        try {
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
            }
        } catch (writeError) {
             logToPanel("Failed to write error: " + writeError.toString());
        }

        updateCommandStatus("error");
    }
}

// Check for new commands
var isChecking = false;
function checkForCommands() {
    if (!globalAutoRunCheckbox.value || isChecking) return;

    isChecking = true;

    try {
        var commandPath = getCommandFilePath();

        var commandFile = new File(commandPath);
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();

            if (content) {
                try {
                    var commandData = JSON.parse(content);

                    if (commandData.status === "pending") {
                        logToPanel("◆ Command detected: " + commandData.command);
                        updateCommandStatus("running");

                        executeCommand(commandData.command, commandData.args || {});
                    }
                } catch (parseError) {
                    logToPanel("Error parsing command: " + parseError.toString());
                }
            }
        }
    } catch (e) {
        logToPanel("Error: " + e.toString());
    }

    isChecking = false;
}
