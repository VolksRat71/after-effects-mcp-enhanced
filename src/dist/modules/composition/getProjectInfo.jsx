
// Get project information
// Used by tool: tools/base/runScript.ts (getProjectInfo command)
function getProjectInfo() {
    var project = app.project;
    var result = {
        projectName: project.file ? project.file.name : "Untitled Project",
        path: project.file ? project.file.fsName : "",
        numItems: project.numItems,
        bitsPerChannel: project.bitsPerChannel,
        frameRate: project.frameRate,
        dimensions: [project.width, project.height],
        duration: project.duration,
        items: []
    };

    var countByType = {
        compositions: 0,
        footage: 0,
        folders: 0,
        solids: 0
    };

    for (var i = 1; i <= Math.min(project.numItems, 50); i++) {
        var item = project.item(i);
        var itemType = "";

        if (item instanceof CompItem) {
            itemType = "Composition";
            countByType.compositions++;
        } else if (item instanceof FolderItem) {
            itemType = "Folder";
            countByType.folders++;
        } else if (item instanceof FootageItem) {
            if (item.mainSource instanceof SolidSource) {
                itemType = "Solid";
                countByType.solids++;
            } else {
                itemType = "Footage";
                countByType.footage++;
            }
        }

        result.items.push({
            id: item.id,
            name: item.name,
            type: itemType
        });
    }

    result.itemCounts = countByType;

    return JSON.stringify(result, null, 2);
}

// List all compositions in the project
function listCompositions() {
    var project = app.project;
    var result = {
        compositions: []
    };

    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);

        if (item instanceof CompItem) {
            result.compositions.push({
                id: item.id,
                name: item.name,
                duration: item.duration,
                frameRate: item.frameRate,
                width: item.width,
                height: item.height,
                numLayers: item.numLayers
            });
        }
    }

    return JSON.stringify(result, null, 2);
}

// Get layer information from active composition
function getLayerInfo() {
    var project = app.project;
    var result = {
        layers: []
    };

    var activeComp = null;
    if (app.project.activeItem instanceof CompItem) {
        activeComp = app.project.activeItem;
    } else {
        return JSON.stringify({ error: "No active composition" }, null, 2);
    }

    for (var i = 1; i <= activeComp.numLayers; i++) {
        var layer = activeComp.layer(i);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            enabled: layer.enabled,
            locked: layer.locked,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint
        };

        result.layers.push(layerInfo);
    }

    return JSON.stringify(result, null, 2);
}