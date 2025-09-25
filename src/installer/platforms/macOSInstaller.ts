// macOS-specific installer
import * as path from "path";
import colors from "colors";
import { FileOperations, CopyResult } from "../utils/fileOperations.js";
import { AfterEffectsPaths } from "../utils/pathResolver.js";

export class MacOSInstaller {
  /**
   * Installs the bridge script on macOS
   */
  static async install(source: string, aePaths: AfterEffectsPaths): Promise<boolean> {
    const destination = path.join(aePaths.scriptUIFolder, "mcp-bridge-auto.jsx");

    console.log(colors.yellow(`[MCP INSTALLER] Installing bridge script to ${destination}...`));

    // We should already have sudo privileges (checked in main)
    const result = FileOperations.copyFile(source, destination);

    if (result.success) {
      console.log(colors.green("[MCP INSTALLER] ✅ File copied successfully with administrator privileges."));
      this.showPostInstallInstructions();
      return true;
    } else {
      console.error(colors.red(`[MCP INSTALLER] ❌ Installation failed: ${result.error}`));
      console.log(colors.yellow("\nThis usually means the destination directory requires higher privileges."));
      console.log("\nPlease try manual installation:");
      console.log(colors.yellow(`  sudo cp "${source}" "${destination}"`));
      return false;
    }
  }

  /**
   * Shows post-installation instructions for macOS
   */
  private static showPostInstallInstructions(): void {
    console.log(colors.green("[MCP INSTALLER] ✅ Bridge script installed successfully!\n"));
    console.log(colors.yellow("Important next steps:"));
    console.log(colors.yellow("1. Open After Effects"));
    console.log(colors.yellow("2. Go to After Effects > Settings > Scripting & Expressions"));
    console.log(colors.yellow('3. Enable "Allow Scripts to Write Files and Access Network"'));
    console.log(colors.yellow("4. Restart After Effects"));
    console.log(colors.yellow("5. Open the bridge panel: Window > mcp-bridge-auto.jsx"));
    console.log(colors.yellow("\nNote: On macOS, if you get permission errors when the script runs,"));
    console.log(colors.yellow("you may need to grant After Effects full disk access in System Settings."));
  }
}
