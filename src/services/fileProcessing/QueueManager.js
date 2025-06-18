import Queue from 'bull';
import { createLogger } from './Logger.js';

/**
 * 任務佇列管理器
 * 基於 Bull 和 Redis 的分散式任務佇列系統
 */
export class QueueManager {
  constructor(options = {}) {
    this.redisConfig = options.redis || {
      host: 'localhost',
      port: 6379,
      db: 0
    };
    
    this.logger = createLogger('QueueManager');
    this.queues = new Map();
    this.processors = new Map();
    
    // 預設佇列配置
    this.defaultOptions = {
      redis: this.redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    };

    // 初始化標準佇列
    this._initializeQueues();
  }

  /**
   * 初始化標準佇列
   * @private
   */
  _initializeQueues() {
    // 下載佇列
    this.createQueue('download', {
      concurrency: 5,
      ...this.defaultOptions
    });

    // 圖片處理佇列
    this.createQueue('image-processing', {
      concurrency: 3,
      ...this.defaultOptions
    });

    // 上傳佇列
    this.createQueue('upload', {
      concurrency: 2,
      ...this.defaultOptions
    });

    // 清理佇列
    this.createQueue('cleanup', {
      concurrency: 1,
      ...this.defaultOptions
    });
  }

  /**
   * 創建新佇列
   * @param {string} name - 佇列名稱
   * @param {Object} options - 佇列選項
   * @returns {Queue} Bull 佇列實例
   */
  createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queueOptions = {
      ...this.defaultOptions,
      ...options
    };

    const queue = new Queue(name, queueOptions);
    this.queues.set(name, queue);

    // 設置事件監聽器
    this._setupQueueEvents(queue, name);

