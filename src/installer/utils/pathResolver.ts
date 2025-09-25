// After Effects path resolution utilities
import * as fs from "fs";
import * as path from "path";

export interface AfterEffectsPaths {
  appPath: string;
  scriptsFolder: string;
  scriptUIFolder: string;
}

export class PathResolver {
  /**
   * Resolves After Effects installation paths based on the operating system
   */
  static resolve(): AfterEffectsPaths | null {
    const platform = process.platform;

    if (platform === "win32") {
      return this.resolveWindows();
    } else if (platform === "darwin") {
      return this.resolveMacOS();
    } else {
      throw new Error(`Unsupported platform: ${platform}. Only Windows and macOS are supported.`);
    }
  }

  /**
   * Resolves After Effects paths on Windows
   */
  private static resolveWindows(): AfterEffectsPaths | null {
    const possiblePaths = [
      "C:\\Program Files\\Adobe\\Adobe After Effects 2025",
      "C:\\Program Files\\Adobe\\Adobe After Effects 2024",
      "C:\\Program Files\\Adobe\\Adobe After Effects 2023",
      "C:\\Program Files\\Adobe\\Adobe After Effects 2022",
      "C:\\Program Files\\Adobe\\Adobe After Effects 2021",
      "C:\\Program Files\\Adobe\\Adobe After Effects 2020",
      "C:\\Program Files (x86)\\Adobe\\Adobe After Effects CS6",
      "C:\\Program Files (x86)\\Adobe\\Adobe After Effects CC",
    ];

    for (const aePath of possiblePaths) {
      const exePath = path.join(aePath, "Support Files", "AfterFX.exe");
      if (fs.existsSync(exePath)) {
        return {
          appPath: aePath,
          scriptsFolder: path.join(aePath, "Support Files", "Scripts"),
          scriptUIFolder: path.join(aePath, "Support Files", "Scripts", "ScriptUI Panels"),
        };
      }
    }

    // Check environment variable
    const adobePath = process.env.ADOBE_AFTER_EFFECTS_PATH;
    if (adobePath && fs.existsSync(path.join(adobePath, "Support Files", "AfterFX.exe"))) {
      return {
        appPath: adobePath,
        scriptsFolder: path.join(adobePath, "Support Files", "Scripts"),
        scriptUIFolder: path.join(adobePath, "Support Files", "Scripts", "ScriptUI Panels"),
      };
    }

    return null;
  }

  /**
   * Resolves After Effects paths on macOS
   */
  private static resolveMacOS(): AfterEffectsPaths | null {
    // On macOS, scripts should be installed in the application's Scripts folder
    // not the user's Documents folder for better reliability

    // Try standard application locations
    const possibleAppPaths = [
      "/Applications/Adobe After Effects 2025",
      "/Applications/Adobe After Effects 2024",
      "/Applications/Adobe After Effects 2023",
      "/Applications/Adobe After Effects 2022",
      "/Applications/Adobe After Effects 2021",
      "/Applications/Adobe After Effects 2020",
    ];

    for (const appPath of possibleAppPaths) {
      // Check if the app directory exists (not the .app bundle)
      if (fs.existsSync(appPath)) {
        // Check for Scripts folder in the application directory
        const scriptsFolder = path.join(appPath, "Scripts");
        const scriptUIFolder = path.join(scriptsFolder, "ScriptUI Panels");

        if (fs.existsSync(scriptsFolder)) {
          return {
            appPath: appPath,
            scriptsFolder: scriptsFolder,
            scriptUIFolder: scriptUIFolder,
          };
        }
      }
    }

    return null;
  }

  /**
   * Formats error message when After Effects is not found
   */
  static getNotFoundMessage(): string {
    const platform = process.platform;
    let message = "Error: Could not find After Effects installation.\n";
    message += "\nPlease ensure After Effects is installed, or set the ADOBE_AFTER_EFFECTS_PATH environment variable.";

    if (platform === "darwin") {
      message += "\n\nOn macOS, make sure you have run After Effects at least once to create the Scripts folder.";
      message += "\nExpected location: /Applications/Adobe After Effects [VERSION]/Scripts/";
    } else {
      message += "\n\nExpected locations:";
      message += "\n  C:\\Program Files\\Adobe\\Adobe After Effects [VERSION]\\";
    }

    return message;
  }
}