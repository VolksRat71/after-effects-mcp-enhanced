import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export class ImageConverter {
  /**
   * Convert TIFF to PNG or JPEG, maintaining alpha channel for PNG
   * Note: Does NOT support PSD files (Sharp limitation)
   */
  async convertTiffToFormat(
    inputPath: string,
    targetFormat: 'png' | 'jpg' | 'jpeg'
  ): Promise<string> {
    const format = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const ext = inputPath.toLowerCase().substring(inputPath.lastIndexOf('.'));

    // Check for unsupported formats
    if (ext === '.psd') {
      throw new Error(`PSD format is not supported by Sharp. Please use TIFF or other image formats. File: ${inputPath}`);
    }

    const outputPath = inputPath.replace(/\.(tiff?|tif)$/i, `.${format}`);

    try {
      const pipeline = sharp(inputPath, { unlimited: true });

      if (format === 'jpg') {
        await pipeline.jpeg({ quality: 95 }).toFile(outputPath);
      } else {
        await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
      }

      await fs.unlink(inputPath);

      return outputPath;
    } catch (error) {
      console.error('Image conversion failed:', error);
      throw new Error(`Failed to convert ${inputPath}: ${error}`);
    }
  }

  /**
   * Process render result and convert if needed
   */
  async processRenderResult(result: any): Promise<any> {
    if (result.needsConversion && result.outputPath && result.targetFormat) {
      try {
        const convertedPath = await this.convertTiffToFormat(
          result.outputPath,
          result.targetFormat
        );

        return {
          ...result,
          outputPath: convertedPath,
          needsConversion: false,
          converted: true
        };
      } catch (error) {
        return {
          ...result,
          conversionError: error instanceof Error ? error.message : String(error),
          converted: false
        };
      }
    }

    return result;
  }
}