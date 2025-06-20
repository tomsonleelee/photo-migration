// 安全審計日誌系統
import crypto from 'crypto';

// 安全事件類型
export const SECURITY_EVENT_TYPES = {
  // 認證相關
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET_SUCCESS: 'auth.password.reset.success',
  
  // 雙因子認證
  TFA_SETUP_INITIATED: 'auth.tfa.setup.initiated',
  TFA_SETUP_FAILED: 'auth.tfa.setup.failed',
  TFA_ENABLED: 'auth.tfa.enabled',
  TFA_DISABLED: 'auth.tfa.disabled',
  TFA_DISABLE_FAILED: 'auth.tfa.disable.failed',
  TFA_SUCCESS: 'auth.tfa.success',
  TFA_FAILED: 'auth.tfa.failed',
  TFA_VERIFICATION_FAILED: 'auth.tfa.verification.failed',
  TFA_BACKUP_CODE_USED: 'auth.tfa.backup_code.used',
  TFA_BACKUP_CODES_REGENERATED: 'auth.tfa.backup_codes.regenerated',
  TFA_BACKUP_CODES_REGENERATION_FAILED: 'auth.tfa.backup_codes.regeneration.failed',
  
  // 授權相關
  ACCESS_GRANTED: 'authz.access.granted',
  ACCESS_DENIED: 'authz.access.denied',
  PERMISSION_CHANGE: 'authz.permission.change',
  ROLE_CHANGE: 'authz.role.change',
  
  // 會話管理
  SESSION_CREATE: 'session.create',
  SESSION_DESTROY: 'session.destroy',
  SESSION_TIMEOUT: 'session.timeout',
  SESSION_HIJACK_ATTEMPT: 'session.hijack.attempt',
  
  // 安全攻擊
  CSRF_ATTACK: 'security.csrf.attack',
  XSS_ATTEMPT: 'security.xss.attempt',
  SQL_INJECTION_ATTEMPT: 'security.sqli.attempt',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
  
  // 數據操作
  DATA_ACCESS: 'data.access',
  DATA_MODIFICATION: 'data.modification',
  DATA_DELETION: 'data.deletion',
  DATA_EXPORT: 'data.export',
  SENSITIVE_DATA_ACCESS: 'data.sensitive.access',
  
  // 系統事件
  SYSTEM_CONFIG_CHANGE: 'system.config.change',
  SECURITY_SCAN_START: 'system.scan.start',
  SECURITY_SCAN_COMPLETE: 'system.scan.complete',
  VULNERABILITY_DETECTED: 'system.vulnerability.detected',
  
  // 合規相關
  GDPR_REQUEST: 'compliance.gdpr.request',
  DATA_BREACH_DETECTED: 'compliance.breach.detected',
  PRIVACY_VIOLATION: 'compliance.privacy.violation'
};

