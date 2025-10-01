/**
 * Import image or video files from disk into the After Effects project
 * @param {Object} args - Arguments object
 * @param {Array<string>} args.files - Array of absolute file paths to import
 * @param {boolean} args.addToComp - Whether to add imported items to a composition
 * @param {number} args.compIndex - 1-based index of the composition to add items to
 * @param {Array<number>} args.position - Position [x, y] for the layers
 * @param {Array<number>} args.scale - Scale [x, y] percentage for the layers
 * @returns {string} JSON string with import results
 */
function importAssets(args) {
    try {
        var files = args.files || [];
        var addToComp = args.addToComp || false;
        var compIndex = args.compIndex || 1;
        var position = args.position || [960, 540];
        var scale = args.scale || [100, 100];

        if (!app.project) {
            throw new Error("No project is open");
        }

        if (files.length === 0) {
            throw new Error("No files specified for import");
        }

        var importedItems = [];

        // Import each file
        for (var i = 0; i < files.length; i++) {
            var filePath = files[i];
            var file = new File(filePath);

            if (!file.exists) {
                importedItems.push({
                    path: filePath,
                    success: false,
                    error: "File does not exist"
                });
                continue;
            }

            try {
                var importOptions = new ImportOptions(file);
                var importedItem = app.project.importFile(importOptions);

                var itemResult = {
                    path: filePath,
                    success: true,
                    name: importedItem.name,
                    id: importedItem.id,
                    type: importedItem.typeName
                };

                // Add to composition if requested
                if (addToComp && importedItem instanceof FootageItem) {
                    var comp = null;
                    var compCount = 0;

                    // Find the target composition by index
                    for (var j = 1; j <= app.project.numItems; j++) {
                        if (app.project.item(j) instanceof CompItem) {
                            compCount++;
                            if (compCount === compIndex) {
                                comp = app.project.item(j);
                                break;
                            }
                        }
                    }

                    if (!comp) {
                        itemResult.addToCompWarning = "Composition not found at index " + compIndex;
                    } else {
                        var layer = comp.layers.add(importedItem);
                        layer.property("Transform").property("Position").setValue(position);
                        layer.property("Transform").property("Scale").setValue(scale);

                        itemResult.addedToComp = comp.name;
                        itemResult.layerIndex = layer.index;
                    }
                }

                importedItems.push(itemResult);

            } catch (importError) {
                importedItems.push({
                    path: filePath,
                    success: false,
                    error: importError.toString()
                });
            }
        }

        // Count successes and failures
        var successCount = 0;
        var failCount = 0;
        for (var k = 0; k < importedItems.length; k++) {
            if (importedItems[k].success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        return JSON.stringify({
            success: true,
            imported: importedItems,
            totalImported: successCount,
            totalFailed: failCount
        });

    } catch (error) {
        return JSON.stringify({
            status: "error",
            command: "importAssets",
            message: error.toString(),
            line: error.line || "unknown"
        });
    }
}
