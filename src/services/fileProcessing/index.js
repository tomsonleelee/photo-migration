// 檔案處理模組索引文件
// 提供統一的入口點和便利的匯出

// 主要組件
export { FileDownloadManager, createDownloadManager } from './FileDownloadManager.js';
export { ImageProcessor, createImageProcessor } from './ImageProcessor.js';
export { FileUploadManager, createUploadManager } from './FileUploadManager.js';
export { QueueManager, createQueueManager } from './QueueManager.js';
export { Logger, LogLevels, createLogger, getLogger, setLogger } from './Logger.js';

// 管線整合器
export { FileProcessingPipeline, createFileProcessingPipeline } from './FileProcessingPipeline.js';

// 便利函數
/**
 * 創建完整的檔案處理環境
 * @param {Object} options - 配置選項
 * @returns {Object} 包含所有組件的處理環境
 */
export function createFileProcessingEnvironment(options = {}) {
  const logger = createLogger('FileProcessingEnvironment', options.logger);
  
  const downloadManager = createDownloadManager({
    downloadDir: options.downloadDir || './temp/downloads',
    maxConcurrency: options.downloadConcurrency || 5,
    retryAttempts: options.retryAttempts || 3,
    ...options.download
  });

  const imageProcessor = createImageProcessor({
    outputDir: options.processedDir || './temp/processed',
    jpegQuality: options.jpegQuality || 85,
    webpQuality: options.webpQuality || 80,
    pngQuality: options.pngQuality || 9,
    ...options.processing
  });

  const uploadManager = createUploadManager({
    maxConcurrency: options.uploadConcurrency || 3,
    retryAttempts: options.retryAttempts || 3,
    chunkSize: options.chunkSize || 5 * 1024 * 1024, // 5MB
    ...options.upload
  });

  const queueManager = options.enableQueue !== false ? 
    createQueueManager({
      redis: options.redis,
      ...options.queue
    }) : null;

  const pipeline = createFileProcessingPipeline({
    tempDir: options.tempDir || './temp',
    outputDir: options.outputDir || './output',
    maxConcurrency: options.maxConcurrency || 3,
    retryAttempts: options.retryAttempts || 3,
    cleanupTemp: options.cleanupTemp !== false,
    enableQueue: options.enableQueue !== false,
    downloadManager,
    imageProcessor,
    uploadManager,
    queueManager,
    ...options.pipeline
  });

  return {
    logger,
    downloadManager,
    imageProcessor,
    uploadManager,
    queueManager,
    pipeline
  };
}

/**
 * 檔案處理工廠類
 * 提供靜態方法來創建各種處理器組件
 */
export class FileProcessingFactory {
  /**
   * 創建下載管理器
   */
  static createDownloader(options = {}) {
    return createDownloadManager(options);
  }

  /**
   * 創建圖片處理器
   */
  static createProcessor(options = {}) {
    return createImageProcessor(options);
  }

  /**
   * 創建上傳管理器
   */
  static createUploader(options = {}) {
    return createUploadManager(options);
  }

  /**
   * 創建佇列管理器
   */
  static createQueue(options = {}) {
    return createQueueManager(options);
  }

  /**
   * 創建完整的處理管線
   */
  static createPipeline(options = {}) {
    return createFileProcessingPipeline(options);
  }

  /**
   * 創建完整的處理環境
   */
  static createEnvironment(options = {}) {
    return createFileProcessingEnvironment(options);
  }
}

// 預設實例（延遲初始化）
let defaultEnvironment = null;

/**
 * 取得預設的檔案處理環境
 * @param {Object} options - 配置選項（僅在首次調用時使用）
 * @returns {Object} 預設處理環境
 */
export function getDefaultEnvironment(options = {}) {
  if (!defaultEnvironment) {
    defaultEnvironment = createFileProcessingEnvironment(options);
  }
  return defaultEnvironment;
}

/**
 * 重置預設環境
 */
export function resetDefaultEnvironment() {
  if (defaultEnvironment && defaultEnvironment.pipeline) {
    defaultEnvironment.pipeline.shutdown();
  }
  defaultEnvironment = null;
}

/**
 * 常用配置預設
 */
export const ConfigPresets = {
  // 開發環境配置
  development: {
    tempDir: './temp',
    outputDir: './output',
    maxConcurrency: 2,
    downloadConcurrency: 3,
    uploadConcurrency: 2,
    retryAttempts: 2,
    enableQueue: false,
    cleanupTemp: true,
    logger: {
      level: 'debug',
      logDir: './logs'
    }
  },

  // 生產環境配置
  production: {
    tempDir: '/tmp/photo-migration',
    outputDir: '/var/output/photo-migration',
    maxConcurrency: 5,
    downloadConcurrency: 10,
    uploadConcurrency: 5,
    retryAttempts: 3,
    enableQueue: true,
    cleanupTemp: true,
    logger: {
      level: 'info',
      logDir: '/var/log/photo-migration'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: process.env.REDIS_DB || 0
    }
  },

  // 高效能配置
  highPerformance: {
    tempDir: './temp',
    outputDir: './output',
    maxConcurrency: 10,
    downloadConcurrency: 20,
    uploadConcurrency: 10,
    retryAttempts: 3,
    enableQueue: true,
    cleanupTemp: true,
    chunkSize: 10 * 1024 * 1024, // 10MB
    processing: {
      jpegQuality: 90,
      webpQuality: 85
    }
  },

  // 低資源配置
  lowResource: {
    tempDir: './temp',
    outputDir: './output',
    maxConcurrency: 1,
    downloadConcurrency: 2,
    uploadConcurrency: 1,
    retryAttempts: 2,
    enableQueue: false,
    cleanupTemp: true,
    chunkSize: 1 * 1024 * 1024, // 1MB
    processing: {
      jpegQuality: 75,
      webpQuality: 70
    }
  }
};

/**
 * 使用預設配置創建環境
 * @param {string} preset - 預設名稱
 * @param {Object} overrides - 覆蓋選項
 * @returns {Object} 處理環境
 */
export function createEnvironmentWithPreset(preset, overrides = {}) {
  const config = ConfigPresets[preset];
  if (!config) {
    throw new Error(`未知的配置預設: ${preset}`);
  }

  return createFileProcessingEnvironment({
    ...config,
    ...overrides
  });
}

// 型別定義（用於 JSDoc）
/**
 * @typedef {Object} FileProcessingOptions
 * @property {string} [tempDir] - 暫存目錄
 * @property {string} [outputDir] - 輸出目錄
 * @property {number} [maxConcurrency] - 最大並發數
 * @property {number} [retryAttempts] - 重試次數
 * @property {boolean} [cleanupTemp] - 是否清理暫存檔案
 * @property {boolean} [enableQueue] - 是否啟用佇列
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {boolean} success - 是否成功
 * @property {string} [jobId] - 任務ID
 * @property {string} [sourceUrl] - 來源URL
 * @property {string} [targetPlatform] - 目標平台
 * @property {string} [error] - 錯誤訊息
 * @property {number} [duration] - 處理時間
 */

export default {
  FileDownloadManager,
  ImageProcessor,
  FileUploadManager,
  QueueManager,
  Logger,
  FileProcessingPipeline,
  FileProcessingFactory,
  createFileProcessingEnvironment,
  getDefaultEnvironment,
  resetDefaultEnvironment,
  ConfigPresets,
  createEnvironmentWithPreset
}; 