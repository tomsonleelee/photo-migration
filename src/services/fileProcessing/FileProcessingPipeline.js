import { FileDownloadManager } from './FileDownloadManager.js';
import { ImageProcessor } from './ImageProcessor.js';
import { FileUploadManager } from './FileUploadManager.js';
import { QueueManager } from './QueueManager.js';
import { createLogger } from './Logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 檔案處理管線
 * 整合下載、處理、上傳和佇列管理的完整工作流程
 */
export class FileProcessingPipeline {
  constructor(options = {}) {
    this.logger = createLogger('FileProcessingPipeline');
    
    // 配置選項
    this.config = {
      tempDir: options.tempDir || './temp',
      outputDir: options.outputDir || './output',
      maxConcurrency: options.maxConcurrency || 3,
      retryAttempts: options.retryAttempts || 3,
      cleanupTemp: options.cleanupTemp !== false,
      enableQueue: options.enableQueue !== false,
      ...options
    };

    // 初始化組件
    this.downloadManager = new FileDownloadManager({
      downloadDir: path.join(this.config.tempDir, 'downloads'),
      maxConcurrency: this.config.maxConcurrency,
      retryAttempts: this.config.retryAttempts
    });

    this.imageProcessor = new ImageProcessor({
      outputDir: path.join(this.config.tempDir, 'processed')
    });

    this.uploadManager = new FileUploadManager({
      maxConcurrency: Math.ceil(this.config.maxConcurrency / 2),
      retryAttempts: this.config.retryAttempts
    });

    // 佇列管理器（可選）
    this.queueManager = this.config.enableQueue ? new QueueManager() : null;
    
    // 狀態追蹤
    this.state = {
      isRunning: false,
      isPaused: false,
      currentJobs: new Map(),
      stats: {
        total: 0,
        downloaded: 0,
        processed: 0,
        uploaded: 0,
        failed: 0
      }
    };

    // 進度回調
    this.progressCallbacks = new Set();
    
    // 初始化目錄
    this._initializeDirectories();
    
    // 註冊佇列處理器
    if (this.queueManager) {
      this._registerQueueProcessors();
    }
  }

  /**
   * 處理單個照片遷移任務
   * @param {Object} task - 遷移任務
   * @returns {Promise<Object>} 處理結果
   */
  async processPhotoMigration(task) {
    const {
      sourceUrl,
      targetPlatform,
      filename,
      processingOptions = {},
      uploadOptions = {}
    } = task;

    const jobId = this._generateJobId();
    this.state.currentJobs.set(jobId, {
      ...task,
      status: 'started',
      startTime: Date.now()
    });

    try {
      this.logger.info('開始照片遷移任務', { jobId, sourceUrl, targetPlatform });
      
      // 步驟 1: 下載照片
      this._updateProgress(jobId, 'downloading', 10);
      const downloadedPath = await this.downloadManager.downloadFile(
        sourceUrl,
        filename || this._generateFilename(sourceUrl)
      );
      
      this.state.stats.downloaded++;
      this._updateProgress(jobId, 'downloaded', 30);

      // 步驟 2: 處理照片（如果需要）
      let processedPath = downloadedPath;
      if (Object.keys(processingOptions).length > 0) {
        this._updateProgress(jobId, 'processing', 50);
        const processResult = await this.imageProcessor.processImage(downloadedPath, processingOptions);
        
        if (processResult.success) {
          processedPath = processResult.outputPath;
          this.state.stats.processed++;
        } else {
          throw new Error(`圖片處理失敗: ${processResult.error}`);
        }
      }
      
      this._updateProgress(jobId, 'processed', 70);

      // 步驟 3: 上傳到目標平台
      this._updateProgress(jobId, 'uploading', 80);
      const uploadResult = await this.uploadManager.uploadFile(
        processedPath,
        targetPlatform,
        uploadOptions
      );

      if (!uploadResult.success) {
        throw new Error(`上傳失敗: ${uploadResult.error}`);
      }

      this.state.stats.uploaded++;
      this._updateProgress(jobId, 'completed', 100);

      // 步驟 4: 清理暫存檔案
      if (this.config.cleanupTemp) {
        await this._cleanupTempFiles([downloadedPath, processedPath]);
      }

      const result = {
        success: true,
        jobId,
        sourceUrl,
        targetPlatform,
        downloadedPath,
        processedPath,
        uploadResult,
        duration: Date.now() - this.state.currentJobs.get(jobId).startTime
      };

      this.state.currentJobs.delete(jobId);
      this.logger.info('照片遷移任務完成', { jobId, duration: result.duration });
      
      return result;

    } catch (error) {
      this.state.stats.failed++;
      this.state.currentJobs.delete(jobId);
      
      this.logger.error('照片遷移任務失敗', {
        jobId,
        sourceUrl,
        targetPlatform,
        error: error.message
      });

      return {
        success: false,
        jobId,
        sourceUrl,
        targetPlatform,
        error: error.message
      };
    }
  }

  /**
   * 批量處理照片遷移
   * @param {Array} tasks - 遷移任務列表
   * @param {Function} progressCallback - 進度回調
   * @returns {Promise<Array>} 處理結果列表
   */
  async processBatchMigration(tasks, progressCallback) {
    this.state.isRunning = true;
    this.state.stats.total = tasks.length;
    
    if (progressCallback) {
      this.progressCallbacks.add(progressCallback);
    }

    try {
      this.logger.info('開始批量照片遷移', { totalTasks: tasks.length });

      if (this.queueManager) {
        // 使用佇列處理
        return await this._processBatchWithQueue(tasks);
      } else {
        // 直接並行處理
        return await this._processBatchDirect(tasks);
      }

    } finally {
      this.state.isRunning = false;
      if (progressCallback) {
        this.progressCallbacks.delete(progressCallback);
      }
    }
  }

