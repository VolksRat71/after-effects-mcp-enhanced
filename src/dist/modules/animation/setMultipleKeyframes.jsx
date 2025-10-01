/**
 * Set multiple keyframes for different properties at once on a layer
 * @param {Object} args - Arguments object
 * @param {number} args.compIndex - 1-based composition index
 * @param {number} args.layerIndex - 1-based layer index
 * @param {Array} args.keyframes - Array of {property, time, value} objects
 * @returns {string} JSON string with results for each keyframe
 */
function setMultipleKeyframes(args) {
    try {
        var compIndex = args.compIndex;
        var layerIndex = args.layerIndex;
        var keyframes = args.keyframes || [];

        if (!app.project) {
            throw new Error("No project is open");
        }

        if (keyframes.length === 0) {
            throw new Error("No keyframes specified");
        }

        // Find the composition
        var comp = null;
        var compCount = 0;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof CompItem) {
                compCount++;
                if (compCount === compIndex) {
                    comp = app.project.item(i);
                    break;
                }
            }
        }

        if (!comp) {
            throw new Error("Composition not found at index " + compIndex);
        }

        if (layerIndex < 1 || layerIndex > comp.numLayers) {
            throw new Error("Invalid layer index: " + layerIndex + " (composition has " + comp.numLayers + " layers)");
        }

        var layer = comp.layer(layerIndex);
        var results = [];

        // Process each keyframe
        for (var j = 0; j < keyframes.length; j++) {
            var kf = keyframes[j];

            try {
                var prop = null;
                var propertyName = kf.property;
                var time = kf.time;
                var value = kf.value;

                // Try to find the property in Transform group first
                var transform = layer.property("ADBE Transform Group");
                if (transform) {
                    try {
                        prop = transform.property(propertyName);
                    } catch (e) {
                        // Property not in transform, will try other groups
                    }
                }

                // Try Effects group
                if (!prop) {
                    var effects = layer.property("ADBE Effect Parade");
                    if (effects) {
                        try {
                            prop = effects.property(propertyName);
                        } catch (e) {
                            // Property not in effects
                        }
                    }
                }

                // Try Text group (for text layers)
                if (!prop && layer instanceof TextLayer) {
                    var text = layer.property("ADBE Text Properties");
                    if (text) {
                        try {
                            prop = text.property(propertyName);
                        } catch (e) {
                            // Property not in text
                        }
                    }
                }

                if (!prop) {
                    results.push({
                        property: propertyName,
                        time: time,
                        success: false,
                        error: "Property '" + propertyName + "' not found"
                    });
                    continue;
                }

                if (!prop.canVaryOverTime) {
                    results.push({
                        property: propertyName,
                        time: time,
                        success: false,
                        error: "Property '" + propertyName + "' cannot be keyframed"
                    });
                    continue;
                }

                // Set the keyframe
                prop.setValueAtTime(time, value);

                results.push({
                    property: propertyName,
                    time: time,
                    value: value,
                    success: true
                });

            } catch (keyframeError) {
                results.push({
                    property: kf.property,
                    time: kf.time,
                    success: false,
                    error: keyframeError.toString()
                });
            }
        }

        // Count successes
        var successCount = 0;
        var failCount = 0;
        for (var k = 0; k < results.length; k++) {
            if (results[k].success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        return JSON.stringify({
            success: true,
            layer: {
                name: layer.name,
                index: layer.index
            },
            composition: comp.name,
            keyframesSet: successCount,
            keyframesFailed: failCount,
            results: results
        });

    } catch (error) {
        return JSON.stringify({
            status: "error",
            command: "setMultipleKeyframes",
            message: error.toString(),
            line: error.line || "unknown"
        });
    }
}
