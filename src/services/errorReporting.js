// 錯誤報告服務
import { ErrorClassifier } from '../utils/errors';

// 錯誤報告配置
const REPORTING_CONFIG = {
  endpoint: '/api/errors/report',
  batchSize: 10,
  batchDelay: 5000, // 5秒
  maxRetries: 3,
  retryDelay: 1000,
  enabledEnvironments: ['production', 'staging'],
  sensitiveFields: ['token', 'password', 'email', 'userId']
};

class ErrorReportingService {
  constructor(config = {}) {
    this.config = { ...REPORTING_CONFIG, ...config };
    this.pendingReports = [];
    this.reportQueue = [];
    this.batchTimer = null;
    this.isReporting = false;
  }

  // 報告單個錯誤
  async reportError(error, context = {}, options = {}) {
    // 檢查是否應該報告此錯誤
    if (!this.shouldReport(error)) {
      return { success: false, reason: 'Error not reportable' };
    }

    // 創建錯誤報告
    const report = this.createErrorReport(error, context);
    
    if (options.immediate) {
      return this.sendImmediateReport(report);
    } else {
      return this.queueReport(report);
    }
  }

  // 批量報告錯誤
  async reportBatch(errors, context = {}) {
    const reports = errors
      .filter(error => this.shouldReport(error))
      .map(error => this.createErrorReport(error, context));

    if (reports.length === 0) {
      return { success: true, reported: 0 };
    }

    return this.sendBatchReport(reports);
  }

  // 檢查是否應該報告錯誤
  shouldReport(error) {
    // 檢查環境
    const currentEnv = process.env.NODE_ENV || 'development';
    if (!this.config.enabledEnvironments.includes(currentEnv)) {
      return false;
    }

    // 使用錯誤分類器判斷
    return ErrorClassifier.shouldReport(error);
  }

  // 創建錯誤報告
  createErrorReport(error, context = {}) {
    const classification = ErrorClassifier.classify(error);
    
    return {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...this.sanitizeErrorData(error)
      },
      classification,
      context: this.sanitizeContext({
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userId: this.getUserId()
      }),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        version: process.env.REACT_APP_VERSION || 'unknown',
        buildTime: process.env.REACT_APP_BUILD_TIME || 'unknown'
      },
      breadcrumbs: this.getBreadcrumbs()
    };
  }

  // 清理敏感數據
  sanitizeErrorData(error) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(error)) {
      if (!this.config.sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = this.sanitizeValue(value);
      }
    }
    
    return sanitized;
  }

  // 清理上下文數據
  sanitizeContext(context) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (!this.config.sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = this.sanitizeValue(value);
      }
    }
    
    return sanitized;
  }

  // 清理敏感值
  sanitizeValue(value) {
    if (typeof value === 'string') {
      // 遮罩可能的敏感信息
      return value
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
        .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
        .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [TOKEN]');
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [k, v] of Object.entries(value)) {
        if (!this.config.sensitiveFields.includes(k.toLowerCase())) {
          sanitized[k] = this.sanitizeValue(v);
        }
      }
      return sanitized;
    }
    
    return value;
  }

  // 立即發送報告
  async sendImmediateReport(report) {
    try {
      const response = await this.sendRequest([report]);
      return { success: true, response };
    } catch (error) {
      console.error('Failed to send immediate error report:', error);
      return { success: false, error };
    }
  }

  // 加入報告隊列
  queueReport(report) {
    this.reportQueue.push(report);
    
    // 如果達到批次大小，立即發送
    if (this.reportQueue.length >= this.config.batchSize) {
      this.flushQueue();
      return { success: true, queued: true, immediate: true };
    }
    
    // 設置批次定時器
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushQueue();
      }, this.config.batchDelay);
    }
    
    return { success: true, queued: true, immediate: false };
  }

  // 清空隊列並發送
  async flushQueue() {
    if (this.reportQueue.length === 0 || this.isReporting) {
      return;
    }

    const reports = [...this.reportQueue];
    this.reportQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    return this.sendBatchReport(reports);
  }

  // 發送批次報告
  async sendBatchReport(reports) {
    if (this.isReporting) {
      // 如果正在報告中，將報告加回隊列
      this.reportQueue.unshift(...reports);
      return { success: false, reason: 'Already reporting' };
    }

    this.isReporting = true;
    
    try {
      const response = await this.sendRequest(reports);
      return { success: true, reported: reports.length, response };
    } catch (error) {
      console.error('Failed to send batch error reports:', error);
      
      // 如果發送失敗，將報告加回隊列等待重試
      this.reportQueue.unshift(...reports);
      
      return { success: false, error, reports: reports.length };
    } finally {
      this.isReporting = false;
    }
  }

  // 發送 HTTP 請求
  async sendRequest(reports, retryCount = 0) {
    const requestData = {
      reports,
      metadata: {
        timestamp: new Date().toISOString(),
        batchSize: reports.length,
        clientVersion: process.env.REACT_APP_VERSION || 'unknown'
      }
    };

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        // 等待後重試
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.sendRequest(reports, retryCount + 1);
      }
      
      throw error;
    }
  }

  // 工具方法
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    // 從 sessionStorage 或生成新的 session ID
    let sessionId = sessionStorage.getItem('errorReportingSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorReportingSessionId', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    // 從認證上下文或本地存儲獲取用戶 ID
    try {
      const authData = localStorage.getItem('authData');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.userId || null;
      }
    } catch (error) {
      // 忽略解析錯誤
    }
    return null;
  }

  getBreadcrumbs() {
    // 返回用戶操作的面包屑追蹤（如果有實現的話）
    return [];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 獲取報告統計
  getStats() {
    return {
      queueLength: this.reportQueue.length,
      isReporting: this.isReporting,
      hasPendingBatch: !!this.batchTimer
    };
  }

  // 清除隊列
  clearQueue() {
    this.reportQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// 全局錯誤報告服務實例
export const globalErrorReporting = new ErrorReportingService();

// 導出類和實例
export { ErrorReportingService };
export default globalErrorReporting;