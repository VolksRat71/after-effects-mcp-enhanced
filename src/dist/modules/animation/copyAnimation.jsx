/**
 * Copy all keyframes from a source layer to target layers with optional time offset
 * @param {Object} args - Arguments object
 * @param {number} args.compIndex - 1-based composition index
 * @param {number} args.sourceLayerIndex - Index of source layer to copy from
 * @param {Array<number>} args.targetLayerIndices - Array of target layer indices
 * @param {Array<string>} args.properties - Properties to copy (optional, default: all animated)
 * @param {number} args.timeOffset - Time offset in seconds for each successive layer
 * @returns {string} JSON string with copy results
 */
function copyAnimation(args) {
    try {
        var compIndex = args.compIndex;
        var sourceLayerIndex = args.sourceLayerIndex;
        var targetLayerIndices = args.targetLayerIndices || [];
        var propertiesToCopy = args.properties || null;
        var timeOffset = args.timeOffset || 0;

        if (!app.project) {
            throw new Error("No project is open");
        }

        if (targetLayerIndices.length === 0) {
            throw new Error("No target layers specified");
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

        if (sourceLayerIndex < 1 || sourceLayerIndex > comp.numLayers) {
            throw new Error("Invalid source layer index: " + sourceLayerIndex);
        }

        var sourceLayer = comp.layer(sourceLayerIndex);

        // Helper function to copy all keyframes from a property
        function copyPropertyKeyframes(sourceProp, targetProp, offset) {
            if (sourceProp.numKeys > 0) {
                // Clear existing keyframes on target
                while (targetProp.numKeys > 0) {
                    targetProp.removeKey(1);
                }

                // Copy all keyframes with offset
                for (var k = 1; k <= sourceProp.numKeys; k++) {
                    var time = sourceProp.keyTime(k);
                    var value = sourceProp.keyValue(k);

                    targetProp.setValueAtTime(time + offset, value);

                    // Copy interpolation if possible
                    try {
                        var inInterp = sourceProp.keyInInterpolationType(k);
                        var outInterp = sourceProp.keyOutInterpolationType(k);
                        // Find the key we just added (should be the last one)
                        var newKeyIndex = targetProp.numKeys;
                        targetProp.setInterpolationTypeAtKey(newKeyIndex, inInterp, outInterp);
                    } catch (e) {
                        // Some properties don't support interpolation settings
                    }
                }
                return true;
            }
            return false;
        }

        var results = [];

        // Copy to each target layer
        for (var i = 0; i < targetLayerIndices.length; i++) {
            var targetIndex = targetLayerIndices[i];

            if (targetIndex < 1 || targetIndex > comp.numLayers) {
                results.push({
                    layerIndex: targetIndex,
                    success: false,
                    error: "Invalid layer index: " + targetIndex
                });
                continue;
            }

            var targetLayer = comp.layer(targetIndex);
            var offset = timeOffset * i;
            var copiedForLayer = [];

            // If specific properties requested, copy only those
            if (propertiesToCopy && propertiesToCopy.length > 0) {
                for (var p = 0; p < propertiesToCopy.length; p++) {
                    var propName = propertiesToCopy[p];
                    try {
                        var sourceTransform = sourceLayer.property("ADBE Transform Group");
                        var targetTransform = targetLayer.property("ADBE Transform Group");

                        var sourceProp = sourceTransform.property(propName);
                        var targetProp = targetTransform.property(propName);

                        if (sourceProp && targetProp && copyPropertyKeyframes(sourceProp, targetProp, offset)) {
                            copiedForLayer.push(propName);
                        }
                    } catch (e) {
                        // Property might not exist or not be in Transform group
                    }
                }
            } else {
                // Copy all animated transform properties
                var transformProps = ["ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity", "ADBE Anchor Point"];
                var transformPropNames = ["Position", "Scale", "Rotation", "Opacity", "Anchor Point"];

                for (var t = 0; t < transformProps.length; t++) {
                    try {
                        var sourceTransform = sourceLayer.property("ADBE Transform Group");
                        var targetTransform = targetLayer.property("ADBE Transform Group");

                        var sourceProp = sourceTransform.property(transformProps[t]);
                        var targetProp = targetTransform.property(transformProps[t]);

                        if (sourceProp && targetProp && sourceProp.numKeys > 0) {
                            if (copyPropertyKeyframes(sourceProp, targetProp, offset)) {
                                copiedForLayer.push(transformPropNames[t]);
                            }
                        }
                    } catch (e) {
                        // Property might not exist
                    }
                }
            }

            results.push({
                layerIndex: targetIndex,
                layerName: targetLayer.name,
                copiedProperties: copiedForLayer,
                timeOffset: offset,
                success: copiedForLayer.length > 0
            });
        }

        // Count successes
        var successCount = 0;
        var failCount = 0;
        for (var r = 0; r < results.length; r++) {
            if (results[r].success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        return JSON.stringify({
            success: true,
            sourceLayer: {
                name: sourceLayer.name,
                index: sourceLayer.index
            },
            composition: comp.name,
            layersCopied: successCount,
            layersFailed: failCount,
            results: results
        });

    } catch (error) {
        return JSON.stringify({
            status: "error",
            command: "copyAnimation",
            message: error.toString(),
            line: error.line || "unknown"
        });
    }
}
