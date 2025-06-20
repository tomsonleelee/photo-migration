import { NetworkError, TimeoutError, ApiError, BaseError } from './errors';

// 重試配置選項
export class RetryConfig {
  constructor({
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    jitter = true,
    retryCondition = null,
    onRetry = null,
    timeout = null
  } = {}) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.backoffMultiplier = backoffMultiplier;
    this.jitter = jitter;
    this.retryCondition = retryCondition;
    this.onRetry = onRetry;
    this.timeout = timeout;
  }

  // 計算重試延遲時間
  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    
    // 限制最大延遲
    delay = Math.min(delay, this.maxDelay);
    
    // 添加隨機抖動以避免雷群效應
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.round(delay);
  }

  // 檢查是否應該重試
  shouldRetry(error, attempt) {
    if (attempt >= this.maxAttempts) {
      return false;
    }

    // 使用自定義重試條件
    if (this.retryCondition) {
      return this.retryCondition(error, attempt);
    }

    // 默認重試條件
    return this.defaultRetryCondition(error);
  }

  defaultRetryCondition(error) {
    // 網路錯誤總是重試
    if (error instanceof NetworkError) {
      return true;
    }

    // 超時錯誤總是重試
    if (error instanceof TimeoutError) {
      return true;
    }

    // API 錯誤根據狀態碼決定
    if (error instanceof ApiError) {
      // 5xx 伺服器錯誤和 429 限流錯誤可以重試
      return error.statusCode >= 500 || error.statusCode === 429;
    }

    // 自定義錯誤根據 retryable 屬性決定
    if (error instanceof BaseError) {
      return error.retryable;
    }

    // 原生 JavaScript 錯誤通常不重試
    return false;
  }
}

// 重試管理器
export class RetryManager {
  constructor() {
    this.activeRetries = new Map();
    this.retryStats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    };
  }

  // 執行帶重試的操作
  async executeWithRetry(operation, config = new RetryConfig()) {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    this.activeRetries.set(operationId, {
      operation,
      config,
      startTime,
      attempts: 0
    });

    try {
      const result = await this._executeOperation(operationId, operation, config);
      this._recordSuccess(operationId);
      return result;
    } catch (error) {
      this._recordFailure(operationId);
      throw error;
    } finally {
      this.activeRetries.delete(operationId);
    }
  }

  // 內部執行操作
  async _executeOperation(operationId, operation, config) {
    let lastError;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const retryInfo = this.activeRetries.get(operationId);
      if (retryInfo) {
        retryInfo.attempts = attempt;
      }

      try {
        // 添加超時控制
        if (config.timeout) {
          return await this._withTimeout(operation(), config.timeout);
        } else {
          return await operation();
        }
      } catch (error) {
        lastError = error;
        this.retryStats.totalAttempts++;

        // 檢查是否應該重試
        if (!config.shouldRetry(error, attempt)) {
          throw error;
        }

        // 如果不是最後一次嘗試，等待後重試
        if (attempt < config.maxAttempts) {
          const delay = config.calculateDelay(attempt);
          
          // 調用重試回調
          if (config.onRetry) {
            config.onRetry(error, attempt, delay);
          }

          await this._delay(delay);
        }
      }
    }

    // 所有重試都失敗，拋出最後一個錯誤
    throw lastError;
  }

  // 添加超時控制
  async _withTimeout(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`, 'operation', timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // 延遲函數
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 生成操作ID
  generateOperationId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 記錄成功
  _recordSuccess(operationId) {
    const retryInfo = this.activeRetries.get(operationId);
    if (retryInfo && retryInfo.attempts > 1) {
      this.retryStats.successfulRetries++;
      this._updateAverageAttempts();
    }
  }

  // 記錄失敗
  _recordFailure(operationId) {
    const retryInfo = this.activeRetries.get(operationId);
    if (retryInfo && retryInfo.attempts > 1) {
      this.retryStats.failedRetries++;
      this._updateAverageAttempts();
    }
  }

  // 更新平均重試次數
  _updateAverageAttempts() {
    const totalRetries = this.retryStats.successfulRetries + this.retryStats.failedRetries;
    if (totalRetries > 0) {
      this.retryStats.averageAttempts = this.retryStats.totalAttempts / totalRetries;
    }
  }

  // 取消所有重試
  cancelAllRetries() {
    this.activeRetries.clear();
  }

  // 取消特定重試
  cancelRetry(operationId) {
    this.activeRetries.delete(operationId);
  }

  // 獲取重試統計
  getStats() {
    return {
      ...this.retryStats,
      activeRetries: this.activeRetries.size
    };
  }

  // 重置統計
  resetStats() {
    this.retryStats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    };
  }
}

// 預定義的重試配置
export const RetryConfigs = {
  // 網路請求重試
  network: new RetryConfig({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      return error instanceof NetworkError || 
             error instanceof TimeoutError ||
             (error instanceof ApiError && (error.statusCode >= 500 || error.statusCode === 429));
    }
  }),

  // 檔案操作重試
  file: new RetryConfig({
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    retryCondition: (error) => {
      return error.retryable !== false;
    }
  }),

  // API 呼叫重試
  api: new RetryConfig({
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      if (error instanceof ApiError) {
        // 4xx 客戶端錯誤通常不重試（除了 429）
        if (error.statusCode >= 400 && error.statusCode < 500) {
          return error.statusCode === 429;
        }
        // 5xx 伺服器錯誤重試
        return error.statusCode >= 500;
      }
      return error instanceof NetworkError || error instanceof TimeoutError;
    }
  }),

  // 快速重試（用於輕量級操作）
  fast: new RetryConfig({
    maxAttempts: 2,
    baseDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: false
  }),

  // 積極重試（用於關鍵操作）
  aggressive: new RetryConfig({
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2.5,
    retryCondition: (error) => {
      // 除了明確不可重試的錯誤，都嘗試重試
      return error.retryable !== false;
    }
  })
};

// 單例重試管理器
export const globalRetryManager = new RetryManager();

// 便利函數
export const retry = async (operation, config) => {
  return globalRetryManager.executeWithRetry(operation, config);
};

// 裝飾器函數（用於函數）
export const withRetry = (config = RetryConfigs.network) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      return retry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
};

// 高階函數（用於 React 組件）
export const withRetryCapability = (Component) => {
  return function RetryCapableComponent(props) {
    const retryManager = new RetryManager();

    const executeWithRetry = async (operation, config = RetryConfigs.network) => {
      return retryManager.executeWithRetry(operation, config);
    };

    return (
      <Component
        {...props}
        executeWithRetry={executeWithRetry}
        retryManager={retryManager}
      />
    );
  };
};

export default RetryManager;