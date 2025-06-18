import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * 圖片處理器
 * 提供圖片調整、格式轉換、優化等功能
 */
export class ImageProcessor {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './processed';
    this.quality = {
      jpeg: options.jpegQuality || 85,
      webp: options.webpQuality || 80,
      png: options.pngQuality || 9
    };
    
    // 預設尺寸
    this.presetSizes = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 400, height: 400 },
      medium: { width: 800, height: 600 },
      large: { width: 1200, height: 900 },
      xl: { width: 1920, height: 1080 }
    };

    // 支援的格式
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'bmp'];
    
    // 確保輸出目錄存在
    this._ensureDirectoryExists(this.outputDir);
  }

  /**
   * 處理單張圖片
   * @param {string} inputPath - 輸入檔案路徑
   * @param {Object} options - 處理選項
   * @returns {Promise<Object>} 處理結果
   */
  async processImage(inputPath, options = {}) {
    try {
      const metadata = await this._getImageMetadata(inputPath);
      const outputPath = this._generateOutputPath(inputPath, options);

      let processor = sharp(inputPath);

      // 套用處理選項
      processor = await this._applyProcessingOptions(processor, options, metadata);

      // 輸出處理後的圖片
      await processor.toFile(outputPath);

      // 取得處理後的檔案資訊
      const outputMetadata = await this._getImageMetadata(outputPath);
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        inputPath,
        outputPath,
        originalSize: metadata,
        processedSize: outputMetadata,
        fileSize: {
          original: metadata.size,
          processed: stats.size,
          reduction: ((metadata.size - stats.size) / metadata.size * 100).toFixed(2) + '%'
        },
        processing: options
      };

    } catch (error) {
      return {
        success: false,
        inputPath,
        error: error.message,
        processing: options
      };
    }
  }

  /**
   * 批量處理圖片
   * @param {Array} inputPaths - 輸入檔案路徑列表
   * @param {Object} options - 處理選項
   * @param {Function} progressCallback - 進度回調
   * @returns {Promise<Array>} 處理結果列表
   */
  async processImageBatch(inputPaths, options = {}, progressCallback) {
    const results = [];
    const total = inputPaths.length;
    let completed = 0;

    for (let i = 0; i < inputPaths.length; i++) {
      const inputPath = inputPaths[i];
      
      try {
        const result = await this.processImage(inputPath, {
          ...options,
          batchIndex: i
        });
        
        results.push(result);
        completed++;

        // 進度回調
        if (progressCallback) {
          progressCallback({
            completed,
            total,
            percentage: (completed / total * 100),
            currentFile: inputPath,
            result
          });
        }

      } catch (error) {
        results.push({
          success: false,
          inputPath,
          error: error.message,
          processing: options
        });
        completed++;
      }
    }

    return results;
  }

  /**
   * 調整圖片尺寸
   * @param {string} inputPath - 輸入檔案路徑
   * @param {Object} size - 尺寸配置 {width, height}
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 處理結果
   */
  async resizeImage(inputPath, size, options = {}) {
    const resizeOptions = {
      ...options,
      resize: {
        width: size.width,
        height: size.height,
        fit: options.fit || 'inside',
        withoutEnlargement: options.withoutEnlargement !== false
      }
    };

    return this.processImage(inputPath, resizeOptions);
  }

  /**
   * 轉換圖片格式
   * @param {string} inputPath - 輸入檔案路徑
   * @param {string} format - 目標格式
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 處理結果
   */
  async convertFormat(inputPath, format, options = {}) {
    if (!this.supportedFormats.includes(format.toLowerCase())) {
      throw new Error(`不支援的格式: ${format}`);
    }

    const convertOptions = {
      ...options,
      format: format.toLowerCase(),
      quality: options.quality || this.quality[format.toLowerCase()]
    };

    return this.processImage(inputPath, convertOptions);
  }

  /**
   * 生成縮圖
   * @param {string} inputPath - 輸入檔案路徑
   * @param {string} preset - 預設尺寸名稱
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 處理結果
   */
  async generateThumbnail(inputPath, preset = 'thumbnail', options = {}) {
    const size = this.presetSizes[preset];
    if (!size) {
      throw new Error(`未知的預設尺寸: ${preset}`);
    }

    return this.resizeImage(inputPath, size, {
      ...options,
      fit: 'cover',
      suffix: `_${preset}`
    });
  }

  /**
   * 優化圖片（減少檔案大小）
   * @param {string} inputPath - 輸入檔案路徑
   * @param {Object} options - 優化選項
   * @returns {Promise<Object>} 處理結果
   */
  async optimizeImage(inputPath, options = {}) {
    const optimizeOptions = {
      ...options,
      optimize: true,
      quality: options.quality || 80,
      progressive: options.progressive !== false,
      mozjpeg: options.mozjpeg !== false
    };

    return this.processImage(inputPath, optimizeOptions);
  }

  /**
   * 取得圖片資訊
   * @param {string} inputPath - 檔案路徑
   * @returns {Promise<Object>} 圖片元資料
   */
  async getImageInfo(inputPath) {
    try {
      const metadata = await this._getImageMetadata(inputPath);
      const stats = await fs.stat(inputPath);

      return {
        path: inputPath,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        fileSize: stats.size,
        isAnimated: metadata.pages > 1
      };
    } catch (error) {
      throw new Error(`無法讀取圖片資訊: ${error.message}`);
    }
  }

  /**
   * 驗證圖片檔案
   * @param {string} inputPath - 檔案路徑
   * @returns {Promise<boolean>} 是否為有效圖片
   */
  async validateImage(inputPath) {
    try {
      await sharp(inputPath).metadata();
      return true;
    } catch {
      return false;
    }
  }

  // 私有方法

  /**
   * 取得圖片元資料
   * @private
   */
  async _getImageMetadata(imagePath) {
    return await sharp(imagePath).metadata();
  }

  /**
   * 生成輸出路徑
   * @private
   */
  _generateOutputPath(inputPath, options) {
    const parsedPath = path.parse(inputPath);
    const suffix = options.suffix || '';
    const format = options.format || parsedPath.ext.substring(1);
    
    const outputFilename = `${parsedPath.name}${suffix}.${format}`;
    
    if (options.outputDir) {
      return path.join(options.outputDir, outputFilename);
    }
    
    return path.join(this.outputDir, outputFilename);
  }

  /**
   * 套用處理選項
   * @private
   */
  async _applyProcessingOptions(processor, options, metadata) {
    // 調整尺寸
    if (options.resize) {
      processor = processor.resize(options.resize);
    }

    // 旋轉
    if (options.rotate) {
      processor = processor.rotate(options.rotate);
    }

    // 翻轉
    if (options.flip) {
      processor = processor.flip();
    }

    // 鏡像
    if (options.flop) {
      processor = processor.flop();
    }

    // 灰階
    if (options.grayscale) {
      processor = processor.grayscale();
    }

    // 模糊
    if (options.blur) {
      processor = processor.blur(options.blur);
    }

    // 銳化
    if (options.sharpen) {
      processor = processor.sharpen();
    }

    // 格式和品質設定
    if (options.format) {
      switch (options.format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          processor = processor.jpeg({
            quality: options.quality || this.quality.jpeg,
            progressive: options.progressive !== false,
            mozjpeg: options.mozjpeg !== false
          });
          break;
        case 'png':
          processor = processor.png({
            quality: options.quality || this.quality.png,
            progressive: options.progressive !== false
          });
          break;
        case 'webp':
          processor = processor.webp({
            quality: options.quality || this.quality.webp
          });
          break;
        default:
          processor = processor.toFormat(options.format);
      }
    }

    return processor;
  }

  /**
   * 確保目錄存在
   * @private
   */
  async _ensureDirectoryExists(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

/**
 * 建立圖片處理器實例的工廠函數
 * @param {Object} options - 配置選項
 * @returns {ImageProcessor} 圖片處理器實例
 */
export function createImageProcessor(options = {}) {
  return new ImageProcessor(options);
}

export default ImageProcessor; 