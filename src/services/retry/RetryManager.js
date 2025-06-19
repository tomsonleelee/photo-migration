import { PhotoMigrationError, RateLimitError, NetworkError, TimeoutError } from '../errors/ErrorTypes.js';

// 重試配置類別
export class RetryConfig {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffFactor = options.backoffFactor || 2;
    this.jitter = options.jitter !== undefined ? options.jitter : true;
    this.retryCondition = options.retryCondition || this.defaultRetryCondition;
    this.onRetry = options.onRetry || null;
    this.retryAfterHeader = options.retryAfterHeader !== undefined ? options.retryAfterHeader : true;
  }

  defaultRetryCondition(error, attempt) {
    // 預設重試條件
    if (!error.retryable) return false;
    
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR', 
      'RATE_LIMIT_ERROR',
      'FILE_PROCESSING_ERROR',
      'PLATFORM_ERROR',
      'CONCURRENCY_ERROR'
    ];

    return retryableCodes.includes(error.code);
  }
}

// 重試統計類別
export class RetryStats {
  constructor() {
    this.totalOperations = 0;
    this.successfulOperations = 0;
    this.failedOperations = 0;
    this.totalRetries = 0;
    this.retriesPerError = new Map();
    this.avgRetryCount = 0;
    this.maxRetryCount = 0;
  }

  recordOperation(attempts, success) {
    this.totalOperations++;
    
    if (success) {
      this.successfulOperations++;
    } else {
      this.failedOperations++;
    }

    if (attempts > 1) {
      const retries = attempts - 1;
      this.totalRetries += retries;
      this.maxRetryCount = Math.max(this.maxRetryCount, retries);
      this.avgRetryCount = this.totalRetries / this.totalOperations;
    }
  }

  recordErrorRetry(errorCode) {
    const count = this.retriesPerError.get(errorCode) || 0;
    this.retriesPerError.set(errorCode, count + 1);
  }

  getStats() {
    return {
      totalOperations: this.totalOperations,
      successRate: this.totalOperations > 0 ? this.successfulOperations / this.totalOperations : 0,
      failureRate: this.totalOperations > 0 ? this.failedOperations / this.totalOperations : 0,
      totalRetries: this.totalRetries,
      avgRetryCount: this.avgRetryCount,
      maxRetryCount: this.maxRetryCount,
      retriesPerError: Object.fromEntries(this.retriesPerError)
    };
  }
}

// 重試管理器主類別
export class RetryManager {
  constructor(defaultConfig = {}) {
    this.defaultConfig = new RetryConfig(defaultConfig);
    this.stats = new RetryStats();
    this.activeRetries = new Map(); // 追蹤進行中的重試
  }

  async executeWithRetry(operation, context = {}) {
    const config = new RetryConfig({ ...this.defaultConfig, ...context.retryConfig });
    const operationId = context.operationId || this.generateOperationId();
    
    let lastError;
    let attempt = 1;

    // 記錄重試操作
    this.activeRetries.set(operationId, {
      startTime: Date.now(),
      attempts: 0,
      maxAttempts: config.maxAttempts,
      operation: context.operationName || 'Unknown Operation'
    });

    try {
      while (attempt <= config.maxAttempts) {
        this.updateRetryStatus(operationId, attempt);

        try {
          const result = await operation();
          this.stats.recordOperation(attempt, true);
          this.activeRetries.delete(operationId);
          return result;
        } catch (error) {
          lastError = this.wrapError(error);
          
          // 檢查是否應該重試
          if (!this.shouldRetry(lastError, attempt, config)) {
            break;
          }

          // 記錄重試統計
          this.stats.recordErrorRetry(lastError.code);

          // 通知重試回調
          if (config.onRetry) {
            await config.onRetry(lastError, attempt, config);
          }

          // 計算延遲時間
          const delay = await this.calculateDelay(lastError, attempt, config);
          
          // 執行延遲
          if (delay > 0) {
            await this.sleep(delay);
          }

          attempt++;
        }
      }

      // 所有重試都失敗了
      this.stats.recordOperation(attempt - 1, false);
      this.activeRetries.delete(operationId);
      throw lastError;

    } catch (error) {
      this.activeRetries.delete(operationId);
      throw error;
    }
  }

