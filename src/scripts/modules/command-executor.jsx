/**
 * Command Executor Module for MCP Bridge
 * Handles command execution and routing
 */

// Execute command based on type
function executeCommand(commandData, mcpWindow) {
    try {
        if (!commandData || !commandData.command) {
            return { success: false, error: "No command specified" };
        }

        var args = commandData.args || {};
        var result;

        // Log the command being executed
        if (mcpWindow) {
            mcpWindow.log("Executing: " + commandData.command, "info");
        }

        switch (commandData.command) {
            // Project info commands
            case "getProjectInfo":
                result = getProjectInfo();
                break;
            case "listCompositions":
                result = listCompositions();
                break;

            // Composition creation
            case "createComposition":
                result = createComposition(
                    args.name,
                    args.width,
                    args.height,
                    args.pixelAspect,
                    args.duration,
                    args.frameRate
                );
                break;

            // Layer creation
            case "createTextLayer":
                result = createTextLayer(
                    args.compIndex,
                    args.text,
                    args.position,
                    args.fontSize,
                    args.fontColor,
                    args.fontName
                );
                break;
            case "createShapeLayer":
                result = createShapeLayer(
                    args.compIndex,
                    args.shapeType,
                    args.position,
                    args.size,
                    args.fillColor,
                    args.strokeColor,
                    args.strokeWidth
                );
                break;
            case "createSolidLayer":
                result = createSolidLayer(
                    args.compIndex,
                    args.name,
                    args.color,
                    args.width,
                    args.height,
                    args.position
                );
                break;

            // Layer operations
            case "setLayerProperties":
                result = setLayerProperties(
                    args.compIndex,
                    args.layerIndex,
                    args.properties
                );
                break;
            case "setLayerKeyframe":
                result = setLayerKeyframe(
                    args.compIndex,
                    args.layerIndex,
                    args.propertyName,
                    args.timeInSeconds,
                    args.value
                );
                break;
            case "setLayerExpression":
                result = setLayerExpression(
                    args.compIndex,
                    args.layerIndex,
                    args.propertyName,
                    args.expressionString
                );
                break;
            case "getLayerProperties":
                result = getLayerInfo(
                    args.compIndex,
                    args.layerIndex,
                    args.includeKeyframes
                );
                break;
            case "setMultipleKeyframes":
                result = setMultipleKeyframes(
                    args.compIndex,
                    args.layerIndex,
                    args.keyframes
                );
                break;
            case "copyAnimation":
                result = copyAnimation(
                    args.compIndex,
                    args.sourceLayerIndex,
                    args.targetLayerIndices,
                    args.properties,
                    args.timeOffset
                );
                break;

            // Effects
            case "applyEffect":
                result = applyEffect(
                    args.compIndex,
                    args.layerIndex,
                    args.effectName,
                    args.effectMatchName,
                    args.effectSettings
                );
                break;
            case "applyEffectTemplate":
                result = applyEffectTemplate(
                    args.compIndex,
                    args.layerIndex,
                    args.templateName,
                    args.customSettings
                );
                break;
            case "getLayerEffects":
                result = getLayerEffects(
                    args.compIndex,
                    args.layerIndex
                );
                break;
            case "removeEffect":
                result = removeEffect(
                    args.compIndex,
                    args.layerIndex,
                    args.effectIndex
                );
                break;
            case "setEffectProperty":
                result = setEffectProperty(
                    args.compIndex,
                    args.layerIndex,
                    args.effectIndex,
                    args.propertyName,
                    args.value
                );
                break;

            // Animation templates
            case "applyAnimationTemplate":
                result = applyAnimationTemplate(
                    args.compIndex,
                    args.layerIndex,
                    args.template,
                    args.startTime,
                    args.duration
                );
                break;

            // Media operations
            case "importAssets":
                result = importAssets(
                    args.files,
                    args.addToComp,
                    args.compIndex,
                    args.position,
                    args.scale
                );
                break;
            case "replaceFootage":
                result = replaceFootage(
                    args.compIndex,
                    args.layerIndex,
                    args.layerName,
                    args.newFootagePath
                );
                break;

            // Custom script execution
            case "runCustomScript":
                result = runCustomScript(args.script, args.description);
                break;

            default:
                result = { success: false, error: "Unknown command: " + commandData.command };
        }

        // Log result
        if (mcpWindow) {
            if (result && result.success) {
                mcpWindow.log("✓ Command completed", "success");
            } else {
                mcpWindow.log("✗ Command failed: " + (result ? result.error : "Unknown error"), "error");
            }
        }

        return result;
    } catch (error) {
        var errorMsg = "Command execution error: " + error.toString();
        if (mcpWindow) {
            mcpWindow.log(errorMsg, "error");
        }
        return { success: false, error: errorMsg };
    }
}