// 風險等級
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class SecurityLogger {
  constructor(options = {}) {
    this.options = {
      enableConsoleOutput: options.enableConsoleOutput ?? process.env.NODE_ENV === 'development',
      enableFileOutput: options.enableFileOutput ?? true,
      enableRemoteLogging: options.enableRemoteLogging ?? false,
      logLevel: options.logLevel ?? 'info',
      maxLogSize: options.maxLogSize ?? 10 * 1024 * 1024, // 10MB
      logRotationCount: options.logRotationCount ?? 5,
      maskSensitiveData: options.maskSensitiveData ?? true,
      ...options
    };
    
    this.logBuffer = [];
    this.alertSubscribers = [];
    this.suspiciousActivityThreshold = 10; // 10分鐘內的可疑活動次數
    this.suspiciousActivityWindow = 10 * 60 * 1000; // 10分鐘
    this.recentEvents = new Map();
  }

  // 記錄安全事件
  logSecurityEvent(eventType, details = {}, risk = RISK_LEVELS.LOW) {
    const logEntry = this.createLogEntry(eventType, details, risk);
    
    // 處理日誌輸出
    this.processLogEntry(logEntry);
    
    // 檢查可疑活動
    this.checkSuspiciousActivity(logEntry);
    
    // 觸發警報
    if (risk === RISK_LEVELS.HIGH || risk === RISK_LEVELS.CRITICAL) {
      this.triggerAlert(logEntry);
    }
    
    return logEntry.id;
  }

  // 創建日誌條目
  createLogEntry(eventType, details, risk) {
    const timestamp = new Date().toISOString();
    const id = this.generateLogId();
    
    const logEntry = {
      id,
      timestamp,
      eventType,
      risk,
      details: this.sanitizeDetails(details),
      metadata: {
        userAgent: details.userAgent,
        ipAddress: this.maskIP(details.ipAddress),
        sessionId: this.hashSensitiveData(details.sessionId),
        userId: this.hashSensitiveData(details.userId),
        source: details.source || 'web-app',
        environment: process.env.NODE_ENV || 'unknown'
      }
    };
    
    return logEntry;
  }

  // 清理敏感資料
  sanitizeDetails(details) {
    if (!this.options.maskSensitiveData) {
      return details;
    }
    
    const sanitized = { ...details };
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'email', 'phone', 
      'ssn', 'creditCard', 'bankAccount', 'personalId'
    ];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveData(sanitized[field]);
      }
    }
    
    // 遮罩嵌套對象
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      }
    }
    
    return sanitized;
  }

  // 遮罩敏感資料
  maskSensitiveData(data) {
    if (typeof data !== 'string') {
      return '[MASKED]';
    }
    
    if (data.length <= 4) {
      return '*'.repeat(data.length);
    }
    
    return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
  }

  // 遮罩 IP 地址
  maskIP(ip) {
    if (!ip) return null;
    
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::***';
    } else {
      // IPv4
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.***';
    }
  }

  // 雜湊敏感資料
  hashSensitiveData(data) {
    if (!data) return null;
    
    return crypto.createHash('sha256')
      .update(data.toString())
      .digest('hex')
      .substring(0, 16); // 只取前16個字符
  }

  // 處理日誌條目
  processLogEntry(logEntry) {
    // 添加到緩衝區
    this.logBuffer.push(logEntry);
    
    // 控制台輸出
    if (this.options.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }
    
    // 檔案輸出
    if (this.options.enableFileOutput) {
      this.outputToFile(logEntry);
    }
    
    // 遠程日誌
    if (this.options.enableRemoteLogging) {
      this.outputToRemote(logEntry);
    }
  }

  // 控制台輸出
  outputToConsole(logEntry) {
    const { timestamp, eventType, risk, metadata } = logEntry;
    const riskColor = this.getRiskColor(risk);
    
    console.log(
      `🔒 [${timestamp}] ${riskColor}${risk.toUpperCase()}${'\x1b[0m'} ${eventType}`,
      `IP: ${metadata.ipAddress} User: ${metadata.userId}`
    );
  }

  // 檔案輸出
  async outputToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      // 這裡可以實現檔案寫入邏輯
      // 在瀏覽器環境中，可以使用 localStorage 或 IndexedDB
      if (typeof window !== 'undefined') {
        this.saveToLocalStorage(logEntry);
      }
    } catch (error) {
      console.error('Failed to write security log to file:', error);
    }
  }

  // 本地存儲
  saveToLocalStorage(logEntry) {
    try {
      const key = 'security_logs';
      const existingLogs = JSON.parse(localStorage.getItem(key) || '[]');
      existingLogs.push(logEntry);
      
      // 限制日誌數量
      if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
      }
      
      localStorage.setItem(key, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to save security log to localStorage:', error);
    }
  }

  // 遠程輸出
  async outputToRemote(logEntry) {
    try {
      // 發送到遠程日誌服務（如 ELK Stack, Splunk 等）
      await fetch('/api/security/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send security log to remote service:', error);
    }
  }

  // 檢查可疑活動
  checkSuspiciousActivity(logEntry) {
    const { metadata, eventType, risk } = logEntry;
    const key = `${metadata.ipAddress}-${metadata.userId}`;
    const now = Date.now();
    
    // 獲取或創建用戶活動記錄
    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, []);
    }
    
    const userEvents = this.recentEvents.get(key);
    
    // 清理過期事件
    const validEvents = userEvents.filter(
      event => now - event.timestamp < this.suspiciousActivityWindow
    );
    
    // 添加當前事件
    validEvents.push({
      timestamp: now,
      eventType,
      risk
    });
    
    this.recentEvents.set(key, validEvents);
    
    // 檢查是否超過閾值
    const suspiciousEvents = validEvents.filter(
      event => event.risk === RISK_LEVELS.HIGH || event.risk === RISK_LEVELS.CRITICAL
    );
    
    if (suspiciousEvents.length >= this.suspiciousActivityThreshold) {
      this.logSecurityEvent(
        SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        {
          ...metadata,
          eventCount: suspiciousEvents.length,
          timeWindow: this.suspiciousActivityWindow / 1000 / 60 + ' minutes',
          events: suspiciousEvents.map(e => e.eventType)
        },
        RISK_LEVELS.CRITICAL
      );
    }
  }

  // 觸發警報
  triggerAlert(logEntry) {
    const alert = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      type: 'security_alert',
      event: logEntry,
      severity: logEntry.risk,
      message: this.generateAlertMessage(logEntry)
    };
    
    // 通知訂閱者
    this.alertSubscribers.forEach(subscriber => {
      try {
        subscriber(alert);
      } catch (error) {
        console.error('Failed to notify alert subscriber:', error);
      }
    });
  }

  // 生成警報訊息
  generateAlertMessage(logEntry) {
    const { eventType, risk, metadata } = logEntry;
    
    switch (eventType) {
      case SECURITY_EVENT_TYPES.LOGIN_FAILURE:
        return `${risk.toUpperCase()} - 登入失敗來自 IP ${metadata.ipAddress}`;
      case SECURITY_EVENT_TYPES.CSRF_ATTACK:
        return `${risk.toUpperCase()} - 檢測到 CSRF 攻擊來自 IP ${metadata.ipAddress}`;
      case SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED:
        return `${risk.toUpperCase()} - IP ${metadata.ipAddress} 超過速率限制`;
      case SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY:
        return `${risk.toUpperCase()} - 檢測到來自 IP ${metadata.ipAddress} 的可疑活動`;
      default:
        return `${risk.toUpperCase()} - 安全事件: ${eventType}`;
    }
  }

  // 工具方法
  generateLogId() {
    return crypto.randomBytes(16).toString('hex');
  }

  getRiskColor(risk) {
    switch (risk) {
      case RISK_LEVELS.LOW: return '\x1b[32m'; // 綠色
      case RISK_LEVELS.MEDIUM: return '\x1b[33m'; // 黃色
      case RISK_LEVELS.HIGH: return '\x1b[31m'; // 紅色
      case RISK_LEVELS.CRITICAL: return '\x1b[35m'; // 紫色
      default: return '\x1b[0m'; // 默認
    }
  }

  // 訂閱警報
  subscribeToAlerts(callback) {
    this.alertSubscribers.push(callback);
    return () => {
      const index = this.alertSubscribers.indexOf(callback);
      if (index > -1) {
        this.alertSubscribers.splice(index, 1);
      }
    };
  }

  // 獲取日誌統計
  getLogStatistics(timeRange = 24 * 60 * 60 * 1000) { // 默認24小時
    const now = Date.now();
    const cutoff = now - timeRange;
    
    const recentLogs = this.logBuffer.filter(
      log => new Date(log.timestamp).getTime() > cutoff
    );
    
    const statistics = {
      total: recentLogs.length,
      byRisk: {},
      byEventType: {},
      topIPs: {},
      timeRange: timeRange / 1000 / 60 / 60 + ' hours'
    };
    
    recentLogs.forEach(log => {
      // 按風險等級統計
      statistics.byRisk[log.risk] = (statistics.byRisk[log.risk] || 0) + 1;
      
      // 按事件類型統計
      statistics.byEventType[log.eventType] = (statistics.byEventType[log.eventType] || 0) + 1;
      
      // 按 IP 統計
      const ip = log.metadata.ipAddress;
      if (ip) {
        statistics.topIPs[ip] = (statistics.topIPs[ip] || 0) + 1;
      }
    });
    
    return statistics;
  }

  // 清理舊日誌
  cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 默認30天
    const cutoff = Date.now() - maxAge;
    this.logBuffer = this.logBuffer.filter(
      log => new Date(log.timestamp).getTime() > cutoff
    );
  }
}

// 全局安全記錄器實例
export const securityLogger = new SecurityLogger();

// 便利函數
export const logSecurityEvent = (eventType, details, risk) => {
  return securityLogger.logSecurityEvent(eventType, details, risk);
};

export const subscribeToSecurityAlerts = (callback) => {
  return securityLogger.subscribeToAlerts(callback);
};

export default SecurityLogger;