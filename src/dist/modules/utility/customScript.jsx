
// Function to execute custom ExtendScript
// Used by tool: tools/utility/runCustomScript.ts
function executeCustomScript(args) {
    try {
        if (!args.scriptPath) {
            return JSON.stringify({
                error: "No script path provided",
                success: false
            });
        }

        var scriptFile = new File(args.scriptPath);

        if (!scriptFile.exists) {
            return JSON.stringify({
                error: "Script file not found: " + args.scriptPath,
                success: false
            });
        }

        scriptFile.open("r");
        var scriptContent = scriptFile.read();
        scriptFile.close();

        var result;
        try {
            result = eval(scriptContent);

            if (typeof result === "object") {
                return JSON.stringify({
                    success: true,
                    result: result,
                    message: "Custom script executed successfully"
                });
            } else if (typeof result === "string") {
                try {
                    JSON.parse(result);
                    return result;
                } catch (e) {
                    return JSON.stringify({
                        success: true,
                        result: result,
                        message: "Custom script executed successfully"
                    });
                }
            } else {
                return JSON.stringify({
                    success: true,
                    result: String(result),
                    message: "Custom script executed successfully"
                });
            }
        } catch (execError) {
            return JSON.stringify({
                success: false,
                error: execError.toString(),
                line: execError.line || "unknown",
                message: "Error executing custom script"
            });
        }
    } catch (error) {
        return JSON.stringify({
            success: false,
            error: error.toString(),
            message: "Error in executeCustomScript"
        });
    }
}