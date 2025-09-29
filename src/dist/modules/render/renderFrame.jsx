function renderFrame(args) {
    try {
        var compName = args.comp;
        var outputPath = args.outputPath;
        var format = args.format || "png";
        var time = args.time;
        var frame = args.frame;

        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) instanceof CompItem && app.project.item(i).name === compName) {
                comp = app.project.item(i);
                break;
            }
        }

        if (!comp) {
            return JSON.stringify({
                success: false,
                error: "Composition '" + compName + "' not found"
            });
        }

        var renderTime;
        if (time !== undefined && time !== null) {
            renderTime = time;
        } else if (frame !== undefined && frame !== null) {
            renderTime = frame / comp.frameRate;
        } else {
            renderTime = comp.time;
        }

        if (renderTime < 0 || renderTime > comp.duration) {
            return JSON.stringify({
                success: false,
                error: "Time " + renderTime + "s is out of composition range (0-" + comp.duration + "s)"
            });
        }

        var frameNumber = Math.floor(renderTime * comp.frameRate);
        // Use sequence pattern for TIFF rendering
        var basePath = outputPath.replace(/\.[^.]+$/, "");
        var sequencePath = basePath + "_[#####].tif";

        for (var i = app.project.renderQueue.numItems; i >= 1; i--) {
            var item = app.project.renderQueue.item(i);
            if (item.comment && item.comment.indexOf("[MCP]") === 0) {
                item.remove();
            }
        }

        var rqItem = app.project.renderQueue.items.add(comp);

        try {
            rqItem.applyTemplate("Best Settings");
        } catch (e) {}

        rqItem.timeSpanStart = renderTime;
        rqItem.timeSpanDuration = 1 / comp.frameRate;

        var outputModule = rqItem.outputModule(1);

        try {
            outputModule.applyTemplate("TIFF Sequence with Alpha");
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "Could not apply TIFF Sequence with Alpha template: " + e.toString()
            });
        }

        outputModule.file = new File(sequencePath);

        // Set comment after all settings are applied
        rqItem.comment = "[MCP] Render Frame";

        app.project.renderQueue.render();

        // Calculate the actual output path with padded frame number
        var paddedFrame = ("00000" + frameNumber).slice(-5);
        var actualOutputPath = basePath + "_" + paddedFrame + ".tif";

        var tiffFile = new File(actualOutputPath);
        if (!tiffFile.exists) {
            return JSON.stringify({
                success: false,
                error: "Render completed but TIFF file not found. Expected: " + actualOutputPath
            });
        }

        var result = {
            success: true,
            comp: compName,
            frame: frameNumber,
            time: renderTime,
            width: comp.width,
            height: comp.height,
            outputPath: actualOutputPath,
            needsConversion: true,
            targetFormat: format
        };

        return JSON.stringify(result);

    } catch (error) {
        return JSON.stringify({
            success: false,
            error: error.toString(),
            line: error.line
        });
    }
}