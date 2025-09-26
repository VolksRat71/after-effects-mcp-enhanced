
// Get a composition by its index among all compositions in the project
function getCompositionByIndex(compIndex) {
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.items[i] instanceof CompItem) {
            comps.push(app.project.items[i]);
        }
    }

    if (compIndex > 0 && compIndex <= comps.length) {
        return comps[compIndex - 1];
    }
    return null;
}

// Set a keyframe for a specific property on a layer
// Used by tool: tools/layer/setLayerKeyframe.ts
function setLayerKeyframe(compIndex, layerIndex, propertyName, timeInSeconds, value) {
    try {
        var comp = getCompositionByIndex(compIndex);
        if (!comp) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
        if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
        if (!transformGroup) {
             return JSON.stringify({ success: false, message: "Transform properties not found for layer '" + layer.name + "' (type: " + layer.matchName + ")." });
        }

        var property = transformGroup.property(propertyName);
        if (!property) {
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
            }

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        if (!property.canVaryOverTime) {
             return JSON.stringify({ success: false, message: "Property '" + propertyName + "' cannot be keyframed." });
        }

        if (property.numKeys === 0 && !property.isTimeVarying) {
             property.setValueAtTime(comp.time, property.value);
        }

        property.setValueAtTime(timeInSeconds, value);

        return JSON.stringify({ success: true, message: "Keyframe set for '" + propertyName + "' on layer '" + layer.name + "' at " + timeInSeconds + "s." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting keyframe: " + e.toString() + " (Line: " + e.line + ")" });
    }
}

// Set an expression for a specific property on a layer
// Used by tool: tools/layer/setLayerExpression.ts
function setLayerExpression(compIndex, layerIndex, propertyName, expressionString) {
    try {
        var comp = getCompositionByIndex(compIndex);
         if (!comp) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
         if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
         if (!transformGroup) {
        }

        var property = transformGroup ? transformGroup.property(propertyName) : null;
         if (!property) {
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
             }

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        if (!property.canSetExpression) {
            return JSON.stringify({ success: false, message: "Property '" + propertyName + "' does not support expressions." });
        }

        property.expression = expressionString;

        var action = expressionString === "" ? "removed" : "set";
        return JSON.stringify({ success: true, message: "Expression " + action + " for '" + propertyName + "' on layer '" + layer.name + "'." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting expression: " + e.toString() + " (Line: " + e.line + ")" });
    }
}