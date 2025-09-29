import * as fs from 'fs';
import * as path from 'path';
import colors from 'colors';
import { getTempFilePath } from '../utils/resolvePaths.js';

/**
 * FileManager handles all file operations for the MCP server
 * including temporary files, command files, and result files
 */
export class FileManager {
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }

  /**
   * Cleanup old files and directories from previous sessions
   */
  cleanupOldJSXFiles(): void {
    try {
      if (!fs.existsSync(this.tempDir)) return;

      // Also check build/temp directory for rendered files
      const buildTempDir = path.join(process.cwd(), 'build', 'temp');
      const dirsToClean = [this.tempDir];

      if (fs.existsSync(buildTempDir)) {
        dirsToClean.push(buildTempDir);
      }

      const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds
      let cleanedFiles = 0;
      let cleanedDirs = 0;

      dirsToClean.forEach(dir => {
        const items = fs.readdirSync(dir);

        items.forEach(item => {
          const itemPath = path.join(dir, item);

          // Clean old JSX files, images, and session directories
          const shouldClean = item.endsWith('.jsx') ||
                             item.endsWith('.tif') ||
                             item.endsWith('.png') ||
                             item.endsWith('.jpg') ||
                             item.startsWith('session_') ||
                             item.startsWith('frame_');

          if (shouldClean) {
            try {
              const stats = fs.statSync(itemPath);

              if (stats.mtimeMs < oneHourAgo) {
                if (stats.isDirectory()) {
                  // Recursively remove old session directories
                  fs.rmSync(itemPath, { recursive: true, force: true });
                  cleanedDirs++;
                  console.log(colors.green(`[MCP FILEMANAGER] Cleaned old session directory: ${item}`));
                } else {
                  fs.unlinkSync(itemPath);
                  cleanedFiles++;
                  console.log(colors.green(`[MCP FILEMANAGER] Cleaned old file: ${item}`));
                }
              }
            } catch (e) {
              // File might be locked or already deleted
              console.error(colors.yellow(`[MCP FILEMANAGER] Could not clean ${item}:`), e);
            }
          }
        });
      });

      if (cleanedFiles > 0 || cleanedDirs > 0) {
        console.log(colors.green(`[MCP FILEMANAGER] Cleaned ${cleanedFiles} files and ${cleanedDirs} directories from previous sessions`));
      }
    } catch (error) {
      console.error(colors.red('[MCP FILEMANAGER] Error during cleanup:'), error);
    }
  }

  /**
   * Schedule a file or directory for cleanup after a delay
   */
  scheduleFileCleanup(filePath: string, delayMs: number = 3600000): void {
    // Schedule cleanup after 1 hour (default)
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(colors.green(`[MCP FILEMANAGER] Cleaned up temp directory: ${path.basename(filePath)}`));
          } else {
            fs.unlinkSync(filePath);
            console.log(colors.green(`[MCP FILEMANAGER] Cleaned up temp file: ${path.basename(filePath)}`));
          }
        }
      } catch (e) {
        // File might be in use or already deleted
        console.error(colors.yellow(`[MCP FILEMANAGER] Could not clean up ${path.basename(filePath)}:`), e);
      }
    }, delayMs);
  }

  /**
   * Clear the results file to avoid stale cache
   */
  clearResultsFile(): void {
    try {
      const resultFile = getTempFilePath('ae_mcp_result.json');

      // Write a placeholder message to indicate the file is being reset
      const resetData = {
        status: "waiting",
        message: "Waiting for new result from After Effects...",
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(resultFile, JSON.stringify(resetData, null, 2));
      console.log(colors.blue(`[MCP FILEMANAGER] Results file cleared at ${resultFile}`));
    } catch (error) {
      console.error(colors.red('[MCP FILEMANAGER] Error clearing results file:'), error);
    }
  }

  /**
   * Read results from After Effects temp file
   */
  readResultsFromTempFile(): string {
    try {
      const tempFilePath = getTempFilePath('ae_mcp_result.json');

      // Add debugging info
      console.log(colors.cyan(`[MCP FILEMANAGER] Checking for results at: ${tempFilePath}`));

      if (fs.existsSync(tempFilePath)) {
        // Get file stats to check modification time
        const stats = fs.statSync(tempFilePath);
        console.log(colors.cyan(`[MCP FILEMANAGER] Result file exists, last modified: ${stats.mtime.toISOString()}`));

        const content = fs.readFileSync(tempFilePath, 'utf8');
        console.log(colors.cyan(`[MCP FILEMANAGER] Result file content length: ${content.length} bytes`));

        // If the result file is older than 30 seconds, warn the user
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        if (stats.mtime < thirtySecondsAgo) {
          console.log(colors.yellow(`[MCP FILEMANAGER] WARNING: Result file is older than 30 seconds. After Effects may not be updating results.`));
          return JSON.stringify({
            warning: "Result file appears to be stale (not recently updated).",
            message: "This could indicate After Effects is not properly writing results or the MCP Bridge Auto panel isn't running.",
            lastModified: stats.mtime.toISOString(),
            originalContent: content
          });
        }

        return content;
      } else {
        console.log(colors.yellow(`[MCP FILEMANAGER] Result file not found at: ${tempFilePath}`));
        return JSON.stringify({ error: "No results file found. Please run a script in After Effects first." });
      }
    } catch (error) {
      console.error(colors.red('[MCP FILEMANAGER] Error reading results file:'), error);
      return JSON.stringify({ error: `Failed to read results: ${String(error)}` });
    }
  }

  /**
   * Write command to file for After Effects to pick up
   */
  writeCommandFile(command: string, args: Record<string, any> = {}): void {
    try {
      const commandFile = getTempFilePath('ae_command.json');
      const commandData = {
        command,
        args,
        timestamp: new Date().toISOString(),
        status: "pending"  // pending, running, completed, error
      };
      fs.writeFileSync(commandFile, JSON.stringify(commandData, null, 2));
      console.log(colors.cyan(`[MCP FILEMANAGER] Command file written: ${command}`));
      console.log(colors.cyan(`[MCP FILEMANAGER] Command args: ${JSON.stringify(args).substring(0, 200)}${JSON.stringify(args).length > 200 ? '...' : ''}`));
    } catch (error) {
      console.error(colors.red('[MCP FILEMANAGER] Error writing command file:'), error);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Update command file status
   */
  updateCommandStatus(status: string): void {
    try {
      const commandFile = getTempFilePath('ae_command.json');
      if (fs.existsSync(commandFile)) {
        const content = fs.readFileSync(commandFile, 'utf8');
        if (content) {
          const commandData = JSON.parse(content);
          commandData.status = status;

          fs.writeFileSync(commandFile, JSON.stringify(commandData, null, 2));
          console.log(colors.green(`[MCP FILEMANAGER] Command status updated to: ${status}`));
        }
      }
    } catch (e) {
      console.error(colors.red('[MCP FILEMANAGER] Error updating command status:'), e);
    }
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(colors.green(`[MCP FILEMANAGER] Created temp directory: ${this.tempDir}`));
    }
  }

}

// Export a singleton instance
let fileManagerInstance: FileManager | null = null;

export function initFileManager(tempDir: string): FileManager {
  if (!fileManagerInstance) {
    fileManagerInstance = new FileManager(tempDir);
  }
  return fileManagerInstance;
}

export function getFileManager(): FileManager {
  if (!fileManagerInstance) {
    throw new Error('FileManager not initialized. Call initFileManager first.');
  }
  return fileManagerInstance;
}
