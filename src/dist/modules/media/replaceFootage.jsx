/**
 * Replace the source footage of an existing layer with a new file
 * @param {Object} args - Arguments object
 * @param {number} args.compIndex - 1-based index of the composition
 * @param {number} args.layerIndex - 1-based index of the layer to replace footage for (optional)
 * @param {string} args.layerName - Name of the layer to replace footage for (optional)
 * @param {string} args.newFootagePath - Absolute path to the new footage file
 * @returns {string} JSON string with replacement result
 */
function replaceFootage(args) {
    try {
        var compIndex = args.compIndex;
        var layerIndex = args.layerIndex;
        var layerName = args.layerName;
        var newFootagePath = args.newFootagePath;

        if (!app.project) {
            throw new Error("No project is open");
        }

        if (!newFootagePath) {
            throw new Error("No new footage path specified");
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

        // Find the layer
        var layer = null;
        if (layerIndex) {
            if (layerIndex < 1 || layerIndex > comp.numLayers) {
                throw new Error("Invalid layer index: " + layerIndex + " (composition has " + comp.numLayers + " layers)");
            }
            layer = comp.layer(layerIndex);
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) {
                    layer = comp.layer(j);
                    break;
                }
            }
            if (!layer) {
                throw new Error("Layer not found with name: " + layerName);
            }
        } else {
            throw new Error("Either layerIndex or layerName must be specified");
        }

        // Verify layer has replaceable source
        if (!(layer instanceof AVLayer) || !layer.source) {
            throw new Error("Layer '" + layer.name + "' does not have replaceable source footage");
        }

        // Import the new footage
        var file = new File(newFootagePath);
        if (!file.exists) {
            throw new Error("New footage file does not exist: " + newFootagePath);
        }

        var importOptions = new ImportOptions(file);
        var newFootage = app.project.importFile(importOptions);

        // Store old source info
        var oldSource = layer.source;
        var oldSourceName = oldSource.name;

        // Replace the source
        layer.replaceSource(newFootage, false);

        return JSON.stringify({
            success: true,
            message: "Footage replaced successfully",
            layer: {
                name: layer.name,
                index: layer.index
            },
            oldSource: oldSourceName,
            newSource: newFootage.name,
            composition: comp.name
        });

    } catch (error) {
        return JSON.stringify({
            status: "error",
            command: "replaceFootage",
            message: error.toString(),
            line: error.line || "unknown"
        });
    }
}
