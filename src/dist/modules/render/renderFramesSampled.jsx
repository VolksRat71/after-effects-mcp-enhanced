function renderFramesSampled(args) {
    try {
        var compName = args.comp;
        var startTime = args.startTime;
        var endTime = args.endTime;
        var sessionDir = args.sessionDir;
        var outputPrefix = args.outputPrefix;
        var format = args.format || "png";
        var maxFrames = args.maxFrames || 100;
        var sampleCount = args.sampleCount;
        var sampleFps = args.sampleFps;
        var frameStep = args.frameStep;

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

        if (startTime < 0 || endTime > comp.duration) {
            return JSON.stringify({
                success: false,
                error: "Time range (" + startTime + "s - " + endTime + "s) is out of composition range (0-" + comp.duration + "s)"
            });
        }

        var times = [];
        var samplingMode = "";

        if (sampleCount !== undefined && sampleCount !== null) {
            samplingMode = "sampleCount";
            if (sampleCount <= 1) {
                times.push(startTime);
            } else {
                for (var i = 0; i < sampleCount; i++) {
                    var t = startTime + (i * (endTime - startTime) / (sampleCount - 1));
                    times.push(t);
                }
            }
        } else if (sampleFps !== undefined && sampleFps !== null) {
            samplingMode = "sampleFps";
            var interval = 1 / sampleFps;
            for (var t = startTime; t <= endTime; t += interval) {
                times.push(t);
            }
            if (times[times.length - 1] < endTime) {
                times.push(endTime);
            }
        } else if (frameStep !== undefined && frameStep !== null) {
            samplingMode = "frameStep";
            var startFrame = Math.floor(startTime * comp.frameRate);
            var endFrame = Math.floor(endTime * comp.frameRate);
            for (var f = startFrame; f <= endFrame; f += frameStep) {
                times.push(f / comp.frameRate);
            }
        } else {
            samplingMode = "default";
            sampleCount = 5;
            if (sampleCount <= 1) {
                times.push(startTime);
            } else {
                for (var i = 0; i < sampleCount; i++) {
                    var t = startTime + (i * (endTime - startTime) / (sampleCount - 1));
                    times.push(t);
                }
            }
        }

        var uniqueTimes = {};
        var dedupedTimes = [];
        for (var i = 0; i < times.length; i++) {
            var key = times[i].toFixed(5);
            if (!uniqueTimes[key]) {
                uniqueTimes[key] = true;
                dedupedTimes.push(parseFloat(key));
            }
        }
        times = dedupedTimes;

        var warning = null;
        if (times.length > maxFrames) {
            warning = "Requested " + times.length + " frames, truncated to maxFrames=" + maxFrames;
            times = times.slice(0, maxFrames);
        }

        var frames = [];

        for (var i = 0; i < times.length; i++) {
            var renderTime = times[i];
            var frameNumber = Math.floor(renderTime * comp.frameRate);
            var outputFile = outputPrefix + "_" + frameNumber + "." + format;
            var outputPath = sessionDir + "/" + outputFile;

            var rqItem = app.project.renderQueue.items.add(comp);
            rqItem.timeSpanStart = renderTime;
            rqItem.timeSpanDuration = 1 / comp.frameRate;

            var outputModule = rqItem.outputModule(1);

            var fileNameWithoutExt = outputPath.substring(0, outputPath.lastIndexOf("."));
            var sequencePath = fileNameWithoutExt + "[#####]." + format;

            if (format === "jpg") {
                try {
                    outputModule.applyTemplate("JPEG Sequence");
                } catch (e) {
                }
            } else {
                try {
                    outputModule.applyTemplate("PNG Sequence");
                } catch (e) {
                }
            }

            outputModule.file = new File(sequencePath);

            var paddedFrame = ("00000" + frameNumber).slice(-5);
            var actualOutputPath = fileNameWithoutExt + paddedFrame + "." + format;

            frames.push({
                index: i,
                time: renderTime,
                frameNumber: frameNumber,
                outputPath: actualOutputPath
            });
        }

        app.project.renderQueue.render();

        for (var i = 0; i < frames.length; i++) {
            var file = new File(frames[i].outputPath);
            if (!file.exists) {
                return JSON.stringify({
                    success: false,
                    error: "Frame " + i + " was not rendered to " + frames[i].outputPath
                });
            }
        }

        var result = {
            success: true,
            comp: compName,
            samplingMode: samplingMode,
            framesRendered: frames.length,
            sessionDir: sessionDir,
            frames: frames
        };

        if (warning) {
            result.warning = warning;
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