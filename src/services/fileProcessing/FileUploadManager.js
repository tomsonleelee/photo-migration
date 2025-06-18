import fs from 'fs/promises';
import path from 'path';
import { PhotoApiService } from '../api/PhotoApiService.js';
import { createNormalizedPhoto } from '../api/types.js';

/**
 * 檔案上傳管理器
 * 提供多平台檔案上傳、批量處理、進度追蹤等功能
 */
export class FileUploadManager {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 3;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB
    
    // API 服務實例
    this.apiService = options.apiService || new PhotoApiService();
    
    // 並行控制
    this.activeUploads = new Set();
    this.uploadQueue = [];
    this.progressCallbacks = new Map();
    
    // 統計資訊
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      bytes: 0,
      totalBytes: 0
    };

    // 支援的檔案類型
    this.supportedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/tiff',
      'image/bmp'
    ];
  }

  /**
   * 上傳單個檔案到指定平台
   * @param {string} filePath - 檔案路徑
   * @param {string} platform - 目標平台
   * @param {Object} options - 上傳選項
   * @returns {Promise<Object>} 上傳結果
   */
  async uploadFile(filePath, platform, options = {}) {
    const retryCount = options.retryCount || 0;
    const uploadId = this._generateUploadId(filePath, platform);

    try {
      // 驗證檔案
      await this._validateFile(filePath);

      // 取得檔案資訊
      const fileStats = await fs.stat(filePath);
      const fileBuffer = await fs.readFile(filePath);
      
      // 準備上傳資料
      const uploadData = {
        buffer: fileBuffer,
        filename: options.filename || path.basename(filePath),
        mimeType: options.mimeType || this._getMimeType(filePath),
        description: options.description || '',
        albumId: options.albumId,
        tags: options.tags || [],
        metadata: options.metadata || {}
      };

      // 設置進度追蹤
      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback({
          uploadId,
          filePath,
          platform,
          stage: 'uploading',
          loaded: 0,
          total: fileStats.size,
          percentage: 0
        });
      }

      // 執行上傳
      const result = await this.apiService.uploadPhoto(platform, uploadData);

      // 更新統計
      this.stats.completed++;
      this.stats.bytes += fileStats.size;

      // 最終進度回調
      if (progressCallback) {
        progressCallback({
          uploadId,
          filePath,
          platform,
          stage: 'completed',
          loaded: fileStats.size,
          total: fileStats.size,
          percentage: 100,
          result
        });
      }

      return {
        success: true,
        uploadId,
        filePath,
        platform,
        fileSize: fileStats.size,
        uploadedPhoto: result,
        metadata: uploadData.metadata
      };

    } catch (error) {
      // 重試機制
      if (retryCount < this.retryAttempts) {
        await this._delay(this.retryDelay * Math.pow(2, retryCount));
        return this.uploadFile(filePath, platform, {
          ...options,
          retryCount: retryCount + 1
        });
      }

      // 記錄失敗
      this.stats.failed++;
      
      const progressCallback = this.progressCallbacks.get(uploadId);
      if (progressCallback) {
        progressCallback({
          uploadId,
          filePath,
          platform,
          stage: 'failed',
          error: error.message
        });
      }

      throw new Error(`上傳失敗: ${filePath} 到 ${platform} - ${error.message}`);
    }
  }

  /**
   * 批量上傳檔案
   * @param {Array} uploads - 上傳任務列表 [{filePath, platform, options}]
   * @param {Function} progressCallback - 全域進度回調
   * @returns {Promise<Array>} 上傳結果列表
   */
  async uploadBatch(uploads, progressCallback) {
    this.stats.total = uploads.length;
    this.stats.completed = 0;
    this.stats.failed = 0;
    this.stats.bytes = 0;
    
    // 計算總檔案大小
    this.stats.totalBytes = await this._calculateTotalSize(uploads);

    const results = [];
    const promises = [];

    for (let i = 0; i < uploads.length; i++) {
      // 等待可用的上傳槽位
      while (this.activeUploads.size >= this.maxConcurrency) {
        await this._waitForSlot();
      }

      const upload = uploads[i];
      const promise = this._executeUpload(upload, i, progressCallback);
      promises.push(promise);
      this.activeUploads.add(promise);

      // 清理完成的上傳
      promise.finally(() => {
        this.activeUploads.delete(promise);
      });
    }

    // 等待所有上傳完成
    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[index] = {
          success: true,
          ...result.value,
          upload: uploads[index]
        };
      } else {
        results[index] = {
          success: false,
          error: result.reason.message,
          upload: uploads[index]
        };
      }
    });

    return results;
  }

  /**
   * 多平台同步上傳
   * @param {string} filePath - 檔案路徑
   * @param {Array} platforms - 目標平台列表
   * @param {Object} options - 上傳選項
   * @returns {Promise<Object>} 同步上傳結果
   */
  async syncUpload(filePath, platforms, options = {}) {
    const uploads = platforms.map(platform => ({
      filePath,
      platform,
      options: { ...options }
    }));

    const results = await this.uploadBatch(uploads);
    
    return {
      filePath,
      platforms,
      results,
      successful: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      successRate: (results.filter(r => r.success).length / results.length * 100)
    };
  }

  /**
   * 上傳資料夾中的所有圖片
   * @param {string} folderPath - 資料夾路徑
   * @param {string} platform - 目標平台
   * @param {Object} options - 上傳選項
   * @returns {Promise<Array>} 上傳結果列表
   */
  async uploadFolder(folderPath, platform, options = {}) {
    const files = await this._getImageFiles(folderPath);
    
    const uploads = files.map(filePath => ({
      filePath,
      platform,
      options: { ...options }
    }));

    return this.uploadBatch(uploads, options.progressCallback);
  }

  /**
   * 設置上傳進度回調
   * @param {string} uploadId - 上傳ID
   * @param {Function} callback - 進度回調函數
   */
  setProgressCallback(uploadId, callback) {
    this.progressCallbacks.set(uploadId, callback);
  }

  /**
   * 移除進度回調
   * @param {string} uploadId - 上傳ID
   */
  removeProgressCallback(uploadId) {
    this.progressCallbacks.delete(uploadId);
  }

  /**
   * 取得上傳統計
   * @returns {Object} 統計資訊
   */
  getStats() {
    return {
      ...this.stats,
      inProgress: this.activeUploads.size,
      successRate: this.stats.total > 0 ? (this.stats.completed / this.stats.total * 100) : 0,
      bytesProgress: this.stats.totalBytes > 0 ? (this.stats.bytes / this.stats.totalBytes * 100) : 0
    };
  }

  /**
   * 暫停所有上傳
   */
  pauseAll() {
    // TODO: 實作暫停邏輯
    console.log('暫停所有上傳');
  }

  /**
   * 繼續所有上傳
   */
  resumeAll() {
    // TODO: 實作繼續邏輯
    console.log('繼續所有上傳');
  }

  /**
   * 取消所有上傳
   */
  cancelAll() {
    this.progressCallbacks.clear();
    this.uploadQueue = [];
    this.activeUploads.clear();
  }

  // 私有方法

  /**
   * 執行單個上傳任務
   * @private
   */
  async _executeUpload(upload, index, globalProgressCallback) {
    const { filePath, platform, options = {} } = upload;
    const uploadId = this._generateUploadId(filePath, platform);

    try {
      // 設置個別進度回調
      if (globalProgressCallback) {
        this.setProgressCallback(uploadId, (progress) => {
          globalProgressCallback({
            ...progress,
            index,
            totalFiles: this.stats.total,
            completedFiles: this.stats.completed,
            overallProgress: (this.stats.completed / this.stats.total * 100)
          });
        });
      }

      const result = await this.uploadFile(filePath, platform, options);
      
      // 清理進度回調
      this.removeProgressCallback(uploadId);
      
      return result;

    } catch (error) {
      this.removeProgressCallback(uploadId);
      throw error;
    }
  }

  /**
   * 等待上傳槽位
   * @private
   */
  async _waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeUploads.size < this.maxConcurrency) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * 驗證檔案
   * @private
   */
  async _validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('不是有效的檔案');
      }

      const mimeType = this._getMimeType(filePath);
      if (!this.supportedMimeTypes.includes(mimeType)) {
        throw new Error(`不支援的檔案類型: ${mimeType}`);
      }

    } catch (error) {
      throw new Error(`檔案驗證失敗: ${error.message}`);
    }
  }

  /**
   * 取得檔案 MIME 類型
   * @private
   */
  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.tiff': 'image/tiff',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * 生成上傳 ID
   * @private
   */
  _generateUploadId(filePath, platform) {
    return `${platform}_${path.basename(filePath)}_${Date.now()}`;
  }

  /**
   * 取得資料夾中的圖片檔案
   * @private
   */
  async _getImageFiles(folderPath) {
    const files = await fs.readdir(folderPath);
    const imageFiles = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const mimeType = this._getMimeType(filePath);
        if (this.supportedMimeTypes.includes(mimeType)) {
          imageFiles.push(filePath);
        }
      }
    }

    return imageFiles;
  }

  /**
   * 計算總檔案大小
   * @private
   */
  async _calculateTotalSize(uploads) {
    let totalSize = 0;
    for (const upload of uploads) {
      try {
        const stats = await fs.stat(upload.filePath);
        totalSize += stats.size;
      } catch {
        // 忽略無法讀取的檔案
      }
    }
    return totalSize;
  }

  /**
   * 延遲函數
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 建立上傳管理器實例的工廠函數
 * @param {Object} options - 配置選項
 * @returns {FileUploadManager} 上傳管理器實例
 */
export function createUploadManager(options = {}) {
  return new FileUploadManager(options);
}

export default FileUploadManager; 