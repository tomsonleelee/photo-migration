// 批量任務隊列管理器 - 基於 Bull 的增強版本
import Bull from 'bull';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { QueueManager } from '../fileProcessing/QueueManager.js';

// 隊列類型
export const QUEUE_TYPES = {
  BATCH_PROCESSING: 'batch-processing',
  SCHEDULED_MIGRATION: 'scheduled-migration',
  HIGH_PRIORITY: 'high-priority',
  BACKGROUND_TASKS: 'background-tasks',
  CLEANUP: 'cleanup'
};

// 作業狀態
export const JOB_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
  STUCK: 'stuck'
};

// 作業優先級
export const JOB_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  URGENT: 15,
  CRITICAL: 20
};

export class BatchQueueManager extends EventEmitter {
  constructor(redisConfig = {}) {
    super();
    
    this.redisConfig = {
      host: redisConfig.host || 'localhost',
      port: redisConfig.port || 6379,
      db: redisConfig.db || 0,
      password: redisConfig.password,
      ...redisConfig
    };
    
    this.queues = new Map();
    this.processors = new Map();
    this.queueConfigs = new Map();
    this.jobStats = new Map();
    
    // 統計資訊
    this.statistics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
      waitingJobs: 0,
      delayedJobs: 0,
      processingRate: 0,
      averageWaitTime: 0,
      averageProcessTime: 0
    };
    
    // 基礎隊列管理器
    this.baseQueueManager = new QueueManager();
    
