import chokidar from 'chokidar';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import colors from 'colors';

export class TiffConverterService {
  private watchers: Map<string, any> = new Map();
  private processingFiles: Set<string> = new Set();
  private fileStabilityTimeout: number = 2000; // Wait 2 seconds to ensure file is fully written

  constructor() {
    console.log(colors.green('[TIFF CONVERTER] Service initialized'));
  }

  /**
   * Start watching a directory for TIFF files
   */
  watchDirectory(dirPath: string, options: {
    deleteOriginal?: boolean;
    targetFormat?: 'png' | 'jpg';
  } = {}): void {
    // Don't watch the same directory twice
    if (this.watchers.has(dirPath)) {
      console.log(colors.yellow(`[TIFF CONVERTER] Already watching: ${dirPath}`));
      return;
    }

    const { deleteOriginal = false, targetFormat = 'png' } = options;

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    console.log(colors.cyan(`[TIFF CONVERTER] Starting to watch: ${dirPath}`));

    // Watch for both .tif and .tiff files
    const patterns = [
      path.join(dirPath, '*.tif'),
      path.join(dirPath, '*.tiff'),
      path.join(dirPath, '**/*.tif'),
      path.join(dirPath, '**/*.tiff')
    ];

    const watcher = chokidar.watch(patterns, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.fileStabilityTimeout,
        pollInterval: 100
      }
    });

    watcher
      .on('add', async (filePath) => {
        console.log(colors.blue(`[TIFF CONVERTER] TIFF detected: ${path.basename(filePath)}`));
        await this.convertTiff(filePath, targetFormat, deleteOriginal);
      })
      .on('change', async (filePath) => {
        // Handle case where file is rewritten
        if (!this.processingFiles.has(filePath)) {
          console.log(colors.blue(`[TIFF CONVERTER] TIFF changed: ${path.basename(filePath)}`));
          await this.convertTiff(filePath, targetFormat, deleteOriginal);
        }
      })
      .on('error', (error) => {
        console.error(colors.red('[TIFF CONVERTER] Watcher error:'), error);
      });

    this.watchers.set(dirPath, watcher);
  }

  /**
   * Stop watching a directory
   */
  stopWatching(dirPath: string): void {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dirPath);
      console.log(colors.yellow(`[TIFF CONVERTER] Stopped watching: ${dirPath}`));
    }
  }

  /**
   * Stop all watchers
   */
  stopAll(): void {
    for (const [dirPath, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(colors.yellow(`[TIFF CONVERTER] Stopped watching: ${dirPath}`));
    }
    this.watchers.clear();
  }

  /**
   * Convert a TIFF file to PNG/JPG
   */
  private async convertTiff(
    tiffPath: string,
    targetFormat: 'png' | 'jpg',
    deleteOriginal: boolean
  ): Promise<void> {
    // Skip if already processing
    if (this.processingFiles.has(tiffPath)) {
      return;
    }

    this.processingFiles.add(tiffPath);

    try {
      // Wait a bit more to ensure file is completely written
      await this.waitForFileStability(tiffPath);

      const dir = path.dirname(tiffPath);
      const baseName = path.basename(tiffPath, '.tif');
      const outputPath = path.join(dir, `${baseName}.${targetFormat}`);

      // Skip if output already exists
      if (fs.existsSync(outputPath)) {
        console.log(colors.yellow(`[TIFF CONVERTER] Output already exists: ${path.basename(outputPath)}`));
        this.processingFiles.delete(tiffPath);
        return;
      }

      console.log(colors.cyan(`[TIFF CONVERTER] Converting: ${path.basename(tiffPath)} -> ${path.basename(outputPath)}`));

      // Perform conversion
      if (targetFormat === 'png') {
        await sharp(tiffPath)
          .png({ quality: 95, compressionLevel: 9 })
          .toFile(outputPath);
      } else {
        await sharp(tiffPath)
          .jpeg({ quality: 90 })
          .toFile(outputPath);
      }

      console.log(colors.green(`[TIFF CONVERTER] ✓ Converted: ${path.basename(outputPath)}`));

      // Delete original TIFF if requested
      if (deleteOriginal) {
        try {
          fs.unlinkSync(tiffPath);
          console.log(colors.gray(`[TIFF CONVERTER] Deleted original: ${path.basename(tiffPath)}`));
        } catch (e) {
          console.error(colors.yellow(`[TIFF CONVERTER] Could not delete original: ${e}`));
        }
      }

    } catch (error) {
      console.error(colors.red(`[TIFF CONVERTER] Conversion failed for ${path.basename(tiffPath)}:`), error);
    } finally {
      this.processingFiles.delete(tiffPath);
    }
  }

  /**
   * Wait for file to be stable (no size changes)
   */
  private async waitForFileStability(filePath: string, maxWaitMs: number = 10000): Promise<void> {
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();
    let lastSize = -1;
    let stableCount = 0;
    const requiredStableChecks = 2; // File size must be stable for 2 checks

    return new Promise((resolve, reject) => {
      const checkFile = () => {
        if (Date.now() - startTime > maxWaitMs) {
          reject(new Error(`File stability timeout for ${filePath}`));
          return;
        }

        try {
          const stats = fs.statSync(filePath);
          const currentSize = stats.size;

          if (currentSize === lastSize) {
            stableCount++;
            if (stableCount >= requiredStableChecks) {
              resolve();
              return;
            }
          } else {
            stableCount = 0;
            lastSize = currentSize;
          }

          setTimeout(checkFile, checkInterval);
        } catch (error) {
          // File might have been deleted
          reject(error);
        }
      };

      checkFile();
    });
  }

  /**
   * Convert existing TIFF files in a directory and subdirectories
   */
  async convertExistingTiffs(
    dirPath: string,
    targetFormat: 'png' | 'jpg' = 'png',
    deleteOriginal: boolean = false
  ): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      console.log(colors.yellow(`[TIFF CONVERTER] Directory does not exist: ${dirPath}`));
      return;
    }

    // Get all TIFF files recursively
    const getAllTiffs = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);

      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
          results = results.concat(getAllTiffs(filePath));
        } else if (file.match(/\.tiff?$/i)) {
          results.push(filePath);
        }
      });

      return results;
    };

    const tiffFiles = getAllTiffs(dirPath);

    if (tiffFiles.length === 0) {
      console.log(colors.gray(`[TIFF CONVERTER] No TIFF files found in: ${dirPath}`));
      return;
    }

    console.log(colors.cyan(`[TIFF CONVERTER] Converting ${tiffFiles.length} existing TIFF files in: ${dirPath}`));

    for (const filePath of tiffFiles) {
      await this.convertTiff(filePath, targetFormat, deleteOriginal);
    }
  }
}

// Singleton instance
let converterInstance: TiffConverterService | null = null;

export function getTiffConverter(): TiffConverterService {
  if (!converterInstance) {
    converterInstance = new TiffConverterService();
  }
  return converterInstance;
}

export function initTiffConverter(): TiffConverterService {
  if (!converterInstance) {
    converterInstance = new TiffConverterService();
  }
  return converterInstance;
}