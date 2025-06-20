// 批量處理模組統一入口
export { 
  BatchProcessor, 
  BATCH_STATUS, 
  TASK_STATUS, 
  BATCH_PRIORITY 
} from './BatchProcessor.js';

export { 
  BatchQueueManager, 
  QUEUE_TYPES, 
  JOB_STATUS, 
  JOB_PRIORITY 
} from './BatchQueueManager.js';

export { 
  MigrationScheduler, 
  SCHEDULE_TYPES, 
  SCHEDULE_STATUS, 
  RECURRENCE_TYPES 
} from './MigrationScheduler.js';

export { 
  ConcurrencyManager, 
  CONCURRENCY_STRATEGIES, 
  RESOURCE_TYPES 
} from './ConcurrencyManager.js';

// 批量處理服務工廠
export class BatchServiceFactory {
  static createBatchProcessor(options = {}) {
    return new BatchProcessor(options);
  }
  
  static createQueueManager(redisConfig = {}) {
    return new BatchQueueManager(redisConfig);
  }
  
  static createScheduler(options = {}) {
    return new MigrationScheduler(options);
  }
  
  static createConcurrencyManager(options = {}) {
    return new ConcurrencyManager(options);
  }
  
  // 創建完整的批量處理系統
  static createBatchSystem(config = {}) {
    const {
      batchOptions = {},
      queueConfig = {},
      schedulerOptions = {},
      concurrencyOptions = {}
    } = config;
    
    const batchProcessor = new BatchProcessor(batchOptions);
    const queueManager = new BatchQueueManager(queueConfig);
    const scheduler = new MigrationScheduler(schedulerOptions);
    const concurrencyManager = new ConcurrencyManager(concurrencyOptions);
    
    return {
      batchProcessor,
      queueManager,
      scheduler,
      concurrencyManager
    };
  }
}

export default BatchServiceFactory;