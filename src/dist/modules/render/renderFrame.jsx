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
        var basePath = outputPath.replace(/\.[^.]+$/, "");
        var sequencePath = basePath + "_[#####].tif";

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

        app.project.renderQueue.render();

        var paddedFrame = ("00000" + frameNumber).slice(-5);
        var actualOutputPath = basePath + "_" + paddedFrame + ".tif";

        var tiffFile = new File(actualOutputPath);
        if (!tiffFile.exists) {
            var folder = new Folder(tiffFile.parent.fsName);
            var baseNameOnly = tiffFile.name.replace(/_\d{5}\.tif$/, "");
            var files = folder.getFiles(baseNameOnly + "*.tif");

            if (files && files.length > 0) {
                actualOutputPath = files[0].fsName;
            } else {
                return JSON.stringify({
                    success: false,
                    error: "Render completed but TIFF file not found. Expected: " + actualOutputPath
                });
            }
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

        if (args.inline) {
            try {
                var inlineFile = new File(actualOutputPath);
                inlineFile.encoding = "BINARY";
                inlineFile.open("r");
                var fileData = inlineFile.read();
                inlineFile.close();

                var base64Data = "";
                var bytes = [];
                for (var i = 0; i < fileData.length; i++) {
                    bytes.push(fileData.charCodeAt(i));
                }

                var base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                for (var i = 0; i < bytes.length; i += 3) {
                    var b1 = bytes[i];
                    var b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
                    var b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

                    var enc1 = b1 >> 2;
                    var enc2 = ((b1 & 3) << 4) | (b2 >> 4);
                    var enc3 = ((b2 & 15) << 2) | (b3 >> 6);
                    var enc4 = b3 & 63;

                    if (i + 1 >= bytes.length) enc3 = 64;
                    if (i + 2 >= bytes.length) enc4 = 64;

                    base64Data += base64chars.charAt(enc1) + base64chars.charAt(enc2);
                    base64Data += (enc3 === 64 ? "=" : base64chars.charAt(enc3));
                    base64Data += (enc4 === 64 ? "=" : base64chars.charAt(enc4));
                }

                var mimeType = format === "jpg" ? "image/jpeg" : "image/png";
                result.inlineData = "data:" + mimeType + ";base64," + base64Data;
            } catch (e) {
                result.inlineWarning = "Could not encode inline data: " + e.toString();
            }
        }

        return JSON.stringify(result);

    } catch (error) {
        return JSON.stringify({
            success: false,
            error: error.toString(),
            line: error.line
        });
    }
}