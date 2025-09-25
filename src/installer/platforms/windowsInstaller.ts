// Windows-specific installer
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { FileOperations } from "../utils/fileOperations.js";
import { AfterEffectsPaths } from "../utils/pathResolver.js";

export class WindowsInstaller {
  /**
   * Installs the bridge script on Windows
   */
  static async install(source: string, aePaths: AfterEffectsPaths): Promise<boolean> {
    const destination = path.join(aePaths.scriptUIFolder, "mcp-bridge-auto.jsx");

    console.log(`Installing bridge script to ${destination}...`);

    // Try PowerShell with elevated privileges first
    const elevated = this.tryElevatedCopy(source, destination);

    if (elevated) {
      this.showPostInstallInstructions();
      return true;
    }

    // Fallback to regular copy
    console.log("Admin elevation cancelled or failed, trying regular copy...");
    const result = FileOperations.copyFile(source, destination);

    if (result.success) {
      console.log("✅ File copied successfully.");
      this.showPostInstallInstructions();
      return true;
    } else {
      console.error("\n❌ Installation failed:", result.error);
      console.log("\nPlease try manual installation:");
      console.log(`1. Copy: ${source}`);
      console.log(`2. To: ${destination}`);
      console.log("3. You may need to run as administrator or use File Explorer with admin rights");
      return false;
    }
  }

  /**
   * Attempts to copy with elevated privileges using PowerShell
   */
  private static tryElevatedCopy(source: string, destination: string): boolean {
    try {
      const command = `
        Start-Process PowerShell -Verb RunAs -ArgumentList "-Command Copy-Item -Path '${source.replace(
          /\\/g,
          "\\\\"
        )}' -Destination '${destination.replace(/\\/g, "\\\\")}' -Force"
      `;

      execSync(`powershell -Command "${command}"`, { stdio: "inherit" });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Shows post-installation instructions for Windows
   */
  private static showPostInstallInstructions(): void {
    console.log("\n✅ Bridge script installed successfully!\n");
    console.log("Important next steps:");
    console.log("1. Open After Effects");
    console.log("2. Go to Edit > Preferences > Scripting & Expressions");
    console.log('3. Enable "Allow Scripts to Write Files and Access Network"');
    console.log("4. Restart After Effects");
    console.log("5. Open the bridge panel: Window > mcp-bridge-auto.jsx");
  }
}