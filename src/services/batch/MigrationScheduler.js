// 遷移任務調度器 - 使用 node-schedule 管理未來的遷移任務
import { scheduleJob, scheduledJobs, RecurrenceRule, Range } from 'node-schedule';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BatchProcessor } from './BatchProcessor.js';
import { BatchQueueManager, QUEUE_TYPES, JOB_PRIORITY } from './BatchQueueManager.js';

// 調度類型
export const SCHEDULE_TYPES = {
  ONE_TIME: 'one_time',       // 一次性調度
  RECURRING: 'recurring',     // 週期性調度
  CRON: 'cron',              // Cron 表達式調度
  INTERVAL: 'interval'        // 間隔調度
};

// 調度狀態
export const SCHEDULE_STATUS = {
  PENDING: 'pending',         // 待執行
  ACTIVE: 'active',          // 激活中
  EXECUTING: 'executing',     // 執行中
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled',     // 已取消
  FAILED: 'failed'           // 失敗
};

// 週期類型
export const RECURRENCE_TYPES = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

export class MigrationScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      timezone: options.timezone || 'Asia/Taipei',
      maxConcurrentSchedules: options.maxConcurrentSchedules || 50,
      enablePersistence: options.enablePersistence !== false,
      scheduleHistoryLimit: options.scheduleHistoryLimit || 1000,
      ...options
    };
    
    // 調度管理
    this.schedules = new Map();
    this.activeJobs = new Map();
    this.scheduleHistory = [];
    
    // 統計資訊
    this.statistics = {
      totalSchedules: 0,
      activeSchedules: 0,
      completedSchedules: 0,
      failedSchedules: 0,
      cancelledSchedules: 0,
      executedJobs: 0,
      nextExecution: null
    };
    
    // 依賴服務
    this.batchProcessor = new BatchProcessor();
    this.queueManager = new BatchQueueManager();
    
    this.initialize();
  }

  // 初始化調度器
  async initialize() {
    try {
      // 初始化依賴服務
      await this.batchProcessor.initialize();
      await this.queueManager.initialize();
      
      // 設定事件監聽器
      this.setupEventListeners();
      
      // 載入持久化的調度
      if (this.config.enablePersistence) {
        await this.loadPersistedSchedules();
      }
      
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

  // 設定事件監聽器
  setupEventListeners() {
    // 批次處理器事件
    this.batchProcessor.on('batch-completed', (data) => {
      this.handleScheduledBatchCompleted(data);
    });
    
    this.batchProcessor.on('batch-failed', (data) => {
      this.handleScheduledBatchFailed(data);
    });
    
    // 隊列管理器事件
    this.queueManager.on('job-completed', (data) => {
      this.handleScheduledJobCompleted(data);
    });
  }

  // 創建調度
  async createSchedule(scheduleConfig) {
    try {
      const scheduleId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const schedule = {
        id: scheduleId,
        name: scheduleConfig.name || `Schedule ${this.statistics.totalSchedules + 1}`,
        description: scheduleConfig.description || '',
        type: scheduleConfig.type || SCHEDULE_TYPES.ONE_TIME,
        status: SCHEDULE_STATUS.PENDING,
        
        // 調度配置
        trigger: this.buildScheduleTrigger(scheduleConfig),
        migrationConfig: scheduleConfig.migrationConfig,
        
        // 選項
        options: {
          timezone: scheduleConfig.timezone || this.config.timezone,
          retryOnFailure: scheduleConfig.retryOnFailure || false,
          maxRetries: scheduleConfig.maxRetries || 0,
          retryDelay: scheduleConfig.retryDelay || 5 * 60 * 1000, // 5分鐘
          priority: scheduleConfig.priority || JOB_PRIORITY.NORMAL,
          enableNotifications: scheduleConfig.enableNotifications !== false,
          ...scheduleConfig.options
        },
        
        // 時間戳
        createdAt: timestamp,
        updatedAt: timestamp,
        lastExecutedAt: null,
        nextExecutionAt: null,
        
        // 執行歷史
        executionHistory: [],
        retryCount: 0,
        
        // 統計
        statistics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          lastExecutionTime: null
        }
      };
      
      // 計算下次執行時間
      schedule.nextExecutionAt = this.calculateNextExecution(schedule);
      
      // 存儲調度
      this.schedules.set(scheduleId, schedule);
      this.statistics.totalSchedules++;
      
      // 激活調度
      await this.activateSchedule(scheduleId);
      
      // 持久化調度
      if (this.config.enablePersistence) {
        await this.persistSchedule(schedule);
      }
      
      this.emit('schedule-created', {
        scheduleId,
        schedule: this.getScheduleInfo(scheduleId)
      });
      
      return scheduleId;
      
    } catch (error) {
      this.emit('error', {
        type: 'schedule_creation_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 構建調度觸發器
  buildScheduleTrigger(config) {
    const { type, datetime, cron, recurrence, interval } = config;
    
    switch (type) {
      case SCHEDULE_TYPES.ONE_TIME:
        return {
          type,
          datetime: new Date(datetime)
        };
        
      case SCHEDULE_TYPES.CRON:
        return {
          type,
          expression: cron
        };
        
      case SCHEDULE_TYPES.RECURRING:
        return {
          type,
          recurrence: this.buildRecurrenceRule(recurrence)
        };
        
      case SCHEDULE_TYPES.INTERVAL:
        return {
          type,
          interval: interval // 毫秒
        };
        
      default:
        throw new Error(`Unknown schedule type: ${type}`);
    }
  }

  // 構建週期規則
  buildRecurrenceRule(recurrence) {
    const { type, hour, minute, dayOfWeek, dayOfMonth, month } = recurrence;
    
    const rule = new RecurrenceRule();
    
    switch (type) {
      case RECURRENCE_TYPES.HOURLY:
        rule.minute = minute || 0;
        break;
        
      case RECURRENCE_TYPES.DAILY:
        rule.hour = hour || 0;
        rule.minute = minute || 0;
        break;
        
      case RECURRENCE_TYPES.WEEKLY:
        rule.dayOfWeek = dayOfWeek || 0; // 0 = Sunday
        rule.hour = hour || 0;
        rule.minute = minute || 0;
        break;
        
      case RECURRENCE_TYPES.MONTHLY:
        rule.date = dayOfMonth || 1;
        rule.hour = hour || 0;
        rule.minute = minute || 0;
        break;
        
      case RECURRENCE_TYPES.YEARLY:
        rule.month = month || 0; // 0 = January
        rule.date = dayOfMonth || 1;
        rule.hour = hour || 0;
        rule.minute = minute || 0;
        break;
        
      default:
        throw new Error(`Unknown recurrence type: ${type}`);
    }
    
    return rule;
  }

  // 激活調度
  async activateSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    try {
      let job;
      const { trigger } = schedule;
      
      switch (trigger.type) {
        case SCHEDULE_TYPES.ONE_TIME:
          job = scheduleJob(scheduleId, trigger.datetime, () => {
            this.executeSchedule(scheduleId);
          });
          break;
          
        case SCHEDULE_TYPES.CRON:
          job = scheduleJob(scheduleId, trigger.expression, () => {
            this.executeSchedule(scheduleId);
          });
          break;
          
        case SCHEDULE_TYPES.RECURRING:
          job = scheduleJob(scheduleId, trigger.recurrence, () => {
            this.executeSchedule(scheduleId);
          });
          break;
          
        case SCHEDULE_TYPES.INTERVAL:
          // 間隔調度需要特殊處理
          this.scheduleInterval(scheduleId, trigger.interval);
          break;
          
        default:
          throw new Error(`Unknown trigger type: ${trigger.type}`);
      }
      
      if (job) {
        this.activeJobs.set(scheduleId, job);
      }
      
      schedule.status = SCHEDULE_STATUS.ACTIVE;
      schedule.updatedAt = new Date().toISOString();
      this.statistics.activeSchedules++;
      
      this.emit('schedule-activated', {
        scheduleId,
        nextRun: schedule.nextExecutionAt
      });
      
    } catch (error) {
      schedule.status = SCHEDULE_STATUS.FAILED;
      this.emit('schedule-activation-failed', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  // 間隔調度處理
  scheduleInterval(scheduleId, interval) {
    const executeAndReschedule = () => {
      this.executeSchedule(scheduleId);
      
      // 重新調度下一次執行
      setTimeout(executeAndReschedule, interval);
    };
    
    // 首次執行延遲
    const timeoutId = setTimeout(executeAndReschedule, interval);
    
    // 存儲 timeout ID 以便取消
    this.activeJobs.set(scheduleId, {
      type: 'interval',
      timeoutId,
      cancel: () => clearTimeout(timeoutId)
    });
  }

  // 執行調度
  async executeSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;
    
    if (schedule.status !== SCHEDULE_STATUS.ACTIVE) {
      return;
    }
    
    const executionId = uuidv4();
    const startTime = new Date();
    
    schedule.status = SCHEDULE_STATUS.EXECUTING;
    schedule.lastExecutedAt = startTime.toISOString();
    
    this.emit('schedule-execution-started', {
      scheduleId,
      executionId,
      startTime
    });
    
    try {
      // 創建批次處理任務
      const batchId = await this.batchProcessor.createBatch({
        name: `Scheduled Migration: ${schedule.name}`,
        description: `Executing scheduled migration ${scheduleId}`,
        priority: schedule.options.priority,
        ...schedule.migrationConfig,
        metadata: {
          scheduleId,
          executionId,
          scheduledExecution: true
        }
      });
      
      // 啟動批次處理
      await this.batchProcessor.startBatch(batchId);
      
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      
      // 記錄執行歷史
      const execution = {
        id: executionId,
        batchId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
        status: 'completed',
        result: { batchId }
      };
      
      schedule.executionHistory.push(execution);
      schedule.statistics.totalExecutions++;
      schedule.statistics.successfulExecutions++;
      schedule.statistics.lastExecutionTime = executionTime;
      
      // 更新平均執行時間
      this.updateAverageExecutionTime(schedule, executionTime);
      
      // 處理一次性調度
      if (schedule.trigger.type === SCHEDULE_TYPES.ONE_TIME) {
        await this.completeSchedule(scheduleId);
      } else {
        schedule.status = SCHEDULE_STATUS.ACTIVE;
        schedule.nextExecutionAt = this.calculateNextExecution(schedule);
      }
      
      this.statistics.executedJobs++;
      
      this.emit('schedule-execution-completed', {
        scheduleId,
        executionId,
        batchId,
        executionTime,
        result: execution.result
      });
      
    } catch (error) {
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      
      // 記錄失敗執行
      const execution = {
        id: executionId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
        status: 'failed',
        error: {
          message: error.message,
          stack: error.stack
        }
      };
      
      schedule.executionHistory.push(execution);
      schedule.statistics.totalExecutions++;
      schedule.statistics.failedExecutions++;
      
      // 處理重試
      await this.handleExecutionFailure(scheduleId, error);
      
      this.emit('schedule-execution-failed', {
        scheduleId,
        executionId,
        error: error.message,
        retryCount: schedule.retryCount
      });
    }
    
    // 限制執行歷史長度
    if (schedule.executionHistory.length > 100) {
      schedule.executionHistory = schedule.executionHistory.slice(-100);
    }
    
    schedule.updatedAt = new Date().toISOString();
  }

  // 處理執行失敗
  async handleExecutionFailure(scheduleId, error) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;
    
    const { retryOnFailure, maxRetries, retryDelay } = schedule.options;
    
    if (retryOnFailure && schedule.retryCount < maxRetries) {
      schedule.retryCount++;
      
      // 延遲重試
      setTimeout(() => {
        this.executeSchedule(scheduleId);
      }, retryDelay);
      
      schedule.status = SCHEDULE_STATUS.ACTIVE;
      
      this.emit('schedule-retry-scheduled', {
        scheduleId,
        retryCount: schedule.retryCount,
        maxRetries,
        retryDelay
      });
    } else {
      // 達到最大重試次數或不重試
      if (schedule.trigger.type === SCHEDULE_TYPES.ONE_TIME) {
        schedule.status = SCHEDULE_STATUS.FAILED;
        this.statistics.failedSchedules++;
        this.deactivateSchedule(scheduleId);
      } else {
        // 週期性調度繼續，但記錄失敗
        schedule.status = SCHEDULE_STATUS.ACTIVE;
        schedule.retryCount = 0; // 重置重試計數
      }
    }
  }

  // 完成調度
  async completeSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;
    
    schedule.status = SCHEDULE_STATUS.COMPLETED;
    schedule.updatedAt = new Date().toISOString();
    
    this.statistics.completedSchedules++;
    this.statistics.activeSchedules--;
    
    await this.deactivateSchedule(scheduleId);
    
    // 添加到歷史記錄
    this.scheduleHistory.push(this.getScheduleInfo(scheduleId));
    
    // 清理歷史記錄
    if (this.scheduleHistory.length > this.config.scheduleHistoryLimit) {
      this.scheduleHistory.shift();
    }
    
    this.emit('schedule-completed', {
      scheduleId,
      schedule: this.getScheduleInfo(scheduleId)
    });
  }

  // 取消調度
  async cancelSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    schedule.status = SCHEDULE_STATUS.CANCELLED;
    schedule.updatedAt = new Date().toISOString();
    
    this.statistics.cancelledSchedules++;
    if (schedule.status === SCHEDULE_STATUS.ACTIVE) {
      this.statistics.activeSchedules--;
    }
    
    await this.deactivateSchedule(scheduleId);
    
    this.emit('schedule-cancelled', {
      scheduleId,
      schedule: this.getScheduleInfo(scheduleId)
    });
  }

  // 停用調度
  async deactivateSchedule(scheduleId) {
    const job = this.activeJobs.get(scheduleId);
    if (job) {
      if (job.cancel) {
        job.cancel();
      } else if (scheduledJobs[scheduleId]) {
        scheduledJobs[scheduleId].cancel();
      }
      this.activeJobs.delete(scheduleId);
    }
    
    this.emit('schedule-deactivated', { scheduleId });
  }

  // 暫停調度
  async pauseSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    if (schedule.status !== SCHEDULE_STATUS.ACTIVE) {
      throw new Error(`Cannot pause schedule in status: ${schedule.status}`);
    }
    
    await this.deactivateSchedule(scheduleId);
    
    schedule.status = SCHEDULE_STATUS.PENDING;
    schedule.updatedAt = new Date().toISOString();
    
    this.statistics.activeSchedules--;
    
    this.emit('schedule-paused', {
      scheduleId,
      schedule: this.getScheduleInfo(scheduleId)
    });
  }

  // 恢復調度
  async resumeSchedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    if (schedule.status !== SCHEDULE_STATUS.PENDING) {
      throw new Error(`Cannot resume schedule in status: ${schedule.status}`);
    }
    
    await this.activateSchedule(scheduleId);
    
    this.emit('schedule-resumed', {
      scheduleId,
      schedule: this.getScheduleInfo(scheduleId)
    });
  }

  // 更新調度
  async updateSchedule(scheduleId, updates) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    const wasActive = schedule.status === SCHEDULE_STATUS.ACTIVE;
    
    // 如果調度是活動的，先停用
    if (wasActive) {
      await this.deactivateSchedule(scheduleId);
    }
    
    // 應用更新
    if (updates.name) schedule.name = updates.name;
    if (updates.description) schedule.description = updates.description;
    if (updates.migrationConfig) {
      schedule.migrationConfig = { ...schedule.migrationConfig, ...updates.migrationConfig };
    }
    if (updates.options) {
      schedule.options = { ...schedule.options, ...updates.options };
    }
    
    // 更新觸發器
    if (updates.trigger) {
      schedule.trigger = this.buildScheduleTrigger(updates.trigger);
      schedule.nextExecutionAt = this.calculateNextExecution(schedule);
    }
    
    schedule.updatedAt = new Date().toISOString();
    
    // 如果之前是活動的，重新激活
    if (wasActive && schedule.status !== SCHEDULE_STATUS.CANCELLED) {
      await this.activateSchedule(scheduleId);
    }
    
    // 持久化更新
    if (this.config.enablePersistence) {
      await this.persistSchedule(schedule);
    }
    
    this.emit('schedule-updated', {
      scheduleId,
      updates,
      schedule: this.getScheduleInfo(scheduleId)
    });
  }

  // 計算下次執行時間
  calculateNextExecution(schedule) {
    const { trigger } = schedule;
    const now = new Date();
    
    switch (trigger.type) {
      case SCHEDULE_TYPES.ONE_TIME:
        return trigger.datetime > now ? trigger.datetime.toISOString() : null;
        
      case SCHEDULE_TYPES.INTERVAL:
        return new Date(now.getTime() + trigger.interval).toISOString();
        
      case SCHEDULE_TYPES.CRON:
      case SCHEDULE_TYPES.RECURRING:
        // 這裡需要根據 cron 表達式或週期規則計算
        // 簡化實現，返回明天同一時間
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString();
        
      default:
        return null;
    }
  }

  // 更新平均執行時間
  updateAverageExecutionTime(schedule, executionTime) {
    const { successfulExecutions } = schedule.statistics;
    const currentAverage = schedule.statistics.averageExecutionTime;
    
    schedule.statistics.averageExecutionTime = 
      ((currentAverage * (successfulExecutions - 1)) + executionTime) / successfulExecutions;
  }

  // 獲取調度信息
  getScheduleInfo(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;
    
    return {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      type: schedule.trigger.type,
      status: schedule.status,
      nextExecutionAt: schedule.nextExecutionAt,
      lastExecutedAt: schedule.lastExecutedAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      statistics: schedule.statistics,
      retryCount: schedule.retryCount,
      options: schedule.options
    };
  }

  // 獲取所有調度
  getAllSchedules() {
    return Array.from(this.schedules.values()).map(schedule => 
      this.getScheduleInfo(schedule.id)
    );
  }

  // 獲取活動調度
  getActiveSchedules() {
    return Array.from(this.schedules.values())
      .filter(schedule => schedule.status === SCHEDULE_STATUS.ACTIVE)
      .map(schedule => this.getScheduleInfo(schedule.id));
  }

  // 獲取即將執行的調度
  getUpcomingSchedules(limit = 10) {
    return Array.from(this.schedules.values())
      .filter(schedule => 
        schedule.status === SCHEDULE_STATUS.ACTIVE && 
        schedule.nextExecutionAt
      )
      .sort((a, b) => 
        new Date(a.nextExecutionAt) - new Date(b.nextExecutionAt)
      )
      .slice(0, limit)
      .map(schedule => this.getScheduleInfo(schedule.id));
  }

  // 獲取統計資訊
  getStatistics() {
    // 更新下次執行時間
    const upcomingSchedules = this.getUpcomingSchedules(1);
    this.statistics.nextExecution = upcomingSchedules.length > 0 
      ? upcomingSchedules[0].nextExecutionAt 
      : null;
    
    return {
      ...this.statistics,
      totalSchedulesInMemory: this.schedules.size,
      scheduleHistoryCount: this.scheduleHistory.length
    };
  }

  // 處理調度批次完成
  handleScheduledBatchCompleted(data) {
    const { batchId, batch } = data;
    const scheduleId = batch?.metadata?.scheduleId;
    
    if (scheduleId) {
      this.emit('scheduled-batch-completed', {
        scheduleId,
        batchId,
        batch
      });
    }
  }

  // 處理調度批次失敗
  handleScheduledBatchFailed(data) {
    const { batchId, batch, error } = data;
    const scheduleId = batch?.metadata?.scheduleId;
    
    if (scheduleId) {
      this.emit('scheduled-batch-failed', {
        scheduleId,
        batchId,
        batch,
        error
      });
    }
  }

  // 處理調度作業完成
  handleScheduledJobCompleted(data) {
    // 處理調度相關的作業完成事件
    this.emit('scheduled-job-completed', data);
  }

  // 啟動監控
  startMonitoring() {
    // 每分鐘檢查調度狀態
    setInterval(() => {
      this.updateStatistics();
    }, 60000);
    
    // 每小時清理過期的執行歷史
    setInterval(() => {
      this.cleanupExecutionHistory();
    }, 60 * 60 * 1000);
  }

  // 更新統計資訊
  updateStatistics() {
    let activeCount = 0;
    
    for (const schedule of this.schedules.values()) {
      if (schedule.status === SCHEDULE_STATUS.ACTIVE) {
        activeCount++;
      }
    }
    
    this.statistics.activeSchedules = activeCount;
    
    this.emit('statistics-updated', this.getStatistics());
  }

  // 清理執行歷史
  cleanupExecutionHistory() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    const cutoff = Date.now() - maxAge;
    
    for (const schedule of this.schedules.values()) {
      schedule.executionHistory = schedule.executionHistory.filter(
        execution => new Date(execution.startTime).getTime() > cutoff
      );
    }
    
    this.emit('execution-history-cleaned');
  }

  // 持久化調度
  async persistSchedule(schedule) {
    // 實現調度持久化邏輯（可使用 localStorage、IndexedDB 或外部存儲）
    if (typeof window !== 'undefined' && window.localStorage) {
      const key = `migration_schedule_${schedule.id}`;
      localStorage.setItem(key, JSON.stringify(schedule));
    }
  }

  // 載入持久化的調度
  async loadPersistedSchedules() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('migration_schedule_')
      );
      
      for (const key of keys) {
        try {
          const schedule = JSON.parse(localStorage.getItem(key));
          this.schedules.set(schedule.id, schedule);
          
          // 如果調度應該是活動的，重新激活
          if (schedule.status === SCHEDULE_STATUS.ACTIVE) {
            await this.activateSchedule(schedule.id);
          }
        } catch (error) {
          console.warn(`Failed to load persisted schedule from ${key}:`, error);
        }
      }
    }
  }

  // 刪除持久化的調度
  async deletePersistedSchedule(scheduleId) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const key = `migration_schedule_${scheduleId}`;
      localStorage.removeItem(key);
    }
  }

  // 關閉調度器
  async shutdown() {
    // 取消所有活動調度
    for (const scheduleId of this.activeJobs.keys()) {
      await this.deactivateSchedule(scheduleId);
    }
    
    // 關閉依賴服務
    await this.batchProcessor.shutdown();
    await this.queueManager.shutdown();
    
    this.emit('shutdown');
  }
}

export default MigrationScheduler;