// Apply animation template to a layer
function applyAnimationTemplate(compIndex, layerIndex, template, startTime, duration) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var currentTime = startTime !== undefined ? startTime : comp.time;
        var animDuration = duration !== undefined ? duration : 1.0;

        switch (template) {
            case "fade-in":
                layer.property("Opacity").setValueAtTime(currentTime, 0);
                layer.property("Opacity").setValueAtTime(currentTime + animDuration, 100);
                break;

            case "fade-out":
                layer.property("Opacity").setValueAtTime(currentTime, 100);
                layer.property("Opacity").setValueAtTime(currentTime + animDuration, 0);
                break;

            case "slide-left":
                var pos = layer.property("Position").value;
                layer.property("Position").setValueAtTime(currentTime, [pos[0] + 500, pos[1]]);
                layer.property("Position").setValueAtTime(currentTime + animDuration, pos);
                break;

            case "slide-right":
                var posR = layer.property("Position").value;
                layer.property("Position").setValueAtTime(currentTime, [posR[0] - 500, posR[1]]);
                layer.property("Position").setValueAtTime(currentTime + animDuration, posR);
                break;

            case "slide-up":
                var posU = layer.property("Position").value;
                layer.property("Position").setValueAtTime(currentTime, [posU[0], posU[1] + 500]);
                layer.property("Position").setValueAtTime(currentTime + animDuration, posU);
                break;

            case "slide-down":
                var posD = layer.property("Position").value;
                layer.property("Position").setValueAtTime(currentTime, [posD[0], posD[1] - 500]);
                layer.property("Position").setValueAtTime(currentTime + animDuration, posD);
                break;

            case "bounce":
                layer.property("Position").expression =
                    "amp = .05;\n" +
                    "freq = 2.0;\n" +
                    "decay = 5.0;\n" +
                    "n = 0;\n" +
                    "if (numKeys > 0){\n" +
                    "  n = nearestKey(time).index;\n" +
                    "  if (key(n).time > time) n--;\n" +
                    "}\n" +
                    "if (n > 0){\n" +
                    "  t = time - key(n).time;\n" +
                    "  v = velocityAtTime(key(n).time - .001);\n" +
                    "  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);\n" +
                    "} else value";
                break;

            case "spin":
                layer.property("Rotation").setValueAtTime(currentTime, 0);
                layer.property("Rotation").setValueAtTime(currentTime + animDuration, 360);
                break;

            case "zoom-in":
                layer.property("Scale").setValueAtTime(currentTime, [0, 0]);
                layer.property("Scale").setValueAtTime(currentTime + animDuration, [100, 100]);
                break;

            case "zoom-out":
                layer.property("Scale").setValueAtTime(currentTime, [100, 100]);
                layer.property("Scale").setValueAtTime(currentTime + animDuration, [0, 0]);
                break;

            case "shake":
                layer.property("Position").expression =
                    "wiggle(5, 20)";
                break;

            case "slide-and-fall":
                var posSF = layer.property("Position").value;
                layer.property("Position").setValueAtTime(currentTime, [posSF[0], posSF[1] - 300]);
                layer.property("Position").setValueAtTime(currentTime + animDuration * 0.7, posSF);
                layer.property("Position").setValueAtTime(currentTime + animDuration, [posSF[0], posSF[1] + 1000]);
                layer.property("Rotation").setValueAtTime(currentTime + animDuration * 0.7, 0);
                layer.property("Rotation").setValueAtTime(currentTime + animDuration, 45);
                break;

            default:
                return { success: false, error: "Unknown template: " + template };
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                template: template,
                startTime: currentTime,
                duration: animDuration
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Run custom ExtendScript code
function runCustomScript(script, description) {
    try {
        if (!script) {
            return { success: false, error: "No script provided" };
        }

        // Create a function from the script string and execute it
        var fn = new Function(script);
        var result = fn();

        return {
            success: true,
            data: {
                description: description || "Custom script executed",
                result: result !== undefined ? result : "Script executed successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: "Script execution error: " + error.toString(),
            description: description
        };
    }
}