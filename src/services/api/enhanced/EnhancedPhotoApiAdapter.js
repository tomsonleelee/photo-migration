import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { 
  PhotoMigrationError, 
  NetworkError, 
  AuthenticationError, 
  RateLimitError, 
  TimeoutError,
  PlatformError,
  ErrorFactory 
} from '../../errors/ErrorTypes.js';
import { RetryManager, RetryPresets } from '../../retry/RetryManager.js';

/**
 * 增強版 PhotoApiAdapter
 * 整合了新的錯誤處理和重試機制
 */
export class EnhancedPhotoApiAdapter extends PhotoApiAdapter {
  constructor(platform, authManager, rateLimiter = null, options = {}) {
    super(platform, authManager, rateLimiter);
    
    // 初始化增強功能
    this.retryManager = options.retryManager || new RetryManager(RetryPresets.STANDARD);
    this.errorHandler = options.errorHandler || null;
    this.timeoutMs = options.timeoutMs || 30000;
    this.enableMetrics = options.enableMetrics !== false;
    
    // 初始化指標收集
    if (this.enableMetrics) {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalRetries: 0,
        avgResponseTime: 0,
        errorsByType: new Map(),
        lastActivity: null
      };
    }
  }

  /**
   * 執行 API 呼叫並進行錯誤處理和重試
   * @param {Function} apiCall - API 呼叫函數
   * @param {Object} context - 執行上下文
   * @returns {Promise<any>} API 回應
   */
  async executeApiCall(apiCall, context = {}) {
    const startTime = Date.now();
    
    try {
      const result = await this.retryManager.executeWithRetry(
        async () => {
          return await this.executeWithTimeoutAndRateLimit(apiCall, context);
        },
        {
          operationId: context.operationId,
          operationName: `${this.platform}.${context.operation || 'unknown'}`,
          retryConfig: {
            ...context.retryConfig,
            onRetry: async (error, attempt, config) => {
              // 記錄重試
              this.logRetry(error, attempt, context);
              
              // 呼叫外部重試回調
              if (context.onRetry) {
                await context.onRetry(error, attempt, config);
              }
            }
          }
        }
      );

      // 記錄成功指標
      this.recordSuccess(Date.now() - startTime, context);
      
      return result;

    } catch (error) {
      // 轉換和處理錯誤
      const enhancedError = this.enhanceError(error, context);
      
      // 記錄失敗指標
      this.recordFailure(enhancedError, Date.now() - startTime, context);
      
      // 呼叫錯誤處理器
      if (this.errorHandler) {
        await this.errorHandler.handleError(enhancedError, {
          ...context,
          platform: this.platform,
          component: 'PhotoApiAdapter',
          operation: context.operation
        });
      }
      
      throw enhancedError;
    }
  }

  /**
   * 執行API呼叫並套用超時和速率限制
   * @param {Function} apiCall - API 呼叫函數
   * @param {Object} context - 執行上下文
   * @returns {Promise<any>} API 回應
   */
  async executeWithTimeoutAndRateLimit(apiCall, context = {}) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(
          `API call timed out after ${this.timeoutMs}ms`,
          this.timeoutMs,
          { platform: this.platform, operation: context.operation }
        ));
      }, this.timeoutMs);
    });

    // 套用速率限制
    const executeCall = async () => {
      if (this.rateLimiter) {
        return await this.rateLimiter.schedule(apiCall);
      } else {
        return await apiCall();
      }
    };

    return Promise.race([executeCall(), timeoutPromise]);
  }

  /**
   * 增強錯誤物件
   * @param {Error} error - 原始錯誤
   * @param {Object} context - 執行上下文
   * @returns {PhotoMigrationError} 增強的錯誤物件
   */
  enhanceError(error, context = {}) {
    // 如果已經是增強錯誤，直接返回
    if (error instanceof PhotoMigrationError) {
      return error;
    }

    // 根據錯誤類型和內容創建適當的錯誤
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return new TimeoutError(
        error.message || 'Request timeout',
        this.timeoutMs,
        { 
          platform: this.platform, 
          operation: context.operation,
          originalError: error 
        }
      );
    }

    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return new NetworkError(
        error.message || 'Network error',
        { 
          platform: this.platform, 
          operation: context.operation,
          originalError: error 
        }
      );
    }

    if (error.status) {
      // HTTP 錯誤，使用 ErrorFactory 處理
      return ErrorFactory.fromApiError(error, {
        platform: this.platform,
        operation: context.operation,
        fileName: context.fileName,
        requiredPermission: context.requiredPermission
      });
    }

    // 預設為平台錯誤
    return new PlatformError(
      error.message || 'Unknown platform error',
      this.platform,
      error.code || 'UNKNOWN',
      { 
        operation: context.operation,
        originalError: error 
      }
    );
  }

  /**
   * 記錄重試事件
   * @param {Error} error - 錯誤物件
   * @param {number} attempt - 重試次數
   * @param {Object} context - 執行上下文
   */
  logRetry(error, attempt, context) {
    this.logActivity('api_retry', {
      operation: context.operation,
      attempt,
      errorCode: error.code,
      errorMessage: error.message
    });

    if (this.enableMetrics) {
      this.metrics.totalRetries++;
    }
  }

  /**
   * 記錄成功指標
   * @param {number} responseTime - 回應時間
   * @param {Object} context - 執行上下文
   */
  recordSuccess(responseTime, context) {
    if (!this.enableMetrics) return;

    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.avgResponseTime = (
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests;
    this.metrics.lastActivity = new Date();

    this.logActivity('api_success', {
      operation: context.operation,
      responseTime
    });
  }

  /**
   * 記錄失敗指標
   * @param {Error} error - 錯誤物件
   * @param {number} responseTime - 回應時間
   * @param {Object} context - 執行上下文
   */
  recordFailure(error, responseTime, context) {
    if (!this.enableMetrics) return;

    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastActivity = new Date();

    // 錯誤類型統計
    const errorType = error.code || error.name || 'UNKNOWN';
    this.metrics.errorsByType.set(
      errorType,
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );

    this.logActivity('api_failure', {
      operation: context.operation,
      responseTime,
      errorCode: error.code,
      errorMessage: error.message,
      errorType
    });
  }

  /**
   * 覆寫父類別的 executeWithRetry 方法
   */
  async executeWithRetry(apiCall, retries = 3, context = {}) {
    return this.executeApiCall(apiCall, {
      ...context,
      retryConfig: {
        maxAttempts: retries + 1,
        ...context.retryConfig
      }
    });
  }

  /**
   * 獲取適配器指標
   * @returns {Object} 指標物件
   */
  getMetrics() {
    if (!this.enableMetrics) {
      return null;
    }

    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? this.metrics.successfulRequests / this.metrics.totalRequests 
        : 0,
      failureRate: this.metrics.totalRequests > 0 
        ? this.metrics.failedRequests / this.metrics.totalRequests 
        : 0,
      retryStats: this.retryManager.getStats()
    };
  }

  /**
   * 重置指標
   */
  resetMetrics() {
    if (this.enableMetrics) {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalRetries: 0,
        avgResponseTime: 0,
        errorsByType: new Map(),
        lastActivity: null
      };
    }
    
    this.retryManager.resetStats();
  }

  /**
   * 設定錯誤處理器
   * @param {Object} errorHandler - 錯誤處理器
   */
  setErrorHandler(errorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 測試連線（覆寫）
   * @returns {Promise<Object>} 連線測試結果
   */
  async testConnection() {
    try {
      const profile = await this.executeApiCall(
        () => super.getUserProfile(),
        { operation: 'testConnection' }
      );
      
      return {
        success: true,
        platform: this.platform,
        user: profile,
        timestamp: new Date(),
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error.userMessage || error.message,
        errorCode: error.code,
        timestamp: new Date(),
        metrics: this.getMetrics()
      };
    }
  }

  /**
   * 檢查是否已認證（覆寫）
   * @returns {Promise<Object>} 認證狀態
   */
  async isAuthenticated() {
    try {
      const isAuth = await super.isAuthenticated();
      
      if (isAuth) {
        // 進一步驗證 token 是否有效
        await this.executeApiCall(
          () => super.getUserProfile(),
          { 
            operation: 'validateAuth',
            retryConfig: { maxAttempts: 1 } // 認證檢查不重試
          }
        );
      }
      
      return {
        authenticated: isAuth,
        platform: this.platform,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        authenticated: false,
        platform: this.platform,
        error: error.userMessage || error.message,
        errorCode: error.code,
        timestamp: new Date()
      };
    }
  }

  /**
   * 健康檢查
   * @returns {Promise<Object>} 健康狀態
   */
  async healthCheck() {
    const health = {
      platform: this.platform,
      timestamp: new Date(),
      status: 'healthy',
      checks: []
    };

    try {
      // 檢查認證
      const authCheck = await this.isAuthenticated();
      health.checks.push({
        name: 'authentication',
        status: authCheck.authenticated ? 'pass' : 'fail',
        details: authCheck
      });

      // 檢查連線
      if (authCheck.authenticated) {
        const connectionCheck = await this.testConnection();
        health.checks.push({
          name: 'connection',
          status: connectionCheck.success ? 'pass' : 'fail',
          details: connectionCheck
        });
      }

      // 檢查速率限制狀態
      if (this.rateLimiter) {
        health.checks.push({
          name: 'rate_limiting',
          status: 'pass',
          details: {
            available: this.rateLimiter.empty,
            pending: this.rateLimiter.pending
          }
        });
      }

      // 檢查重試管理器狀態
      const retryStats = this.retryManager.getStats();
      health.checks.push({
        name: 'retry_manager',
        status: retryStats.activeRetries.length > 10 ? 'warn' : 'pass',
        details: retryStats
      });

      // 判斷整體健康狀態
      const failedChecks = health.checks.filter(check => check.status === 'fail');
      const warnChecks = health.checks.filter(check => check.status === 'warn');
      
      if (failedChecks.length > 0) {
        health.status = 'unhealthy';
      } else if (warnChecks.length > 0) {
        health.status = 'degraded';
      }

      // 添加指標
      health.metrics = this.getMetrics();

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.userMessage || error.message;
      health.errorCode = error.code;
    }

    return health;
  }
}

export default EnhancedPhotoApiAdapter;