/**
 * Effects Operations Module for MCP Bridge
 * Handles effect application and management on layers
 */

// Apply an effect to a layer
function applyEffect(compIndex, layerIndex, effectName, effectMatchName, effectSettings) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var effect;

        // Try to add effect by match name (more reliable)
        if (effectMatchName) {
            try {
                effect = layer.property("Effects").addProperty(effectMatchName);
            } catch (e) {
                // Fallback to display name if match name fails
                if (effectName) {
                    effect = layer.property("Effects").addProperty(effectName);
                } else {
                    throw e;
                }
            }
        } else if (effectName) {
            // Try by display name
            effect = layer.property("Effects").addProperty(effectName);
        } else {
            return { success: false, error: "No effect name provided" };
        }

        // Apply settings if provided
        if (effectSettings && effect) {
            for (var settingName in effectSettings) {
                if (effectSettings.hasOwnProperty(settingName)) {
                    try {
                        var prop = effect.property(settingName);
                        if (prop && prop.canSetExpression) {
                            prop.setValue(effectSettings[settingName]);
                        }
                    } catch (e) {
                        // Some properties might not be settable
                    }
                }
            }
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                effectName: effect.name,
                effectIndex: effect.propertyIndex
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Apply a predefined effect template
function applyEffectTemplate(compIndex, layerIndex, templateName, customSettings) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var effectData = getEffectTemplate(templateName);
        if (!effectData) {
            return { success: false, error: "Unknown template: " + templateName };
        }

        // Merge custom settings with template defaults
        var settings = {};
        for (var key in effectData.settings) {
            if (effectData.settings.hasOwnProperty(key)) {
                settings[key] = effectData.settings[key];
            }
        }
        if (customSettings) {
            for (var customKey in customSettings) {
                if (customSettings.hasOwnProperty(customKey)) {
                    settings[customKey] = customSettings[customKey];
                }
            }
        }

        // Apply the effect
        var effect = layer.property("Effects").addProperty(effectData.matchName);

        // Apply settings
        for (var settingName in settings) {
            if (settings.hasOwnProperty(settingName)) {
                try {
                    var prop = effect.property(settingName);
                    if (prop && prop.canSetExpression) {
                        prop.setValue(settings[settingName]);
                    }
                } catch (e) {
                    // Some properties might not be settable
                }
            }
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                effectName: effect.name,
                template: templateName,
                appliedSettings: settings
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Get effect template configuration
function getEffectTemplate(templateName) {
    var templates = {
        "gaussian-blur": {
            matchName: "ADBE Gaussian Blur 2",
            settings: {
                "Blurriness": 20,
                "Blur Dimensions": 1  // 1 = Horizontal and Vertical
            }
        },
        "directional-blur": {
            matchName: "ADBE Motion Blur",
            settings: {
                "Direction": 0,
                "Blur Length": 20
            }
        },
        "color-balance": {
            matchName: "ADBE Color Balance (HLS)",
            settings: {
                "Hue": 0,
                "Lightness": 0,
                "Saturation": 0
            }
        },
        "brightness-contrast": {
            matchName: "ADBE Brightness & Contrast",
            settings: {
                "Brightness": 0,
                "Contrast": 0
            }
        },
        "curves": {
            matchName: "ADBE Curves",
            settings: {
                // Curves is complex, just apply with defaults
            }
        },
        "glow": {
            matchName: "ADBE Glo2",
            settings: {
                "Glow Threshold": 60,
                "Glow Radius": 20,
                "Glow Intensity": 1
            }
        },
        "drop-shadow": {
            matchName: "ADBE Drop Shadow",
            settings: {
                "Shadow Color": [0, 0, 0],
                "Opacity": 75,
                "Direction": 135,
                "Distance": 10,
                "Softness": 10
            }
        },
        "cinematic-look": {
            matchName: "ADBE Lumetri",
            settings: {
                "Basic Correction::Contrast": 20,
                "Basic Correction::Highlights": -30,
                "Basic Correction::Shadows": 30,
                "Creative::Faded Film": 25,
                "Creative::Vibrance": 15,
                "Vignette::Amount": -0.5
            }
        },
        "text-pop": {
            matchName: "ADBE Drop Shadow",
            settings: {
                "Shadow Color": [0, 0, 0],
                "Opacity": 90,
                "Direction": 135,
                "Distance": 5,
                "Softness": 5
            }
        }
    };

    return templates[templateName] || null;
}

// Get all effects on a layer
function getLayerEffects(compIndex, layerIndex) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var effects = [];
        var effectsGroup = layer.property("Effects");

        if (effectsGroup && effectsGroup.numProperties > 0) {
            for (var i = 1; i <= effectsGroup.numProperties; i++) {
                var effect = effectsGroup.property(i);
                var effectInfo = {
                    index: i,
                    name: effect.name,
                    matchName: effect.matchName,
                    enabled: effect.enabled,
                    properties: []
                };

                // Get effect properties
                for (var j = 1; j <= effect.numProperties; j++) {
                    try {
                        var prop = effect.property(j);
                        if (prop && prop.name) {
                            var propInfo = {
                                name: prop.name,
                                value: prop.value !== undefined ? prop.value : null,
                                canSetExpression: prop.canSetExpression || false
                            };
                            effectInfo.properties.push(propInfo);
                        }
                    } catch (e) {
                        // Some properties might not be accessible
                    }
                }

                effects.push(effectInfo);
            }
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                layerIndex: layer.index,
                effectCount: effects.length,
                effects: effects
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Remove effect from layer
function removeEffect(compIndex, layerIndex, effectIndex) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var effectsGroup = layer.property("Effects");
        if (!effectsGroup || effectIndex < 1 || effectIndex > effectsGroup.numProperties) {
            return { success: false, error: "Invalid effect index" };
        }

        var effectName = effectsGroup.property(effectIndex).name;
        effectsGroup.property(effectIndex).remove();

        return {
            success: true,
            data: {
                layerName: layer.name,
                removedEffect: effectName
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Set effect property value
function setEffectProperty(compIndex, layerIndex, effectIndex, propertyName, value) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { success: false, error: "Invalid layer index" };
        }

        var effect = layer.property("Effects").property(effectIndex);
        if (!effect) {
            return { success: false, error: "Invalid effect index" };
        }

        var prop = effect.property(propertyName);
        if (!prop) {
            return { success: false, error: "Property '" + propertyName + "' not found" };
        }

        prop.setValue(value);

        return {
            success: true,
            data: {
                layerName: layer.name,
                effectName: effect.name,
                property: propertyName,
                newValue: value
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}