    this.logger.info(`佇列 ${name} 已創建`);
    return queue;
  }

  /**
   * 添加任務到佇列
   * @param {string} queueName - 佇列名稱
   * @param {string} jobType - 任務類型
   * @param {Object} data - 任務資料
   * @param {Object} options - 任務選項
   * @returns {Promise<Job>} Bull 任務實例
   */
  async addJob(queueName, jobType, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const jobOptions = {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      ...options
    };

    const job = await queue.add(jobType, data, jobOptions);
    
    this.logger.info(`任務已添加到佇列 ${queueName}`, {
      jobId: job.id,
      jobType,
      priority: jobOptions.priority
    });

    return job;
  }

  /**
   * 批量添加任務
   * @param {string} queueName - 佇列名稱
   * @param {Array} jobs - 任務列表 [{type, data, options}]
   * @returns {Promise<Array>} 任務實例列表
   */
  async addJobs(queueName, jobs) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const bullJobs = jobs.map(job => ({
      name: job.type,
      data: job.data,
      opts: job.options || {}
    }));

    const createdJobs = await queue.addBulk(bullJobs);
    
    this.logger.info(`批量添加 ${jobs.length} 個任務到佇列 ${queueName}`);
    
    return createdJobs;
  }

  /**
   * 註冊任務處理器
   * @param {string} queueName - 佇列名稱
   * @param {string} jobType - 任務類型
   * @param {Function} processor - 處理器函數
   * @param {Object} options - 處理器選項
   */
  registerProcessor(queueName, jobType, processor, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const processorKey = `${queueName}:${jobType}`;
    this.processors.set(processorKey, processor);

    const concurrency = options.concurrency || 1;
    
    queue.process(jobType, concurrency, async (job) => {
      this.logger.info(`開始處理任務`, {
        queueName,
        jobType,
        jobId: job.id
      });

      try {
        const result = await processor(job);
        
        this.logger.info(`任務處理完成`, {
          queueName,
          jobType,
          jobId: job.id
        });

        return result;
      } catch (error) {
        this.logger.error(`任務處理失敗`, {
          queueName,
          jobType,
          jobId: job.id,
          error: error.message
        });
        throw error;
      }
    });

    this.logger.info(`已註冊處理器: ${processorKey}`);
  }

  /**
   * 取得佇列狀態
   * @param {string} queueName - 佇列名稱
   * @returns {Promise<Object>} 佇列狀態
   */
  async getQueueStatus(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      isPaused: await queue.isPaused()
    };
  }

  /**
   * 取得所有佇列狀態
   * @returns {Promise<Array>} 所有佇列狀態
   */
  async getAllQueueStatus() {
    const statuses = [];
    for (const queueName of this.queues.keys()) {
      const status = await this.getQueueStatus(queueName);
      statuses.push(status);
    }
    return statuses;
  }

  /**
   * 暫停佇列
   * @param {string} queueName - 佇列名稱
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    await queue.pause();
    this.logger.info(`佇列 ${queueName} 已暫停`);
  }

  /**
   * 恢復佇列
   * @param {string} queueName - 佇列名稱
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    await queue.resume();
    this.logger.info(`佇列 ${queueName} 已恢復`);
  }

  /**
   * 清空佇列
   * @param {string} queueName - 佇列名稱
   */
  async cleanQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    await queue.empty();
    this.logger.info(`佇列 ${queueName} 已清空`);
  }

  /**
   * 取得任務詳情
   * @param {string} queueName - 佇列名稱
   * @param {string} jobId - 任務ID
   * @returns {Promise<Object>} 任務詳情
   */
  async getJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`任務 ${jobId} 在佇列 ${queueName} 中不存在`);
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason
    };
  }

  /**
   * 重試失敗的任務
   * @param {string} queueName - 佇列名稱
   * @param {string} jobId - 任務ID
   */
  async retryJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`任務 ${jobId} 在佇列 ${queueName} 中不存在`);
    }

    await job.retry();
    this.logger.info(`任務 ${jobId} 已重新加入佇列 ${queueName}`);
  }

  /**
   * 移除任務
   * @param {string} queueName - 佇列名稱
   * @param {string} jobId - 任務ID
   */
  async removeJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`佇列 ${queueName} 不存在`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`任務 ${jobId} 在佇列 ${queueName} 中不存在`);
    }

    await job.remove();
    this.logger.info(`任務 ${jobId} 已從佇列 ${queueName} 移除`);
  }

  /**
   * 關閉所有佇列
   */
  async shutdown() {
    this.logger.info('開始關閉所有佇列');

    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        this.logger.info(`佇列 ${name} 已關閉`);
      } catch (error) {
        this.logger.error(`關閉佇列 ${name} 時發生錯誤`, { error: error.message });
      }
    }

    this.queues.clear();
    this.processors.clear();
    this.logger.info('所有佇列已關閉');
  }

  // 私有方法

  /**
   * 設置佇列事件監聽器
   * @private
   */
  _setupQueueEvents(queue, name) {
    queue.on('completed', (job, result) => {
      this.logger.info(`任務完成`, {
        queueName: name,
        jobId: job.id,
        jobType: job.name
      });
    });

    queue.on('failed', (job, error) => {
      this.logger.error(`任務失敗`, {
        queueName: name,
        jobId: job.id,
        jobType: job.name,
        error: error.message,
        attempts: job.attemptsMade
      });
    });

    queue.on('stalled', (job) => {
      this.logger.warn(`任務停滯`, {
        queueName: name,
        jobId: job.id,
        jobType: job.name
      });
    });

    queue.on('progress', (job, progress) => {
      this.logger.debug(`任務進度更新`, {
        queueName: name,
        jobId: job.id,
        jobType: job.name,
        progress
      });
    });

    queue.on('paused', () => {
      this.logger.info(`佇列 ${name} 已暫停`);
    });

    queue.on('resumed', () => {
      this.logger.info(`佇列 ${name} 已恢復`);
    });

    queue.on('error', (error) => {
      this.logger.error(`佇列 ${name} 發生錯誤`, { error: error.message });
    });
  }
}

/**
 * 建立佇列管理器實例
 * @param {Object} options - 配置選項
 * @returns {QueueManager} 佇列管理器實例
 */
export function createQueueManager(options = {}) {
  return new QueueManager(options);
}

export default QueueManager; 