  shouldRetry(error, attempt, config) {
    if (attempt >= config.maxAttempts) {
      return false;
    }

    return config.retryCondition(error, attempt);
  }

  async calculateDelay(error, attempt, config) {
    // 處理 Rate Limit 錯誤的特殊延遲
    if (error instanceof RateLimitError && config.retryAfterHeader) {
      return Math.min(error.retryAfter * 1000, config.maxDelay);
    }

    // 計算指數退避延遲
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    // 添加隨機抖動
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% 抖動
      const jitter = Math.random() * jitterRange * 2 - jitterRange;
      delay += jitter;
    }

    return Math.max(0, Math.floor(delay));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  wrapError(error) {
    if (error instanceof PhotoMigrationError) {
      return error;
    }

    // 包裝原始錯誤為系統錯誤
    return new PhotoMigrationError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }

  generateOperationId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateRetryStatus(operationId, attempt) {
    const retryInfo = this.activeRetries.get(operationId);
    if (retryInfo) {
      retryInfo.attempts = attempt;
      retryInfo.lastAttemptTime = Date.now();
    }
  }

  // 取得進行中的重試操作
  getActiveRetries() {
    return Array.from(this.activeRetries.entries()).map(([id, info]) => ({
      id,
      ...info,
      duration: Date.now() - info.startTime
    }));
  }

  // 取消指定的重試操作
  cancelRetry(operationId) {
    return this.activeRetries.delete(operationId);
  }

  // 取消所有重試操作
  cancelAllRetries() {
    const count = this.activeRetries.size;
    this.activeRetries.clear();
    return count;
  }

  // 重置統計
  resetStats() {
    this.stats = new RetryStats();
  }

  // 取得統計資訊
  getStats() {
    return {
      ...this.stats.getStats(),
      activeRetries: this.getActiveRetries()
    };
  }
}

// 預設配置常數
export const RetryPresets = {
  // 快速重試 - 適用於輕量級操作
  FAST: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5,
    jitter: true
  },

  // 標準重試 - 適用於一般 API 呼叫
  STANDARD: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffFactor: 2,
    jitter: true
  },

  // 穩健重試 - 適用於重要操作
  ROBUST: {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  },

  // 檔案操作重試 - 適用於檔案上傳/下載
  FILE_OPERATIONS: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffFactor: 1.8,
    jitter: true,
    retryCondition: (error, attempt) => {
      const fileRetryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'FILE_PROCESSING_ERROR'
      ];
      return fileRetryableCodes.includes(error.code);
    }
  },

  // 認證重試 - 適用於認證操作
  AUTHENTICATION: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    jitter: false,
    retryCondition: (error, attempt) => {
      // 認證錯誤通常不應該重試
      return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR';
    }
  }
};

// 建立預設重試管理器實例
export const defaultRetryManager = new RetryManager(RetryPresets.STANDARD);
export const fileRetryManager = new RetryManager(RetryPresets.FILE_OPERATIONS);
export const authRetryManager = new RetryManager(RetryPresets.AUTHENTICATION);

// 輔助函數：建立重試裝飾器
export function withRetry(retryManager = defaultRetryManager, retryConfig = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const context = {
        operationName: `${target.constructor.name}.${propertyKey}`,
        retryConfig,
        ...args[args.length - 1]?.retryContext
      };

      return retryManager.executeWithRetry(
        () => originalMethod.apply(this, args),
        context
      );
    };

    return descriptor;
  };
}

// 輔助函數：建立非同步操作的重試版本
export function createRetryableOperation(operation, retryManager = defaultRetryManager, retryConfig = {}) {
  return async (context = {}) => {
    return retryManager.executeWithRetry(operation, {
      retryConfig,
      ...context
    });
  };
}