  /**
   * 暫停處理
   */
  async pauseProcessing() {
    this.state.isPaused = true;
    
    if (this.queueManager) {
      await this.queueManager.pauseQueue('download');
      await this.queueManager.pauseQueue('image-processing');
      await this.queueManager.pauseQueue('upload');
    }

    this.logger.info('處理已暫停');
  }

  /**
   * 恢復處理
   */
  async resumeProcessing() {
    this.state.isPaused = false;
    
    if (this.queueManager) {
      await this.queueManager.resumeQueue('download');
      await this.queueManager.resumeQueue('image-processing');
      await this.queueManager.resumeQueue('upload');
    }

    this.logger.info('處理已恢復');
  }

  /**
   * 停止所有處理
   */
  async stopProcessing() {
    this.state.isRunning = false;
    this.state.isPaused = false;
    
    if (this.queueManager) {
      await this.queueManager.cleanQueue('download');
      await this.queueManager.cleanQueue('image-processing');
      await this.queueManager.cleanQueue('upload');
    }

    // 取消所有下載和上傳
    this.downloadManager.cleanup();
    this.uploadManager.cancelAll();

    this.logger.info('所有處理已停止');
  }

  /**
   * 取得處理統計
   * @returns {Object} 統計資訊
   */
  getStats() {
    const baseStats = {
      ...this.state.stats,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      activeJobs: this.state.currentJobs.size,
      successRate: this.state.stats.total > 0 ? 
        ((this.state.stats.uploaded / this.state.stats.total) * 100) : 0
    };

    if (this.queueManager) {
      // 添加佇列統計（異步獲取）
      return baseStats;
    }

    return baseStats;
  }

  /**
   * 關閉管線
   */
  async shutdown() {
    this.logger.info('開始關閉檔案處理管線');
    
    await this.stopProcessing();
    
    if (this.queueManager) {
      await this.queueManager.shutdown();
    }

    this.progressCallbacks.clear();
    this.state.currentJobs.clear();
    
    this.logger.info('檔案處理管線已關閉');
  }

  // 私有方法

  /**
   * 初始化目錄
   * @private
   */
  async _initializeDirectories() {
    const directories = [
      this.config.tempDir,
      this.config.outputDir,
      path.join(this.config.tempDir, 'downloads'),
      path.join(this.config.tempDir, 'processed')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          this.logger.error('創建目錄失敗', { directory: dir, error: error.message });
        }
      }
    }
  }

  /**
   * 註冊佇列處理器
   * @private
   */
  _registerQueueProcessors() {
    // 下載處理器
    this.queueManager.registerProcessor('download', 'photo-download', async (job) => {
      const { sourceUrl, filename, jobId } = job.data;
      return await this.downloadManager.downloadFile(sourceUrl, filename);
    });

    // 圖片處理器
    this.queueManager.registerProcessor('image-processing', 'photo-process', async (job) => {
      const { inputPath, options } = job.data;
      return await this.imageProcessor.processImage(inputPath, options);
    });

    // 上傳處理器
    this.queueManager.registerProcessor('upload', 'photo-upload', async (job) => {
      const { filePath, platform, options } = job.data;
      return await this.uploadManager.uploadFile(filePath, platform, options);
    });
  }

  /**
   * 使用佇列處理批量任務
   * @private
   */
  async _processBatchWithQueue(tasks) {
    const results = [];
    
    for (const task of tasks) {
      const jobId = this._generateJobId();
      
      // 添加下載任務
      await this.queueManager.addJob('download', 'photo-download', {
        sourceUrl: task.sourceUrl,
        filename: task.filename || this._generateFilename(task.sourceUrl),
        jobId
      });
      
      results.push({ jobId, status: 'queued' });
    }

    return results;
  }

  /**
   * 直接並行處理批量任務
   * @private
   */
  async _processBatchDirect(tasks) {
    const results = [];
    const batchSize = this.config.maxConcurrency;
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(task => 
        this.processPhotoMigration(task)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason.message,
            task: batch[index]
          });
        }
      });

      // 檢查是否暫停
      while (this.state.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.state.isRunning) {
        break;
      }
    }

    return results;
  }

  /**
   * 更新任務進度
   * @private
   */
  _updateProgress(jobId, stage, percentage) {
    const job = this.state.currentJobs.get(jobId);
    if (job) {
      job.stage = stage;
      job.percentage = percentage;
      job.updatedAt = Date.now();
    }

    // 通知進度回調
    this.progressCallbacks.forEach(callback => {
      try {
        callback({
          jobId,
          stage,
          percentage,
          stats: this.getStats()
        });
      } catch (error) {
        this.logger.warn('進度回調執行失敗', { error: error.message });
      }
    });
  }

  /**
   * 生成任務 ID
   * @private
   */
  _generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成檔案名
   * @private
   */
  _generateFilename(url) {
    const urlParts = new URL(url);
    let filename = path.basename(urlParts.pathname);
    
    if (!filename || !filename.includes('.')) {
      filename = `photo_${Date.now()}.jpg`;
    }
    
    return filename;
  }

  /**
   * 清理暫存檔案
   * @private
   */
  async _cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        this.logger.debug('清理暫存檔案', { filePath });
      } catch (error) {
        this.logger.warn('清理暫存檔案失敗', { filePath, error: error.message });
      }
    }
  }
}

/**
 * 建立檔案處理管線實例
 * @param {Object} options - 配置選項
 * @returns {FileProcessingPipeline} 管線實例
 */
export function createFileProcessingPipeline(options = {}) {
  return new FileProcessingPipeline(options);
}

export default FileProcessingPipeline; 