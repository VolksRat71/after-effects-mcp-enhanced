// macOS-specific installer
import * as fs from "fs";
import * as path from "path";
import { FileOperations, CopyResult } from "../utils/fileOperations.js";
import { AfterEffectsPaths } from "../utils/pathResolver.js";

export class MacOSInstaller {
  /**
   * Installs the bridge script on macOS
   */
  static async install(source: string, aePaths: AfterEffectsPaths): Promise<boolean> {
    const destination = path.join(aePaths.scriptUIFolder, "mcp-bridge-auto.jsx");

    console.log(`Installing bridge script to ${destination}...`);

    // We should already have sudo privileges (checked in main)
    const result = FileOperations.copyFile(source, destination);

    if (result.success) {
      console.log("✅ File copied successfully with administrator privileges.");
      this.showPostInstallInstructions();
      return true;
    } else {
      console.error("\n❌ Installation failed:", result.error);
      console.log("\nThis usually means the destination directory requires higher privileges.");
      console.log("\nPlease try manual installation:");
      console.log(`  sudo cp "${source}" "${destination}"`);
      return false;
    }
  }

  /**
   * Shows post-installation instructions for macOS
   */
  private static showPostInstallInstructions(): void {
    console.log("\n✅ Bridge script installed successfully!\n");
    console.log("Important next steps:");
    console.log("1. Open After Effects");
    console.log("2. Go to After Effects > Settings > Scripting & Expressions");
    console.log('3. Enable "Allow Scripts to Write Files and Access Network"');
    console.log("4. Restart After Effects");
    console.log("5. Open the bridge panel: Window > mcp-bridge-auto.jsx");
    console.log("\nNote: On macOS, if you get permission errors when the script runs,");
    console.log("you may need to grant After Effects full disk access in System Settings.");
  }
}