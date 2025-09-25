/**
 * Composition Operations Module for MCP Bridge
 * Handles composition creation and layer creation within compositions
 */

// Create a new composition
function createComposition(name, width, height, pixelAspect, duration, frameRate) {
    try {
        var comp = app.project.items.addComp(
            name || "New Composition",
            width || 1920,
            height || 1080,
            pixelAspect || 1,
            duration || 10,
            frameRate || 30
        );

        return {
            success: true,
            data: {
                name: comp.name,
                id: comp.id,
                width: comp.width,
                height: comp.height
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Create text layer in composition
function createTextLayer(compIndex, text, position, fontSize, fontColor, fontName) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        var textLayer = comp.layers.addText(text || "Text");
        var textProp = textLayer.property("Source Text");
        var textDocument = textProp.value;

        // Set font properties if provided
        if (fontSize) textDocument.fontSize = fontSize;
        if (fontColor) textDocument.fillColor = fontColor;
        if (fontName) textDocument.font = fontName;

        textProp.setValue(textDocument);

        // Set position if provided
        if (position && position.length >= 2) {
            textLayer.property("Position").setValue(position);
        }

        return {
            success: true,
            data: {
                layerName: textLayer.name,
                layerIndex: textLayer.index,
                text: text
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Create shape layer in composition
function createShapeLayer(compIndex, shapeType, position, size, fillColor, strokeColor, strokeWidth) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        // Create shape layer
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = shapeType || "Shape";

        // Add shape group
        var shapeGroup = shapeLayer.property("Contents").addProperty("ADBE Vector Group");
        shapeGroup.name = shapeType || "Shape";

        // Add the shape based on type
        var shapePath;
        if (shapeType === "rectangle" || shapeType === "rect") {
            var rect = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
            if (size && size.length >= 2) {
                rect.property("Size").setValue(size);
            }
            shapePath = rect;
        } else if (shapeType === "ellipse" || shapeType === "circle") {
            var ellipse = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            if (size && size.length >= 2) {
                ellipse.property("Size").setValue(size);
            }
            shapePath = ellipse;
        } else if (shapeType === "star") {
            var star = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
            shapePath = star;
        } else {
            // Default to rectangle
            var defaultRect = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
            if (size && size.length >= 2) {
                defaultRect.property("Size").setValue(size);
            }
            shapePath = defaultRect;
        }

        // Add fill
        if (fillColor) {
            var fill = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue(fillColor);
        }

        // Add stroke
        if (strokeColor) {
            var stroke = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(strokeColor);
            if (strokeWidth) {
                stroke.property("Stroke Width").setValue(strokeWidth);
            }
        }

        // Set position
        if (position && position.length >= 2) {
            shapeLayer.property("Position").setValue(position);
        }

        return {
            success: true,
            data: {
                layerName: shapeLayer.name,
                layerIndex: shapeLayer.index,
                shapeType: shapeType
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Create solid layer in composition
function createSolidLayer(compIndex, name, color, width, height, position) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        // Create solid
        var solidColor = color || [1, 1, 1]; // Default white
        var solidWidth = width || comp.width;
        var solidHeight = height || comp.height;
        var solidName = name || "Solid";

        var solid = comp.layers.addSolid(
            solidColor,
            solidName,
            solidWidth,
            solidHeight,
            comp.pixelAspect
        );

        // Set position if provided
        if (position && position.length >= 2) {
            solid.property("Position").setValue(position);
        }

        return {
            success: true,
            data: {
                layerName: solid.name,
                layerIndex: solid.index,
                width: solidWidth,
                height: solidHeight
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Get project information
function getProjectInfo() {
    try {
        var project = app.project;
        var comps = [];

        for (var i = 1; i <= project.numItems; i++) {
            var item = project.item(i);
            if (item instanceof CompItem) {
                comps.push({
                    index: i,
                    name: item.name,
                    width: item.width,
                    height: item.height,
                    duration: item.duration,
                    frameRate: item.frameRate,
                    numLayers: item.numLayers
                });
            }
        }

        return {
            success: true,
            data: {
                projectName: project.file ? project.file.name : "Untitled Project",
                numItems: project.numItems,
                compositions: comps,
                activeItem: project.activeItem ? project.activeItem.name : null
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// List all compositions in the project
function listCompositions() {
    try {
        var comps = [];
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                var layers = [];
                for (var j = 1; j <= item.numLayers; j++) {
                    var layer = item.layer(j);
                    layers.push({
                        index: j,
                        name: layer.name,
                        type: layer instanceof TextLayer ? "text" :
                              layer instanceof ShapeLayer ? "shape" :
                              layer instanceof AVLayer ? "av" :
                              layer instanceof CameraLayer ? "camera" :
                              layer instanceof LightLayer ? "light" : "other",
                        visible: layer.enabled,
                        locked: layer.locked
                    });
                }

                comps.push({
                    index: i,
                    name: item.name,
                    width: item.width,
                    height: item.height,
                    pixelAspect: item.pixelAspect,
                    duration: item.duration,
                    frameRate: item.frameRate,
                    layers: layers
                });
            }
        }

        return {
            success: true,
            data: comps
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}