    this.initialize();
  }

  // 初始化隊列管理器
  async initialize() {
    try {
      // 創建默認隊列
      await this.createDefaultQueues();
      
      // 設定隊列處理器
      this.setupDefaultProcessors();
      
      // 啟動監控
      this.startMonitoring();
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 創建默認隊列
  async createDefaultQueues() {
    const queueConfigs = [
      {
        name: QUEUE_TYPES.HIGH_PRIORITY,
        options: {
          defaultJobOptions: {
            priority: JOB_PRIORITY.HIGH,
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          },
          settings: {
            stalledInterval: 30 * 1000,
            retryDelayOnFailure: 5 * 1000
          }
        }
      },
      {
        name: QUEUE_TYPES.BATCH_PROCESSING,
        options: {
          defaultJobOptions: {
            priority: JOB_PRIORITY.NORMAL,
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 1000
            }
          },
          settings: {
            stalledInterval: 60 * 1000,
            retryDelayOnFailure: 10 * 1000
          }
        }
      },
      {
        name: QUEUE_TYPES.SCHEDULED_MIGRATION,
        options: {
          defaultJobOptions: {
            priority: JOB_PRIORITY.NORMAL,
            removeOnComplete: 200,
            removeOnFail: 100,
            attempts: 3,
            backoff: 'fixed'
          },
          settings: {
            stalledInterval: 5 * 60 * 1000,
            retryDelayOnFailure: 30 * 1000
          }
        }
      },
      {
        name: QUEUE_TYPES.BACKGROUND_TASKS,
        options: {
          defaultJobOptions: {
            priority: JOB_PRIORITY.LOW,
            removeOnComplete: 20,
            removeOnFail: 10,
            attempts: 2,
            backoff: 'fixed',
            delay: 5000
          }
        }
      },
      {
        name: QUEUE_TYPES.CLEANUP,
        options: {
          defaultJobOptions: {
            priority: JOB_PRIORITY.LOW,
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 1
          }
        }
      }
    ];

    for (const config of queueConfigs) {
      await this.createQueue(config.name, config.options);
    }
  }

  // 創建隊列
  async createQueue(queueName, options = {}) {
    try {
      const queue = new Bull(queueName, {
        redis: this.redisConfig,
        ...options
      });

      this.queues.set(queueName, queue);
      this.queueConfigs.set(queueName, options);
      this.jobStats.set(queueName, {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        waitingJobs: 0
      });

      // 設定隊列事件監聽器
      this.setupQueueListeners(queue, queueName);

      this.emit('queue-created', { queueName, options });
      
      return queue;
    } catch (error) {
      this.emit('error', {
        type: 'queue_creation_failed',
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  // 設定隊列事件監聽器
  setupQueueListeners(queue, queueName) {
    // 作業事件
    queue.on('completed', (job, result) => {
      this.handleJobCompleted(queueName, job, result);
    });

    queue.on('failed', (job, error) => {
      this.handleJobFailed(queueName, job, error);
    });

    queue.on('active', (job) => {
      this.handleJobActive(queueName, job);
    });

    queue.on('waiting', (jobId) => {
      this.handleJobWaiting(queueName, jobId);
    });

    queue.on('stalled', (job) => {
      this.handleJobStalled(queueName, job);
    });

    queue.on('progress', (job, progress) => {
      this.handleJobProgress(queueName, job, progress);
    });

    // 隊列全局事件
    queue.on('error', (error) => {
      this.emit('queue-error', { queueName, error });
    });

    queue.on('drained', () => {
      this.emit('queue-drained', { queueName });
    });
  }

  // 設定默認處理器
  setupDefaultProcessors() {
    // 批量處理處理器
    this.addProcessor(QUEUE_TYPES.BATCH_PROCESSING, 'batch-migration', {
      concurrency: 5,
      processor: this.processBatchMigration.bind(this)
    });

    // 排程遷移處理器
    this.addProcessor(QUEUE_TYPES.SCHEDULED_MIGRATION, 'scheduled-task', {
      concurrency: 3,
      processor: this.processScheduledMigration.bind(this)
    });

    // 高優先級處理器
    this.addProcessor(QUEUE_TYPES.HIGH_PRIORITY, 'urgent-task', {
      concurrency: 10,
      processor: this.processUrgentTask.bind(this)
    });

    // 背景任務處理器
    this.addProcessor(QUEUE_TYPES.BACKGROUND_TASKS, 'background-task', {
      concurrency: 2,
      processor: this.processBackgroundTask.bind(this)
    });

    // 清理任務處理器
    this.addProcessor(QUEUE_TYPES.CLEANUP, 'cleanup-task', {
      concurrency: 1,
      processor: this.processCleanupTask.bind(this)
    });
  }

  // 添加處理器
  addProcessor(queueName, jobType, config) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const { concurrency = 1, processor } = config;
    
    // 註冊處理器
    queue.process(jobType, concurrency, async (job) => {
      try {
        const startTime = Date.now();
        const result = await processor(job);
        const processingTime = Date.now() - startTime;
        
        // 更新處理時間統計
        this.updateProcessingTimeStats(processingTime);
        
        return result;
      } catch (error) {
        this.emit('processor-error', {
          queueName,
          jobType,
          jobId: job.id,
          error: error.message
        });
        throw error;
      }
    });

    // 存儲處理器信息
    const processorKey = `${queueName}:${jobType}`;
    this.processors.set(processorKey, {
      queueName,
      jobType,
      concurrency,
      processor
    });

    this.emit('processor-added', {
      queueName,
      jobType,
      concurrency
    });
  }

  // 添加作業到隊列
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const jobOptions = {
        priority: options.priority || JOB_PRIORITY.NORMAL,
        delay: options.delay || 0,
        attempts: options.attempts,
        backoff: options.backoff,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail,
        ...options
      };

      const job = await queue.add(jobType, {
        id: uuidv4(),
        type: jobType,
        queueName,
        timestamp: new Date().toISOString(),
        ...data
      }, jobOptions);

      // 更新統計
      this.updateStats(queueName, 'totalJobs', 1);
      this.statistics.totalJobs++;

      this.emit('job-added', {
        queueName,
        jobType,
        jobId: job.id,
        data
      });

      return job;
    } catch (error) {
      this.emit('error', {
        type: 'job_addition_failed',
        queueName,
        jobType,
        error: error.message
      });
      throw error;
    }
  }

  // 批量添加作業
  async addBulkJobs(queueName, jobs, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const bulkJobs = jobs.map(job => ({
        name: job.type || 'bulk-job',
        data: {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          ...job
        },
        opts: {
          priority: job.priority || options.priority || JOB_PRIORITY.NORMAL,
          delay: job.delay || options.delay || 0,
          attempts: job.attempts || options.attempts,
          backoff: job.backoff || options.backoff,
          ...options
        }
      }));

      const addedJobs = await queue.addBulk(bulkJobs);

      // 更新統計
      this.updateStats(queueName, 'totalJobs', bulkJobs.length);
      this.statistics.totalJobs += bulkJobs.length;

      this.emit('bulk-jobs-added', {
        queueName,
        jobCount: bulkJobs.length,
        jobs: addedJobs
      });

      return addedJobs;
    } catch (error) {
      this.emit('error', {
        type: 'bulk_job_addition_failed',
        queueName,
        error: error.message
      });
      throw error;
    }
  }

  // 處理批量遷移
  async processBatchMigration(job) {
    const { batchId, tasks, config } = job.data;
    
    job.progress(0);
    
    try {
      const results = [];
      const totalTasks = tasks.length;
      
      for (let i = 0; i < totalTasks; i++) {
        const task = tasks[i];
        
        // 使用基礎隊列管理器處理任務
        const result = await this.baseQueueManager.addJob('migration', task);
        results.push(result);
        
        // 更新進度
        const progress = Math.round(((i + 1) / totalTasks) * 100);
        job.progress(progress);
        
        this.emit('batch-task-completed', {
          batchId,
          taskIndex: i,
          task,
          result,
          progress
        });
      }
      
      return {
        batchId,
        completedTasks: results.length,
        results,
        status: 'completed'
      };
    } catch (error) {
      this.emit('batch-migration-failed', {
        batchId,
        error: error.message
      });
      throw error;
    }
  }

  // 處理排程遷移
  async processScheduledMigration(job) {
    const { scheduleId, migrationConfig, scheduledTime } = job.data;
    
    try {
      // 檢查是否到了執行時間
      const now = new Date();
      const executeTime = new Date(scheduledTime);
      
      if (now < executeTime) {
        // 重新安排作業
        const delay = executeTime.getTime() - now.getTime();
        throw new Error(`Rescheduling for ${delay}ms later`);
      }
      
      // 執行遷移
      const result = await this.addJob(
        QUEUE_TYPES.BATCH_PROCESSING,
        'batch-migration',
        migrationConfig,
        { priority: JOB_PRIORITY.HIGH }
      );
      
      return {
        scheduleId,
        executedAt: new Date().toISOString(),
        migrationJobId: result.id,
        status: 'executed'
      };
    } catch (error) {
      this.emit('scheduled-migration-failed', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  // 處理緊急任務
  async processUrgentTask(job) {
    const { taskType, data } = job.data;
    
    try {
      let result;
      
      switch (taskType) {
        case 'cancel-batch':
          result = await this.handleBatchCancellation(data);
          break;
        case 'pause-batch':
          result = await this.handleBatchPause(data);
          break;
        case 'priority-migration':
          result = await this.handlePriorityMigration(data);
          break;
        default:
          throw new Error(`Unknown urgent task type: ${taskType}`);
      }
      
      return result;
    } catch (error) {
      this.emit('urgent-task-failed', {
        taskType,
        error: error.message
      });
      throw error;
    }
  }

  // 處理背景任務
  async processBackgroundTask(job) {
    const { taskType, data } = job.data;
    
    try {
      let result;
      
      switch (taskType) {
        case 'statistics-calculation':
          result = await this.calculateStatistics(data);
          break;
        case 'queue-optimization':
          result = await this.optimizeQueues(data);
          break;
        case 'health-check':
          result = await this.performHealthCheck(data);
          break;
        default:
          throw new Error(`Unknown background task type: ${taskType}`);
      }
      
      return result;
    } catch (error) {
      this.emit('background-task-failed', {
        taskType,
        error: error.message
      });
      throw error;
    }
  }

  // 處理清理任務
  async processCleanupTask(job) {
    const { cleanupType, options } = job.data;
    
    try {
      let result;
      
      switch (cleanupType) {
        case 'completed-jobs':
          result = await this.cleanupCompletedJobs(options);
          break;
        case 'failed-jobs':
          result = await this.cleanupFailedJobs(options);
          break;
        case 'old-logs':
          result = await this.cleanupOldLogs(options);
          break;
        default:
          throw new Error(`Unknown cleanup type: ${cleanupType}`);
      }
      
      return result;
    } catch (error) {
      this.emit('cleanup-task-failed', {
        cleanupType,
        error: error.message
      });
      throw error;
    }
  }

  // 處理作業完成事件
  handleJobCompleted(queueName, job, result) {
    this.updateStats(queueName, 'completedJobs', 1);
    this.updateStats(queueName, 'activeJobs', -1);
    this.statistics.completedJobs++;
    this.statistics.activeJobs--;

    this.emit('job-completed', {
      queueName,
      jobId: job.id,
      jobType: job.name,
      result,
      processingTime: Date.now() - job.processedOn
    });
  }

  // 處理作業失敗事件
  handleJobFailed(queueName, job, error) {
    this.updateStats(queueName, 'failedJobs', 1);
    this.updateStats(queueName, 'activeJobs', -1);
    this.statistics.failedJobs++;
    this.statistics.activeJobs--;

    this.emit('job-failed', {
      queueName,
      jobId: job.id,
      jobType: job.name,
      error: error.message,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts
    });
  }

  // 處理作業開始事件
  handleJobActive(queueName, job) {
    this.updateStats(queueName, 'activeJobs', 1);
    this.updateStats(queueName, 'waitingJobs', -1);
    this.statistics.activeJobs++;
    this.statistics.waitingJobs--;

    this.emit('job-active', {
      queueName,
      jobId: job.id,
      jobType: job.name,
      waitTime: Date.now() - job.timestamp
    });
  }

  // 處理作業等待事件
  handleJobWaiting(queueName, jobId) {
    this.updateStats(queueName, 'waitingJobs', 1);
    this.statistics.waitingJobs++;

    this.emit('job-waiting', {
      queueName,
      jobId
    });
  }

  // 處理作業停滯事件
  handleJobStalled(queueName, job) {
    this.emit('job-stalled', {
      queueName,
      jobId: job.id,
      jobType: job.name
    });
  }

  // 處理作業進度事件
  handleJobProgress(queueName, job, progress) {
    this.emit('job-progress', {
      queueName,
      jobId: job.id,
      jobType: job.name,
      progress
    });
  }

  // 更新統計數據
  updateStats(queueName, statName, delta) {
    const stats = this.jobStats.get(queueName);
    if (stats && stats[statName] !== undefined) {
      stats[statName] += delta;
    }
  }

  // 更新處理時間統計
  updateProcessingTimeStats(processingTime) {
    const { completedJobs } = this.statistics;
    const currentAverage = this.statistics.averageProcessTime;
    
    this.statistics.averageProcessTime = 
      ((currentAverage * (completedJobs - 1)) + processingTime) / completedJobs;
  }

  // 獲取隊列統計
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };
  }

  // 獲取所有隊列統計
  async getAllQueueStats() {
    const stats = {};
    
    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }

  // 獲取整體統計
  getOverallStatistics() {
    return {
      ...this.statistics,
      queueCount: this.queues.size,
      processorCount: this.processors.size
    };
  }

  // 暫停隊列
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.emit('queue-paused', { queueName });
  }

  // 恢復隊列
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.emit('queue-resumed', { queueName });
  }

  // 清空隊列
  async clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
    this.emit('queue-cleared', { queueName });
  }

  // 啟動監控
  startMonitoring() {
    // 每分鐘更新統計
    setInterval(async () => {
      try {
        await this.updateStatistics();
        this.emit('statistics-updated', this.getOverallStatistics());
      } catch (error) {
        this.emit('monitoring-error', error);
      }
    }, 60000);

    // 每小時執行清理
    setInterval(async () => {
      try {
        await this.addJob(QUEUE_TYPES.CLEANUP, 'cleanup-task', {
          cleanupType: 'completed-jobs',
          options: { maxAge: 24 * 60 * 60 * 1000 } // 24小時
        });
      } catch (error) {
        this.emit('cleanup-scheduling-error', error);
      }
    }, 60 * 60 * 1000);
  }

  // 更新統計
  async updateStatistics() {
    const queueStats = await this.getAllQueueStats();
    
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalDelayed = 0;

    for (const stats of Object.values(queueStats)) {
      totalWaiting += stats.waiting;
      totalActive += stats.active;
      totalCompleted += stats.completed;
      totalFailed += stats.failed;
      totalDelayed += stats.delayed;
    }

    this.statistics.waitingJobs = totalWaiting;
    this.statistics.activeJobs = totalActive;
    this.statistics.delayedJobs = totalDelayed;

    // 計算處理速率（每分鐘完成的作業數）
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 這裡可以添加更詳細的速率計算邏輯
    this.statistics.processingRate = totalCompleted / 60; // 簡化計算
  }

  // 批次取消處理
  async handleBatchCancellation(data) {
    const { batchId } = data;
    
    // 取消相關的所有作業
    for (const queue of this.queues.values()) {
      const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
      
      for (const job of jobs) {
        if (job.data.batchId === batchId) {
          await job.remove();
        }
      }
    }
    
    return { batchId, status: 'cancelled' };
  }

  // 批次暫停處理
  async handleBatchPause(data) {
    const { batchId } = data;
    
    // 暫停相關的活動作業
    for (const queue of this.queues.values()) {
      const activeJobs = await queue.getActive();
      
      for (const job of activeJobs) {
        if (job.data.batchId === batchId) {
          // 標記作業為暫停狀態
          await job.update({
            ...job.data,
            paused: true
          });
        }
      }
    }
    
    return { batchId, status: 'paused' };
  }

  // 優先遷移處理
  async handlePriorityMigration(data) {
    const { migrationConfig } = data;
    
    return await this.addJob(
      QUEUE_TYPES.HIGH_PRIORITY,
      'batch-migration',
      migrationConfig,
      { priority: JOB_PRIORITY.URGENT }
    );
  }

  // 計算統計數據
  async calculateStatistics(data) {
    // 實現統計計算邏輯
    return await this.updateStatistics();
  }

  // 優化隊列
  async optimizeQueues(data) {
    // 實現隊列優化邏輯
    const stats = await this.getAllQueueStats();
    
    // 基於統計數據調整隊列配置
    for (const [queueName, queueStats] of Object.entries(stats)) {
      if (queueStats.waiting > 100) {
        // 增加處理器並發數
        this.emit('queue-optimization', {
          queueName,
          action: 'increase_concurrency',
          reason: 'high_waiting_count'
        });
      }
    }
    
    return { optimized: true };
  }

  // 執行健康檢查
  async performHealthCheck(data) {
    const health = {
      queues: {},
      overall: 'healthy'
    };
    
    for (const [queueName, queue] of this.queues.entries()) {
      try {
        await queue.isReady();
        health.queues[queueName] = 'healthy';
      } catch (error) {
        health.queues[queueName] = 'unhealthy';
        health.overall = 'unhealthy';
      }
    }
    
    return health;
  }

  // 清理已完成的作業
  async cleanupCompletedJobs(options) {
    const { maxAge = 24 * 60 * 60 * 1000 } = options;
    let cleanedCount = 0;
    
    for (const queue of this.queues.values()) {
      const completedJobs = await queue.getCompleted();
      
      for (const job of completedJobs) {
        const jobAge = Date.now() - job.finishedOn;
        if (jobAge > maxAge) {
          await job.remove();
          cleanedCount++;
        }
      }
    }
    
    return { cleanedJobs: cleanedCount };
  }

  // 清理失敗的作業
  async cleanupFailedJobs(options) {
    const { maxAge = 7 * 24 * 60 * 60 * 1000 } = options; // 7天
    let cleanedCount = 0;
    
    for (const queue of this.queues.values()) {
      const failedJobs = await queue.getFailed();
      
      for (const job of failedJobs) {
        const jobAge = Date.now() - job.finishedOn;
        if (jobAge > maxAge) {
          await job.remove();
          cleanedCount++;
        }
      }
    }
    
    return { cleanedJobs: cleanedCount };
  }

  // 清理舊日誌
  async cleanupOldLogs(options) {
    // 實現日誌清理邏輯
    return { cleanedLogs: 0 };
  }

  // 關閉隊列管理器
  async shutdown() {
    // 關閉所有隊列
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    
    // 關閉基礎隊列管理器
    await this.baseQueueManager.shutdown();
    
    this.emit('shutdown');
  }
}

export default BatchQueueManager;