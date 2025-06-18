import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * 檔案下載管理器
 * 提供並行下載、重試機制、進度追蹤等功能
 */
export class FileDownloadManager {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
    this.downloadDir = options.downloadDir || './downloads';
    
    // 並行控制
    this.activeDownloads = new Set();
    this.downloadQueue = [];
    this.progressCallbacks = new Map();
    
    // 統計資訊
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      bytes: 0
    };

    // 確保下載目錄存在
    this._ensureDirectoryExists(this.downloadDir);
  }

  /**
   * 下載單個檔案
   * @param {string} url - 檔案URL
   * @param {string} filename - 檔案名
   * @param {Object} options - 選項
   * @returns {Promise<string>} 下載的檔案路徑
   */
  async downloadFile(url, filename, options = {}) {
    const filepath = path.join(this.downloadDir, filename);
    const retryCount = options.retryCount || 0;

    try {
      // 檢查檔案是否已存在
      if (options.skipExisting !== false) {
        try {
          await fs.access(filepath);
          return filepath; // 檔案已存在，跳過下載
        } catch {
          // 檔案不存在，繼續下載
        }
      }

      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: this.timeout,
        headers: options.headers || {},
        onDownloadProgress: (progressEvent) => {
          const progress = {
            url,
            filename,
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: progressEvent.total ? (progressEvent.loaded / progressEvent.total * 100) : 0
          };
          
          // 調用進度回調
          const callback = this.progressCallbacks.get(url);
          if (callback) {
            callback(progress);
          }
        }
      });

      // 創建可寫流
      const writer = require('fs').createWriteStream(filepath);
      
      // 使用 pipeline 進行流式下載
      await pipeline(response.data, writer);

      // 更新統計
      this.stats.completed++;
      this.stats.bytes += response.headers['content-length'] || 0;

      return filepath;

    } catch (error) {
      // 重試機制
      if (retryCount < this.retryAttempts) {
        await this._delay(this.retryDelay * Math.pow(2, retryCount)); // 指數退避
        return this.downloadFile(url, filename, { 
          ...options, 
          retryCount: retryCount + 1 
        });
      }

      // 記錄失敗
      this.stats.failed++;
      throw new Error(`下載失敗: ${url} - ${error.message}`);
    }
  }

  /**
   * 批量下載檔案
   * @param {Array} downloads - 下載任務列表 [{url, filename, options}]
   * @param {Function} progressCallback - 全域進度回調
   * @returns {Promise<Array>} 下載結果列表
   */
  async downloadBatch(downloads, progressCallback) {
    this.stats.total = downloads.length;
    this.stats.completed = 0;
    this.stats.failed = 0;
    this.stats.bytes = 0;

    const results = [];
    const promises = [];

    for (let i = 0; i < downloads.length; i++) {
      // 等待可用的下載槽位
      while (this.activeDownloads.size >= this.maxConcurrency) {
        await this._waitForSlot();
      }

      const download = downloads[i];
      const promise = this._executeDownload(download, i, progressCallback);
      promises.push(promise);
      this.activeDownloads.add(promise);

      // 清理完成的下載
      promise.finally(() => {
        this.activeDownloads.delete(promise);
      });
    }

    // 等待所有下載完成
    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[index] = {
          success: true,
          filepath: result.value,
          download: downloads[index]
        };
      } else {
        results[index] = {
          success: false,
          error: result.reason.message,
          download: downloads[index]
        };
      }
    });

    return results;
  }

  /**
   * 設置進度回調
   * @param {string} url - 檔案URL
   * @param {Function} callback - 進度回調函數
   */
  setProgressCallback(url, callback) {
    this.progressCallbacks.set(url, callback);
  }

  /**
   * 移除進度回調
   * @param {string} url - 檔案URL
   */
  removeProgressCallback(url) {
    this.progressCallbacks.delete(url);
  }

  /**
   * 取得下載統計
   * @returns {Object} 統計資訊
   */
  getStats() {
    return {
      ...this.stats,
      inProgress: this.activeDownloads.size,
      successRate: this.stats.total > 0 ? (this.stats.completed / this.stats.total * 100) : 0
    };
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.progressCallbacks.clear();
    this.downloadQueue = [];
  }

  // 私有方法

  /**
   * 執行單個下載任務
   * @private
   */
  async _executeDownload(download, index, globalProgressCallback) {
    const { url, filename, options = {} } = download;
    
    try {
      // 設置個別進度回調
      if (globalProgressCallback) {
        this.setProgressCallback(url, (progress) => {
          globalProgressCallback({
            ...progress,
            index,
            totalFiles: this.stats.total,
            completedFiles: this.stats.completed,
            overallProgress: (this.stats.completed / this.stats.total * 100)
          });
        });
      }

      const filepath = await this.downloadFile(url, filename, options);
      
      // 清理進度回調
      this.removeProgressCallback(url);
      
      return filepath;
      
    } catch (error) {
      this.removeProgressCallback(url);
      throw error;
    }
  }

  /**
   * 等待下載槽位
   * @private
   */
  async _waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeDownloads.size < this.maxConcurrency) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * 延遲函數
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
 * 建立下載管理器實例的工廠函數
 * @param {Object} options - 配置選項
 * @returns {FileDownloadManager} 下載管理器實例
 */
export function createDownloadManager(options = {}) {
  return new FileDownloadManager(options);
}

export default FileDownloadManager; 