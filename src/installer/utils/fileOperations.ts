// File operation utilities for installer
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import colors from "colors";

export interface CopyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class FileOperations {
  /**
   * Creates directory if it doesn't exist
   */
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      console.log(colors.yellow(`[MCP INSTALLER] Creating directory: ${dirPath}`));
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Copies file with appropriate permissions
   */
  static copyFile(source: string, destination: string): CopyResult {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      this.ensureDirectory(destDir);

      // On macOS, use sudo cp command for system directories
      // On Windows, fs.copyFileSync works fine
      if (process.platform === "darwin") {
        execSync(`sudo cp "${source}" "${destination}"`, { stdio: "inherit" });
        execSync(`sudo chmod 644 "${destination}"`, { stdio: "inherit" });
      } else {
        fs.copyFileSync(source, destination);
        fs.chmodSync(destination, 0o644);
      }

      return {
        success: true,
        message: "File copied successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Checks if source file exists
   */
  static validateSourceFile(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
      console.error(colors.red(`[MCP INSTALLER] Error: Source script not found at ${sourcePath}`));
      console.error('Please run "npm run build" first to generate the script.');
      process.exit(1);
    }
  }

  /**
   * Gets file size in human readable format
   */
  static getFileSize(filePath: string): string {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  }
}
