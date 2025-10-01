// getLayerProperties.jsx
// Get detailed information about a layer's properties including keyframe data

function getLayerProperties(args) {
    try {
        var compIndex = args.compIndex;
        var layerIndex = args.layerIndex;
        var includeKeyframes = args.includeKeyframes !== undefined ? args.includeKeyframes : true;

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
            return JSON.stringify({
                success: false,
                error: "Composition not found at index " + compIndex
            });
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return JSON.stringify({
                success: false,
                error: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"
            });
        }

        // Get transform properties
        var transform = layer.property("Transform");
        var properties = {};

        // Helper function to get property info
        function getPropertyInfo(prop, propName) {
            var info = {
                value: prop.value,
                canSetExpression: prop.canSetExpression,
                expression: prop.expression || "",
                expressionEnabled: prop.expressionEnabled,
                numKeys: prop.numKeys
            };

            if (includeKeyframes && prop.numKeys > 0) {
                info.keyframes = [];
                for (var k = 1; k <= prop.numKeys; k++) {
                    info.keyframes.push({
                        time: prop.keyTime(k),
                        value: prop.keyValue(k)
                    });
                }
            }

            return info;
        }

        // Get all transform properties
        properties.position = getPropertyInfo(transform.property("Position"), "Position");
        properties.scale = getPropertyInfo(transform.property("Scale"), "Scale");
        properties.rotation = getPropertyInfo(transform.property("Rotation"), "Rotation");
        properties.opacity = getPropertyInfo(transform.property("Opacity"), "Opacity");
        properties.anchorPoint = getPropertyInfo(transform.property("Anchor Point"), "Anchor Point");

        // Get layer info
        var layerInfo = {
            name: layer.name,
            index: layer.index,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            startTime: layer.startTime,
            duration: layer.duration,
            enabled: layer.enabled,
            solo: layer.solo,
            shy: layer.shy,
            locked: layer.locked,
            hasVideo: layer.hasVideo,
            active: layer.active,
            nullLayer: layer.nullLayer,
            parent: layer.parent ? layer.parent.name : null
        };

        // Check for effects
        var effects = [];
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
            var effectsGroup = layer.property("Effects");
            for (var e = 1; e <= effectsGroup.numProperties; e++) {
                var effect = effectsGroup.property(e);
                effects.push({
                    name: effect.name,
                    enabled: effect.enabled,
                    index: e
                });
            }
        }

        return JSON.stringify({
            success: true,
            layer: layerInfo,
            properties: properties,
            effects: effects,
            composition: {
                name: comp.name,
                index: compIndex
            }
        });

    } catch (error) {
        return JSON.stringify({
            success: false,
            error: error.toString(),
            line: error.line || "unknown"
        });
    }
}