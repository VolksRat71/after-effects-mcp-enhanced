/**
 * Layer Operations Module for MCP Bridge
 * Handles layer property manipulation, keyframes, and expressions
 */

// Set layer properties
function setLayerProperties(compIndex, layerIndex, properties) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index: " + compIndex };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index: " + layerIndex };
        }

        var results = [];

        // Position
        if (properties.position !== undefined) {
            layer.property("Position").setValue(properties.position);
            results.push("Position set to [" + properties.position.join(", ") + "]");
        }

        // Scale
        if (properties.scale !== undefined) {
            layer.property("Scale").setValue(properties.scale);
            results.push("Scale set to [" + properties.scale.join(", ") + "]");
        }

        // Rotation
        if (properties.rotation !== undefined) {
            layer.property("Rotation").setValue(properties.rotation);
            results.push("Rotation set to " + properties.rotation + " degrees");
        }

        // Opacity
        if (properties.opacity !== undefined) {
            layer.property("Opacity").setValue(properties.opacity);
            results.push("Opacity set to " + properties.opacity + "%");
        }

        // Anchor Point
        if (properties.anchorPoint !== undefined) {
            layer.property("Anchor Point").setValue(properties.anchorPoint);
            results.push("Anchor Point set to [" + properties.anchorPoint.join(", ") + "]");
        }

        // In/Out Points
        if (properties.inPoint !== undefined) {
            layer.inPoint = properties.inPoint;
            results.push("In Point set to " + properties.inPoint + "s");
        }

        if (properties.outPoint !== undefined) {
            layer.outPoint = properties.outPoint;
            results.push("Out Point set to " + properties.outPoint + "s");
        }

        // Start Time
        if (properties.startTime !== undefined) {
            layer.startTime = properties.startTime;
            results.push("Start Time set to " + properties.startTime + "s");
        }

        // Visibility
        if (properties.enabled !== undefined) {
            layer.enabled = properties.enabled;
            results.push("Layer " + (properties.enabled ? "enabled" : "disabled"));
        }

        // Name
        if (properties.name !== undefined) {
            layer.name = properties.name;
            results.push("Layer renamed to '" + properties.name + "'");
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                layerIndex: layer.index,
                changes: results
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Set keyframe for a layer property
function setLayerKeyframe(compIndex, layerIndex, propertyName, timeInSeconds, value) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index: " + compIndex };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index: " + layerIndex };
        }

        var property = layer.property(propertyName);
        if (!property) {
            return { success: false, error: "Property '" + propertyName + "' not found on layer" };
        }

        // Set keyframe at specified time
        property.setValueAtTime(timeInSeconds, value);

        return {
            success: true,
            data: {
                layerName: layer.name,
                property: propertyName,
                time: timeInSeconds,
                value: value
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Set expression for a layer property
function setLayerExpression(compIndex, layerIndex, propertyName, expression) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index: " + compIndex };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index: " + layerIndex };
        }

        var property = layer.property(propertyName);
        if (!property) {
            return { success: false, error: "Property '" + propertyName + "' not found on layer" };
        }

        // Set or remove expression
        if (expression && expression !== "") {
            property.expression = expression;
            return {
                success: true,
                data: {
                    layerName: layer.name,
                    property: propertyName,
                    expression: expression,
                    action: "set"
                }
            };
        } else {
            property.expression = "";
            return {
                success: true,
                data: {
                    layerName: layer.name,
                    property: propertyName,
                    action: "removed"
                }
            };
        }
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Get detailed layer information
function getLayerInfo(compIndex, layerIndex, includeKeyframes) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var layerInfo = {
            name: layer.name,
            index: layer.index,
            type: layer instanceof TextLayer ? "text" :
                  layer instanceof ShapeLayer ? "shape" :
                  layer instanceof AVLayer ? "av" :
                  layer instanceof CameraLayer ? "camera" :
                  layer instanceof LightLayer ? "light" : "other",
            enabled: layer.enabled,
            locked: layer.locked,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            startTime: layer.startTime,
            properties: {}
        };

        // Get transform properties
        var transformProps = ["Position", "Scale", "Rotation", "Opacity", "Anchor Point"];
        for (var i = 0; i < transformProps.length; i++) {
            var propName = transformProps[i];
            var prop = layer.property(propName);
            if (prop) {
                var propData = {
                    value: prop.value,
                    expression: prop.expression || null,
                    canSetExpression: prop.canSetExpression,
                    numKeys: prop.numKeys
                };

                // Include keyframes if requested
                if (includeKeyframes && prop.numKeys > 0) {
                    propData.keyframes = [];
                    for (var k = 1; k <= prop.numKeys; k++) {
                        propData.keyframes.push({
                            time: prop.keyTime(k),
                            value: prop.keyValue(k)
                        });
                    }
                }

                layerInfo.properties[propName] = propData;
            }
        }

        return {
            success: true,
            data: layerInfo
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Set multiple keyframes at once
function setMultipleKeyframes(compIndex, layerIndex, keyframes) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var results = [];
        for (var i = 0; i < keyframes.length; i++) {
            var kf = keyframes[i];
            if (!kf.property || kf.time === undefined) {
                results.push({ property: kf.property, success: false, error: "Missing property or time" });
                continue;
            }

            try {
                var prop = layer.property(kf.property);
                if (!prop) {
                    results.push({ property: kf.property, success: false, error: "Property not found" });
                    continue;
                }

                // Use existing value if not provided
                var value = kf.value !== undefined ? kf.value : prop.value;
                prop.setValueAtTime(kf.time, value);
                results.push({ property: kf.property, time: kf.time, value: value, success: true });
            } catch (e) {
                results.push({ property: kf.property, success: false, error: e.toString() });
            }
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                layerIndex: layer.index,
                keyframes: results
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Copy animation from one layer to another
function copyAnimation(compIndex, sourceLayerIndex, targetLayerIndices, properties, timeOffset) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var sourceLayer = comp.layer(sourceLayerIndex);
        if (!sourceLayer) {
            return { success: false, error: "Invalid source layer index" };
        }

        // If no properties specified, copy all animated properties
        if (!properties || properties.length === 0) {
            properties = ["Position", "Scale", "Rotation", "Opacity"];
        }

        var results = [];
        for (var t = 0; t < targetLayerIndices.length; t++) {
            var targetLayer = comp.layer(targetLayerIndices[t]);
            if (!targetLayer) {
                results.push({
                    targetIndex: targetLayerIndices[t],
                    success: false,
                    error: "Layer not found"
                });
                continue;
            }

            var layerResult = {
                targetIndex: targetLayerIndices[t],
                targetName: targetLayer.name,
                copiedProperties: []
            };

            for (var p = 0; p < properties.length; p++) {
                var propName = properties[p];
                try {
                    var sourceProp = sourceLayer.property(propName);
                    var targetProp = targetLayer.property(propName);

                    if (!sourceProp || !targetProp) continue;

                    // Copy expression if exists
                    if (sourceProp.expression) {
                        targetProp.expression = sourceProp.expression;
                    }

                    // Copy keyframes if they exist
                    if (sourceProp.numKeys > 0) {
                        // Remove existing keyframes
                        while (targetProp.numKeys > 0) {
                            targetProp.removeKey(1);
                        }

                        // Copy all keyframes with optional time offset
                        var offset = timeOffset ? timeOffset * t : 0;
                        for (var k = 1; k <= sourceProp.numKeys; k++) {
                            var time = sourceProp.keyTime(k) + offset;
                            var value = sourceProp.keyValue(k);
                            targetProp.setValueAtTime(time, value);
                        }
                        layerResult.copiedProperties.push(propName + " (" + sourceProp.numKeys + " keys)");
                    } else if (!sourceProp.expression) {
                        // Just copy the static value
                        targetProp.setValue(sourceProp.value);
                        layerResult.copiedProperties.push(propName + " (static)");
                    }
                } catch (e) {
                    // Property might not exist on target layer
                }
            }

            layerResult.success = true;
            results.push(layerResult);
        }

        return {
            success: true,
            data: {
                sourceLayer: sourceLayer.name,
                results: results
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}