
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
            case "getLayerProperties":
                result = getLayerProperties(args);
                break;
            case "applyEffect":
                result = applyEffect(args);
                break;
            case "applyEffectTemplate":
                result = applyEffectTemplate(args);
                break;
            case "importAssets":
                result = importAssets(args);
                break;
            case "replaceFootage":
                result = replaceFootage(args);
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

        return result; // Return the result for batch processing

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

        // Return error result for batch processing
        return JSON.stringify({
            status: "error",
            command: command,
            message: error.toString(),
            line: error.line,
            fileName: error.fileName
        });
    }
}

// Execute batch of commands
function executeBatch(batchData) {
    var batchId = batchData.batchId || "batch_" + (new Date().getTime());
    var commands = batchData.commands || [];

    // Handle backward compatibility - single command
    if (batchData.command && !commands.length) {
        commands = [{
            commandId: "cmd_1",
            tool: batchData.command,
            args: batchData.args || {}
        }];
    }

    var totalCommands = commands.length;
    var results = [];
    var startTime = new Date().getTime();
    var commandTimes = [];

    logToPanel("◆ Batch detected: " + totalCommands + " command(s)");

    for (var i = 0; i < commands.length; i++) {
        var cmd = commands[i];
        var cmdStartTime = new Date().getTime();

        // Update progress
        var progress = {
            completed: i,
            total: totalCommands,
            percentage: Math.round((i / totalCommands) * 100),
            currentCommand: cmd.tool
        };

        // Calculate ETA
        if (commandTimes.length > 0) {
            var avgTime = 0;
            for (var t = 0; t < commandTimes.length; t++) {
                avgTime += commandTimes[t];
            }
            avgTime = avgTime / commandTimes.length;
            var remaining = totalCommands - i;
            var secondsRemaining = Math.ceil((remaining * avgTime) / 1000);
            progress.estimatedTimeRemaining = secondsRemaining > 60
                ? Math.ceil(secondsRemaining / 60) + "m"
                : secondsRemaining + "s";
        }

        // Write progress to result file
        writeBatchProgress(batchId, "processing", progress, results);

        logToPanel("  [" + (i + 1) + "/" + totalCommands + "] Executing: " + cmd.tool);
        globalStatusText.text = "Batch " + (i + 1) + "/" + totalCommands + ": " + cmd.tool;
        globalPanel.update();

        // Execute command
        var result = executeCommand(cmd.tool, cmd.args || {});
        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);

        try {
            var resultObj = JSON.parse(resultString);
            var isSuccess = !resultObj.error && resultObj.status !== "error";
            results.push({
                commandId: cmd.commandId,
                success: isSuccess,
                data: resultObj
            });
        } catch (e) {
            results.push({
                commandId: cmd.commandId,
                success: false,
                error: "Failed to parse result: " + e.toString()
            });
        }

        // Track command time
        var cmdEndTime = new Date().getTime();
        commandTimes.push(cmdEndTime - cmdStartTime);

        logToPanel("  ✓ Completed: " + cmd.tool);
    }

    // Write final results
    var finalProgress = {
        completed: totalCommands,
        total: totalCommands,
        percentage: 100
    };
    writeBatchProgress(batchId, "completed", finalProgress, results);

    logToPanel("✓ Batch completed: " + totalCommands + " command(s)");
    globalStatusText.text = "Ready";
    updateCommandStatus("completed");
}

// Write batch progress to result file
function writeBatchProgress(batchId, status, progress, results) {
    try {
        var batchResult = {
            batchId: batchId,
            status: status,
            progress: progress,
            results: results,
            _responseTimestamp: new Date().toString()
        };

        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8";
        if (resultFile.open("w")) {
            resultFile.write(JSON.stringify(batchResult, null, 2));
            resultFile.close();
        }
    } catch (e) {
        logToPanel("Error writing batch progress: " + e.toString());
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
                        updateCommandStatus("running");
                        executeBatch(commandData);
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

// Polling
var checkInterval = 500; // Reduced from 2000ms for better responsiveness
app.scheduleTask("checkForCommands()", checkInterval, true);
