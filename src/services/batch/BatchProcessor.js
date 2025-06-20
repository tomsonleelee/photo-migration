// 批量處理器 - 管理多個遷移任務
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { QueueManager } from '../fileProcessing/QueueManager.js';
import { FileProcessingPipeline } from '../fileProcessing/FileProcessingPipeline.js';

// 批次狀態
export const BATCH_STATUS = {
  PENDING: 'pending',       // 待處理
  RUNNING: 'running',       // 運行中
  PAUSED: 'paused',        // 已暫停
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed',        // 失敗
  CANCELLED: 'cancelled'    // 已取消
};

// 任務狀態
export const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

// 批次優先級
export const BATCH_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 15
};

export class BatchProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxConcurrentBatches: options.maxConcurrentBatches || 3,
      maxConcurrentTasks: options.maxConcurrentTasks || 10,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000,
      cleanupInterval: options.cleanupInterval || 24 * 60 * 60 * 1000, // 24小時
      maxBatchHistory: options.maxBatchHistory || 100,
      enableAutoCleanup: options.enableAutoCleanup !== false,
      ...options
    };
    
    // 批次管理
    this.batches = new Map();
    this.activeBatches = new Set();
    this.batchQueue = [];
    this.batchHistory = [];
    
    // 統計資訊
    this.statistics = {
      totalBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      cancelledBatches: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0,
      lastProcessTime: null
    };
    
    // 服務依賴
    this.queueManager = new QueueManager();
    this.processingPipeline = new FileProcessingPipeline();
    
    // 定時器
    this.cleanupTimer = null;
    this.statusUpdateTimer = null;
    
    this.initialize();
  }

  // 初始化批量處理器
  async initialize() {
    try {
      // 初始化依賴服務
      await this.queueManager.initialize();
      
      // 設定事件監聽器
      this.setupEventListeners();
      
      // 啟動定期任務
      this.startPeriodicTasks();
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 設定事件監聽器
  setupEventListeners() {
    // 隊列事件
    this.queueManager.on('job-completed', (jobData) => {
      this.handleTaskCompleted(jobData);
    });
    
    this.queueManager.on('job-failed', (jobData) => {
      this.handleTaskFailed(jobData);
    });
    
    // 處理管道事件
    this.processingPipeline.on('progress', (progress) => {
      this.handlePipelineProgress(progress);
    });
    
    this.processingPipeline.on('completed', (result) => {
      this.handlePipelineCompleted(result);
    });
  }

  // 創建新批次
  async createBatch(batchConfig) {
    try {
      const batchId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const batch = {
        id: batchId,
        name: batchConfig.name || `Batch ${this.statistics.totalBatches + 1}`,
        description: batchConfig.description || '',
        status: BATCH_STATUS.PENDING,
        priority: batchConfig.priority || BATCH_PRIORITY.NORMAL,
        
        // 任務配置
        tasks: batchConfig.tasks || [],
        totalTasks: (batchConfig.tasks || []).length,
        completedTasks: 0,
        failedTasks: 0,
        
        // 配置選項
        config: {
          concurrency: batchConfig.concurrency || this.config.maxConcurrentTasks,
          retryAttempts: batchConfig.retryAttempts || this.config.retryAttempts,
          retryDelay: batchConfig.retryDelay || this.config.retryDelay,
          failOnError: batchConfig.failOnError || false,
          preserveOrder: batchConfig.preserveOrder || false,
          ...batchConfig.config
        },
        
        // 時間戳
        createdAt: timestamp,
        startedAt: null,
        completedAt: null,
        
        // 進度和統計
        progress: 0,
        statistics: {
          totalFiles: 0,
          processedFiles: 0,
          totalSize: 0,
          processedSize: 0,
          errors: [],
          warnings: []
        },
        
        // 運行時狀態
        runningTasks: new Set(),
        completedTaskIds: new Set(),
        failedTaskIds: new Set()
      };
      
      // 計算總文件數和大小
      this.calculateBatchStatistics(batch);
      
      // 存儲批次
      this.batches.set(batchId, batch);
      this.statistics.totalBatches++;
      
      this.emit('batch-created', {
        batchId,
        batch: this.getBatchInfo(batchId)
      });
      
      return batchId;
      
    } catch (error) {
      this.emit('error', {
        type: 'batch_creation_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 計算批次統計資訊
  calculateBatchStatistics(batch) {
    let totalFiles = 0;
    let totalSize = 0;
    
    for (const task of batch.tasks) {
      if (task.files) {
        totalFiles += task.files.length;
        totalSize += task.files.reduce((sum, file) => sum + (file.size || 0), 0);
      }
    }
    
    batch.statistics.totalFiles = totalFiles;
    batch.statistics.totalSize = totalSize;
  }

  // 啟動批次處理
  async startBatch(batchId) {
    try {
      const batch = this.batches.get(batchId);
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      if (batch.status !== BATCH_STATUS.PENDING && batch.status !== BATCH_STATUS.PAUSED) {
        throw new Error(`Cannot start batch in status: ${batch.status}`);
      }
      
      // 檢查併發限制
      if (this.activeBatches.size >= this.config.maxConcurrentBatches) {
        this.batchQueue.push(batchId);
        this.emit('batch-queued', { batchId });
        return;
      }
      
      // 更新批次狀態
      batch.status = BATCH_STATUS.RUNNING;
      batch.startedAt = new Date().toISOString();
      this.activeBatches.add(batchId);
      
      this.emit('batch-started', {
        batchId,
        batch: this.getBatchInfo(batchId)
      });
      
      // 開始處理任務
      await this.processBatchTasks(batchId);
      
    } catch (error) {
      this.handleBatchError(batchId, error);
    }
  }

  // 處理批次任務
  async processBatchTasks(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const { tasks, config } = batch;
    const concurrency = config.concurrency;
    
    // 如果需要保持順序，則使用序列處理
    if (config.preserveOrder) {
      await this.processTasksSequentially(batchId, tasks);
    } else {
      // 使用並發處理
      await this.processTasksConcurrently(batchId, tasks, concurrency);
    }
  }

  // 並發處理任務
  async processTasksConcurrently(batchId, tasks, concurrency) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const taskPromises = [];
    const semaphore = new Array(concurrency).fill(null);
    
    for (const task of tasks) {
      const taskPromise = this.acquireSlot(semaphore)
        .then(() => this.processTask(batchId, task))
        .finally(() => this.releaseSlot(semaphore));
      
      taskPromises.push(taskPromise);
    }
    
    try {
      await Promise.all(taskPromises);
      await this.completeBatch(batchId);
    } catch (error) {
      this.handleBatchError(batchId, error);
    }
  }

  // 序列處理任務
  async processTasksSequentially(batchId, tasks) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    try {
      for (const task of tasks) {
        // 檢查批次是否被暫停或取消
        if (batch.status === BATCH_STATUS.PAUSED) {
          await this.waitForResume(batchId);
        }
        
        if (batch.status === BATCH_STATUS.CANCELLED) {
          break;
        }
        
        await this.processTask(batchId, task);
      }
      
      await this.completeBatch(batchId);
    } catch (error) {
      this.handleBatchError(batchId, error);
    }
  }

  // 處理單個任務
  async processTask(batchId, task) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const taskId = task.id || uuidv4();
    task.id = taskId;
    task.status = TASK_STATUS.PROCESSING;
    task.startedAt = new Date().toISOString();
    
    batch.runningTasks.add(taskId);
    
    this.emit('task-started', {
      batchId,
      taskId,
      task
    });
    
    try {
      // 執行任務
      const result = await this.executeTask(batchId, task);
      
      // 任務成功完成
      task.status = TASK_STATUS.COMPLETED;
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      batch.runningTasks.delete(taskId);
      batch.completedTaskIds.add(taskId);
      batch.completedTasks++;
      
      this.updateBatchProgress(batchId);
      
      this.emit('task-completed', {
        batchId,
        taskId,
        task,
        result
      });
      
    } catch (error) {
      // 任務失敗處理
      await this.handleTaskError(batchId, task, error);
    }
  }

  // 執行具體任務
  async executeTask(batchId, task) {
    const taskType = task.type || 'migration';
    
    switch (taskType) {
      case 'migration':
        return await this.executeMigrationTask(batchId, task);
      case 'download':
        return await this.executeDownloadTask(batchId, task);
      case 'upload':
        return await this.executeUploadTask(batchId, task);
      case 'process':
        return await this.executeProcessTask(batchId, task);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  // 執行遷移任務
  async executeMigrationTask(batchId, task) {
    const { sourcePlatform, targetPlatform, files, config } = task;
    
    const migrationConfig = {
      batchId,
      taskId: task.id,
      sourcePlatform,
      targetPlatform,
      files,
      ...config
    };
    
    return await this.processingPipeline.processBatch(migrationConfig);
  }

  // 執行下載任務
  async executeDownloadTask(batchId, task) {
    const { files, config } = task;
    
    return await this.queueManager.addBulkJobs('download', files.map(file => ({
      ...file,
      batchId,
      taskId: task.id,
      ...config
    })));
  }

  // 執行上傳任務
  async executeUploadTask(batchId, task) {
    const { files, platform, config } = task;
    
    return await this.queueManager.addBulkJobs('upload', files.map(file => ({
      ...file,
      platform,
      batchId,
      taskId: task.id,
      ...config
    })));
  }

  // 執行處理任務
  async executeProcessTask(batchId, task) {
    const { files, processing, config } = task;
    
    return await this.queueManager.addBulkJobs('process', files.map(file => ({
      ...file,
      processing,
      batchId,
      taskId: task.id,
      ...config
    })));
  }

  // 處理任務錯誤
  async handleTaskError(batchId, task, error) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const taskId = task.id;
    
    // 更新任務狀態
    task.status = TASK_STATUS.FAILED;
    task.completedAt = new Date().toISOString();
    task.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    batch.runningTasks.delete(taskId);
    batch.failedTaskIds.add(taskId);
    batch.failedTasks++;
    batch.statistics.errors.push({
      taskId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // 檢查重試
    const retryAttempts = task.retryAttempts || 0;
    const maxRetries = batch.config.retryAttempts;
    
    if (retryAttempts < maxRetries) {
      task.retryAttempts = retryAttempts + 1;
      task.status = TASK_STATUS.PENDING;
      
      // 延遲重試
      setTimeout(() => {
        this.processTask(batchId, task);
      }, batch.config.retryDelay * Math.pow(2, retryAttempts));
      
      this.emit('task-retry', {
        batchId,
        taskId,
        task,
        attempt: retryAttempts + 1,
        maxAttempts: maxRetries
      });
      
      return;
    }
    
    this.updateBatchProgress(batchId);
    
    this.emit('task-failed', {
      batchId,
      taskId,
      task,
      error
    });
    
    // 檢查是否需要失敗整個批次
    if (batch.config.failOnError) {
      throw error;
    }
  }

  // 更新批次進度
  updateBatchProgress(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const { totalTasks, completedTasks, failedTasks } = batch;
    const processedTasks = completedTasks + failedTasks;
    
    batch.progress = totalTasks > 0 ? (processedTasks / totalTasks) * 100 : 0;
    
    this.emit('batch-progress', {
      batchId,
      progress: batch.progress,
      completedTasks,
      failedTasks,
      totalTasks
    });
  }

  // 完成批次
  async completeBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    batch.status = BATCH_STATUS.COMPLETED;
    batch.completedAt = new Date().toISOString();
    batch.progress = 100;
    
    // 更新統計
    this.statistics.completedBatches++;
    this.statistics.completedTasks += batch.completedTasks;
    this.statistics.failedTasks += batch.failedTasks;
    
    // 計算平均處理時間
    const processingTime = new Date(batch.completedAt) - new Date(batch.startedAt);
    this.updateAverageProcessingTime(processingTime);
    
    // 移出活動批次
    this.activeBatches.delete(batchId);
    
    // 添加到歷史記錄
    this.batchHistory.push(this.getBatchInfo(batchId));
    
    // 清理歷史記錄
    if (this.batchHistory.length > this.config.maxBatchHistory) {
      this.batchHistory.shift();
    }
    
    this.emit('batch-completed', {
      batchId,
      batch: this.getBatchInfo(batchId),
      statistics: batch.statistics
    });
    
    // 處理隊列中的下一個批次
    await this.processNextBatch();
  }

  // 處理批次錯誤
  handleBatchError(batchId, error) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    batch.status = BATCH_STATUS.FAILED;
    batch.completedAt = new Date().toISOString();
    batch.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    this.statistics.failedBatches++;
    this.activeBatches.delete(batchId);
    
    this.emit('batch-failed', {
      batchId,
      batch: this.getBatchInfo(batchId),
      error
    });
    
    // 處理隊列中的下一個批次
    this.processNextBatch();
  }

  // 暫停批次
  async pauseBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    if (batch.status !== BATCH_STATUS.RUNNING) {
      throw new Error(`Cannot pause batch in status: ${batch.status}`);
    }
    
    batch.status = BATCH_STATUS.PAUSED;
    batch.pausedAt = new Date().toISOString();
    
    this.emit('batch-paused', {
      batchId,
      batch: this.getBatchInfo(batchId)
    });
  }

  // 恢復批次
  async resumeBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    if (batch.status !== BATCH_STATUS.PAUSED) {
      throw new Error(`Cannot resume batch in status: ${batch.status}`);
    }
    
    batch.status = BATCH_STATUS.RUNNING;
    batch.resumedAt = new Date().toISOString();
    
    this.emit('batch-resumed', {
      batchId,
      batch: this.getBatchInfo(batchId)
    });
  }

  // 取消批次
  async cancelBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    batch.status = BATCH_STATUS.CANCELLED;
    batch.cancelledAt = new Date().toISOString();
    
    // 取消正在運行的任務
    for (const taskId of batch.runningTasks) {
      // 這裡可以添加取消具體任務的邏輯
    }
    
    this.statistics.cancelledBatches++;
    this.activeBatches.delete(batchId);
    
    this.emit('batch-cancelled', {
      batchId,
      batch: this.getBatchInfo(batchId)
    });
    
    // 處理隊列中的下一個批次
    await this.processNextBatch();
  }

  // 處理隊列中的下一個批次
  async processNextBatch() {
    if (this.batchQueue.length > 0 && this.activeBatches.size < this.config.maxConcurrentBatches) {
      const nextBatchId = this.batchQueue.shift();
      await this.startBatch(nextBatchId);
    }
  }

  // 等待恢復
  async waitForResume(batchId) {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const batch = this.batches.get(batchId);
        if (!batch || batch.status !== BATCH_STATUS.PAUSED) {
          resolve();
        } else {
          setTimeout(checkStatus, 1000);
        }
      };
      checkStatus();
    });
  }

  // 信號量操作
  async acquireSlot(semaphore) {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        const index = semaphore.findIndex(slot => slot === null);
        if (index !== -1) {
          semaphore[index] = true;
          resolve(() => semaphore[index] = null);
        } else {
          setTimeout(tryAcquire, 100);
        }
      };
      tryAcquire();
    });
  }

  // 釋放信號量槽位
  releaseSlot(semaphore) {
    // 這個函數由 acquireSlot 返回的函數處理
  }

  // 獲取批次信息
  getBatchInfo(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return null;
    
    return {
      id: batch.id,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      priority: batch.priority,
      progress: batch.progress,
      totalTasks: batch.totalTasks,
      completedTasks: batch.completedTasks,
      failedTasks: batch.failedTasks,
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      statistics: batch.statistics
    };
  }

  // 獲取所有批次
  getAllBatches() {
    return Array.from(this.batches.values()).map(batch => this.getBatchInfo(batch.id));
  }

  // 獲取活動批次
  getActiveBatches() {
    return Array.from(this.activeBatches).map(batchId => this.getBatchInfo(batchId));
  }

  // 獲取統計信息
  getStatistics() {
    return {
      ...this.statistics,
      activeBatches: this.activeBatches.size,
      queuedBatches: this.batchQueue.length,
      totalBatchesInMemory: this.batches.size
    };
  }

  // 更新平均處理時間
  updateAverageProcessingTime(processingTime) {
    const { completedBatches } = this.statistics;
    const currentAverage = this.statistics.averageProcessingTime;
    
    this.statistics.averageProcessingTime = 
      ((currentAverage * (completedBatches - 1)) + processingTime) / completedBatches;
    this.statistics.lastProcessTime = processingTime;
  }

  // 啟動定期任務
  startPeriodicTasks() {
    // 自動清理定時器
    if (this.config.enableAutoCleanup) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupCompletedBatches();
      }, this.config.cleanupInterval);
    }
    
    // 狀態更新定時器
    this.statusUpdateTimer = setInterval(() => {
      this.emit('status-update', this.getStatistics());
    }, 10000); // 每10秒更新一次狀態
  }

  // 清理已完成的批次
  cleanupCompletedBatches() {
    const cutoffTime = Date.now() - this.config.cleanupInterval;
    let cleanedCount = 0;
    
    for (const [batchId, batch] of this.batches.entries()) {
      if (
        (batch.status === BATCH_STATUS.COMPLETED || 
         batch.status === BATCH_STATUS.FAILED || 
         batch.status === BATCH_STATUS.CANCELLED) &&
        new Date(batch.completedAt).getTime() < cutoffTime
      ) {
        this.batches.delete(batchId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.emit('batches-cleaned', { cleanedCount });
    }
  }

  // 處理任務完成事件
  handleTaskCompleted(jobData) {
    const { batchId, taskId } = jobData;
    // 更新相應的批次和任務狀態
    this.updateTaskFromJobData(batchId, taskId, TASK_STATUS.COMPLETED, jobData);
  }

  // 處理任務失敗事件
  handleTaskFailed(jobData) {
    const { batchId, taskId } = jobData;
    // 更新相應的批次和任務狀態
    this.updateTaskFromJobData(batchId, taskId, TASK_STATUS.FAILED, jobData);
  }

  // 從作業數據更新任務
  updateTaskFromJobData(batchId, taskId, status, jobData) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    // 查找並更新任務
    const task = batch.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.jobData = jobData;
      
      if (status === TASK_STATUS.COMPLETED) {
        batch.completedTasks++;
        batch.completedTaskIds.add(taskId);
      } else if (status === TASK_STATUS.FAILED) {
        batch.failedTasks++;
        batch.failedTaskIds.add(taskId);
      }
      
      batch.runningTasks.delete(taskId);
      this.updateBatchProgress(batchId);
    }
  }

  // 處理管道進度事件
  handlePipelineProgress(progress) {
    const { batchId, taskId } = progress;
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    // 更新批次統計
    if (progress.processedFiles !== undefined) {
      batch.statistics.processedFiles = progress.processedFiles;
    }
    if (progress.processedSize !== undefined) {
      batch.statistics.processedSize = progress.processedSize;
    }
    
    this.emit('batch-file-progress', {
      batchId,
      taskId,
      progress
    });
  }

  // 處理管道完成事件
  handlePipelineCompleted(result) {
    const { batchId, taskId } = result;
    this.emit('batch-pipeline-completed', {
      batchId,
      taskId,
      result
    });
  }

  // 關閉批量處理器
  async shutdown() {
    // 清理定時器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.statusUpdateTimer) {
      clearInterval(this.statusUpdateTimer);
    }
    
    // 取消所有活動批次
    for (const batchId of this.activeBatches) {
      await this.cancelBatch(batchId);
    }
    
    // 關閉依賴服務
    await this.queueManager.shutdown();
    
    this.emit('shutdown');
  }
}

export default BatchProcessor;