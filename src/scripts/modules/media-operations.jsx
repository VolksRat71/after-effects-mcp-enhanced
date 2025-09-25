/**
 * Media Operations Module for MCP Bridge
 * Handles importing assets and replacing footage
 */

// Import assets into the project
function importAssets(files, addToComp, compIndex, position, scale) {
    try {
        if (!files || files.length === 0) {
            return { success: false, error: "No files provided" };
        }

        var imported = [];
        var comp = null;

        // Get composition if we need to add items to it
        if (addToComp && compIndex) {
            comp = app.project.item(compIndex);
            if (!comp || !(comp instanceof CompItem)) {
                return { success: false, error: "Invalid composition index" };
            }
        }

        // Import each file
        for (var i = 0; i < files.length; i++) {
            var file = new File(files[i]);
            if (!file.exists) {
                imported.push({
                    path: files[i],
                    success: false,
                    error: "File not found"
                });
                continue;
            }

            try {
                // Import the file
                var importOptions = new ImportOptions(file);
                var importedItem = app.project.importFile(importOptions);

                var itemInfo = {
                    path: files[i],
                    name: importedItem.name,
                    success: true
                };

                // Add to composition if requested
                if (comp && importedItem) {
                    var layer = comp.layers.add(importedItem);

                    // Set position if provided
                    if (position && position.length >= 2) {
                        layer.property("Position").setValue(position);
                    }

                    // Set scale if provided
                    if (scale && scale.length >= 2) {
                        layer.property("Scale").setValue(scale);
                    }

                    itemInfo.addedToComp = true;
                    itemInfo.layerIndex = layer.index;
                }

                imported.push(itemInfo);
            } catch (e) {
                imported.push({
                    path: files[i],
                    success: false,
                    error: e.toString()
                });
            }
        }

        return {
            success: true,
            data: {
                totalFiles: files.length,
                imported: imported,
                composition: comp ? comp.name : null
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Replace footage for a layer
function replaceFootage(compIndex, layerIndex, layerName, newFootagePath) {
    try {
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            return { success: false, error: "Invalid composition index" };
        }

        // Find the layer by index or name
        var layer = null;
        if (layerIndex) {
            layer = comp.layer(layerIndex);
        } else if (layerName) {
            // Search by name
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === layerName) {
                    layer = comp.layer(i);
                    break;
                }
            }
        }

        if (!layer) {
            return { success: false, error: "Layer not found" };
        }

        // Check if it's an AV layer (has source footage)
        if (!(layer instanceof AVLayer)) {
            return { success: false, error: "Layer is not an AV layer (no source footage to replace)" };
        }

        // Import the new footage
        var newFile = new File(newFootagePath);
        if (!newFile.exists) {
            return { success: false, error: "New footage file not found: " + newFootagePath };
        }

        var importOptions = new ImportOptions(newFile);
        var newFootage = app.project.importFile(importOptions);

        // Get the old source
        var oldSource = layer.source;
        var oldSourceName = oldSource ? oldSource.name : "Unknown";

        // Replace the source
        layer.replaceSource(newFootage, false);

        // Optional: Remove old footage from project if it's not used elsewhere
        var isUsedElsewhere = false;
        if (oldSource) {
            // Check if old source is used in other comps/layers
            for (var c = 1; c <= app.project.numItems; c++) {
                var item = app.project.item(c);
                if (item instanceof CompItem) {
                    for (var l = 1; l <= item.numLayers; l++) {
                        var checkLayer = item.layer(l);
                        if (checkLayer instanceof AVLayer && checkLayer !== layer) {
                            if (checkLayer.source === oldSource) {
                                isUsedElsewhere = true;
                                break;
                            }
                        }
                    }
                    if (isUsedElsewhere) break;
                }
            }

            if (!isUsedElsewhere) {
                oldSource.remove();
            }
        }

        return {
            success: true,
            data: {
                layerName: layer.name,
                layerIndex: layer.index,
                oldFootage: oldSourceName,
                newFootage: newFootage.name,
                oldFootageRemoved: !isUsedElsewhere
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Get all project items (footage, compositions, etc.)
function getProjectItems() {
    try {
        var items = [];

        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            var itemInfo = {
                index: i,
                name: item.name,
                type: item instanceof CompItem ? "composition" :
                      item instanceof FootageItem ? "footage" :
                      item instanceof FolderItem ? "folder" : "other",
                id: item.id
            };

            // Add type-specific info
            if (item instanceof CompItem) {
                itemInfo.width = item.width;
                itemInfo.height = item.height;
                itemInfo.duration = item.duration;
                itemInfo.frameRate = item.frameRate;
                itemInfo.numLayers = item.numLayers;
            } else if (item instanceof FootageItem) {
                if (item.file) {
                    itemInfo.filePath = item.file.fsName;
                }
                itemInfo.width = item.width;
                itemInfo.height = item.height;
                itemInfo.duration = item.duration;
                itemInfo.frameRate = item.frameRate;
            } else if (item instanceof FolderItem) {
                itemInfo.numItems = item.numItems;
            }

            items.push(itemInfo);
        }

        return {
            success: true,
            data: {
                totalItems: app.project.numItems,
                items: items
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// Organize project items into folders
function organizeProject() {
    try {
        var folders = {};
        var movedCount = 0;

        // Create folders if they don't exist
        function getOrCreateFolder(name) {
            if (!folders[name]) {
                // Check if folder already exists
                for (var i = 1; i <= app.project.numItems; i++) {
                    var item = app.project.item(i);
                    if (item instanceof FolderItem && item.name === name) {
                        folders[name] = item;
                        return item;
                    }
                }
                // Create new folder
                folders[name] = app.project.items.addFolder(name);
            }
            return folders[name];
        }

        // Organize items
        for (var i = app.project.numItems; i >= 1; i--) {
            var item = app.project.item(i);

            // Skip folders and items already in folders
            if (item instanceof FolderItem || item.parentFolder !== app.project.rootFolder) {
                continue;
            }

            var targetFolder = null;

            if (item instanceof CompItem) {
                targetFolder = getOrCreateFolder("Compositions");
            } else if (item instanceof FootageItem) {
                // Further categorize footage
                if (item.mainSource instanceof SolidSource) {
                    targetFolder = getOrCreateFolder("Solids");
                } else if (item.file) {
                    var ext = item.file.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'psd', 'ai'].indexOf(ext) >= 0) {
                        targetFolder = getOrCreateFolder("Images");
                    } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].indexOf(ext) >= 0) {
                        targetFolder = getOrCreateFolder("Videos");
                    } else if (['mp3', 'wav', 'aac', 'ogg'].indexOf(ext) >= 0) {
                        targetFolder = getOrCreateFolder("Audio");
                    } else {
                        targetFolder = getOrCreateFolder("Other Assets");
                    }
                }
            }

            if (targetFolder) {
                item.parentFolder = targetFolder;
                movedCount++;
            }
        }

        return {
            success: true,
            data: {
                foldersCreated: Object.keys(folders).length,
                itemsMoved: movedCount,
                folders: Object.keys(folders)
            }
        };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}