// 數據匿名化系統
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';
import CryptoJS from 'crypto-js';

// 匿名化類型
export const ANONYMIZATION_TYPES = {
  HASH: 'hash',           // 哈希化
  MASK: 'mask',           // 遮罩
  PSEUDONYM: 'pseudonym', // 假名化
  GENERALIZE: 'generalize', // 概化
  SUPPRESS: 'suppress',   // 抑制
  ENCRYPT: 'encrypt'      // 加密
};

// 數據類型
export const DATA_TYPES = {
  USER_ID: 'user_id',
  EMAIL: 'email',
  IP_ADDRESS: 'ip_address',
  PHONE_NUMBER: 'phone_number',
  NAME: 'name',
  LOCATION: 'location',
  TIMESTAMP: 'timestamp',
  USER_AGENT: 'user_agent',
  FILE_PATH: 'file_path',
  ERROR_MESSAGE: 'error_message'
};

// 敏感度級別
export const SENSITIVITY_LEVELS = {
  PUBLIC: 'public',       // 公開
  INTERNAL: 'internal',   // 內部
  CONFIDENTIAL: 'confidential', // 機密
  RESTRICTED: 'restricted' // 限制
};

class DataAnonymizationManager {
  constructor() {
    this.config = getSecurityConfig().anonymization;
    this.pseudonymMappings = new Map();
    this.generalizationRules = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  // 初始化匿名化管理器
  initialize() {
    try {
      // 載入預設規則
      this.loadDefaultRules();
      
      // 設定清理定時器
      this.setupCleanupTimer();
      
      this.isInitialized = true;
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'DataAnonymizationManager',
          action: 'initialized'
        },
        RISK_LEVELS.LOW
      );

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'DataAnonymizationManager',
          action: 'initialization_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 載入預設匿名化規則
  loadDefaultRules() {
    // 用戶 ID 匿名化規則
    this.addAnonymizationRule(DATA_TYPES.USER_ID, {
      type: ANONYMIZATION_TYPES.HASH,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
      algorithm: 'sha256',
      salt: this.config.userIdHashing.salt,
      iterations: this.config.userIdHashing.iterations
    });

    // 電子郵件匿名化規則
    this.addAnonymizationRule(DATA_TYPES.EMAIL, {
      type: ANONYMIZATION_TYPES.MASK,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
      maskPattern: '***@***.***'
    });

    // IP 地址匿名化規則
    this.addAnonymizationRule(DATA_TYPES.IP_ADDRESS, {
      type: ANONYMIZATION_TYPES.MASK,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      ipv4Mask: this.config.ipAddressMasking.ipv4Mask,
      ipv6Mask: this.config.ipAddressMasking.ipv6Mask
    });

    // 電話號碼匿名化規則
    this.addAnonymizationRule(DATA_TYPES.PHONE_NUMBER, {
      type: ANONYMIZATION_TYPES.MASK,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
      maskPattern: '***-***-####'
    });

    // 姓名匿名化規則
    this.addAnonymizationRule(DATA_TYPES.NAME, {
      type: ANONYMIZATION_TYPES.PSEUDONYM,
      sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL
    });

    // 位置數據概化規則
    this.addAnonymizationRule(DATA_TYPES.LOCATION, {
      type: ANONYMIZATION_TYPES.GENERALIZE,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      precision: 'city' // country, region, city, zipcode
    });

    // 時間戳概化規則
    this.addAnonymizationRule(DATA_TYPES.TIMESTAMP, {
      type: ANONYMIZATION_TYPES.GENERALIZE,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      precision: 'hour' // year, month, day, hour, minute
    });

    // User Agent 匿名化規則
    this.addAnonymizationRule(DATA_TYPES.USER_AGENT, {
      type: ANONYMIZATION_TYPES.GENERALIZE,
      sensitivity: SENSITIVITY_LEVELS.INTERNAL,
      extractFeatures: ['browser', 'os', 'device_type']
    });
  }

  // 添加匿名化規則
  addAnonymizationRule(dataType, rule) {
    this.generalizationRules.set(dataType, {
      ...rule,
      createdAt: new Date().toISOString()
    });
  }

  // 匿名化數據
  anonymizeData(data, dataType, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Anonymization manager not initialized');
      }

      const rule = this.generalizationRules.get(dataType);
      if (!rule) {
        // 如果沒有規則，按敏感度級別處理
        return this.applyDefaultAnonymization(data, options.sensitivity || SENSITIVITY_LEVELS.INTERNAL);
      }

      let result;
      switch (rule.type) {
        case ANONYMIZATION_TYPES.HASH:
          result = this.hashData(data, rule);
          break;
        case ANONYMIZATION_TYPES.MASK:
          result = this.maskData(data, rule);
          break;
        case ANONYMIZATION_TYPES.PSEUDONYM:
          result = this.pseudonymizeData(data, rule);
          break;
        case ANONYMIZATION_TYPES.GENERALIZE:
          result = this.generalizeData(data, dataType, rule);
          break;
        case ANONYMIZATION_TYPES.SUPPRESS:
          result = this.suppressData(data, rule);
          break;
        case ANONYMIZATION_TYPES.ENCRYPT:
          result = this.encryptData(data, rule);
          break;
        default:
          result = data;
      }

      // 記錄匿名化事件
      if (options.logEvent !== false) {
        logSecurityEvent(
          SECURITY_EVENT_TYPES.DATA_ACCESS,
          {
            action: 'data_anonymized',
            dataType,
            anonymizationType: rule.type,
            sensitivity: rule.sensitivity
          },
          RISK_LEVELS.LOW
        );
      }

      return result;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'anonymization_failed',
          dataType,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 哈希化數據
  hashData(data, rule) {
    if (!data) return data;

    const algorithm = rule.algorithm || 'sha256';
    const salt = rule.salt || 'default-salt';
    const iterations = rule.iterations || 1;

    let hash = data + salt;
    for (let i = 0; i < iterations; i++) {
      switch (algorithm) {
        case 'sha256':
          hash = CryptoJS.SHA256(hash).toString();
          break;
        case 'sha512':
          hash = CryptoJS.SHA512(hash).toString();
          break;
        case 'md5':
          hash = CryptoJS.MD5(hash).toString();
          break;
        default:
          hash = CryptoJS.SHA256(hash).toString();
      }
    }

    return hash;
  }

  // 遮罩數據
  maskData(data, rule) {
    if (!data) return data;

    if (rule.maskPattern) {
      return rule.maskPattern;
    }

    // IP 地址特殊處理
    if (data.includes('.') && data.split('.').length === 4) {
      return this.maskIPv4(data, rule.ipv4Mask);
    } else if (data.includes(':')) {
      return this.maskIPv6(data, rule.ipv6Mask);
    }

    // 電子郵件特殊處理
    if (data.includes('@')) {
      return this.maskEmail(data);
    }

    // 電話號碼特殊處理
    if (/^\+?[\d\-\(\)\s]+$/.test(data)) {
      return this.maskPhoneNumber(data);
    }

    // 默認遮罩
    if (data.length <= 3) {
      return '*'.repeat(data.length);
    }
    return data.substring(0, 2) + '*'.repeat(data.length - 3) + data.substring(data.length - 1);
  }

  // 遮罩 IPv4 地址
  maskIPv4(ip, mask = '255.255.255.0') {
    const ipParts = ip.split('.').map(part => parseInt(part));
    const maskParts = mask.split('.').map(part => parseInt(part));
    
    return ipParts.map((part, index) => 
      maskParts[index] === 255 ? part : 0
    ).join('.');
  }

  // 遮罩 IPv6 地址
  maskIPv6(ip, mask = 'ffff:ffff:ffff:ffff::') {
    const parts = ip.split(':');
    const maskParts = mask.split(':');
    
    return parts.map((part, index) => 
      maskParts[index] && maskParts[index] !== '' ? part : '0000'
    ).join(':');
  }

  // 遮罩電子郵件
  maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    const maskedLocal = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : '*'.repeat(local.length);
    
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.map(part => 
      part.length > 2 ? part.substring(0, 1) + '*'.repeat(part.length - 2) + part.substring(part.length - 1) : part
    ).join('.');
    
    return `${maskedLocal}@${maskedDomain}`;
  }

  // 遮罩電話號碼
  maskPhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '*'.repeat(phone.length);
    
    const masked = digits.substring(0, digits.length - 4) + '****';
    return phone.replace(/\d/g, (match, index) => {
      const digitIndex = phone.substring(0, index + 1).replace(/\D/g, '').length - 1;
      return digitIndex < masked.length ? masked[digitIndex] : match;
    });
  }

  // 假名化數據
  pseudonymizeData(data, rule) {
    if (!data) return data;

    // 檢查是否已有假名
    if (this.pseudonymMappings.has(data)) {
      return this.pseudonymMappings.get(data);
    }

    // 生成新的假名
    const pseudonym = this.generatePseudonym(data, rule);
    this.pseudonymMappings.set(data, pseudonym);
    
    return pseudonym;
  }

  // 生成假名
  generatePseudonym(data, rule) {
    // 基於原始數據生成一致的假名
    const hash = CryptoJS.SHA256(data + (rule.salt || 'pseudonym-salt')).toString();
    const prefix = rule.prefix || 'user';
    const suffix = hash.substring(0, 8);
    
    return `${prefix}_${suffix}`;
  }

  // 概化數據
  generalizeData(data, dataType, rule) {
    if (!data) return data;

    switch (dataType) {
      case DATA_TYPES.LOCATION:
        return this.generalizeLocation(data, rule);
      case DATA_TYPES.TIMESTAMP:
        return this.generalizeTimestamp(data, rule);
      case DATA_TYPES.USER_AGENT:
        return this.generalizeUserAgent(data, rule);
      default:
        return data;
    }
  }

  // 概化位置數據
  generalizeLocation(location, rule) {
    const precision = rule.precision || 'city';
    
    // 如果是坐標格式
    if (typeof location === 'object' && location.lat && location.lng) {
      switch (precision) {
        case 'country':
          return { precision: 'country' };
        case 'region':
          return { 
            precision: 'region',
            lat: Math.round(location.lat),
            lng: Math.round(location.lng)
          };
        case 'city':
          return {
            precision: 'city',
            lat: Math.round(location.lat * 10) / 10,
            lng: Math.round(location.lng * 10) / 10
          };
        default:
          return location;
      }
    }

    // 如果是地址字符串
    if (typeof location === 'string') {
      const parts = location.split(',').map(part => part.trim());
      switch (precision) {
        case 'country':
          return parts[parts.length - 1] || location;
        case 'region':
          return parts.slice(-2).join(', ') || location;
        case 'city':
          return parts.slice(-3).join(', ') || location;
        default:
          return location;
      }
    }

    return location;
  }

  // 概化時間戳
  generalizeTimestamp(timestamp, rule) {
    const precision = rule.precision || 'hour';
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) return timestamp;

    switch (precision) {
      case 'year':
        return new Date(date.getFullYear(), 0, 1).toISOString();
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      case 'hour':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
      case 'minute':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString();
      default:
        return timestamp;
    }
  }

  // 概化 User Agent
  generalizeUserAgent(userAgent, rule) {
    const features = rule.extractFeatures || ['browser', 'os'];
    const result = {};

    // 簡化的 User Agent 解析
    const browser = this.extractBrowser(userAgent);
    const os = this.extractOS(userAgent);
    const deviceType = this.extractDeviceType(userAgent);

    if (features.includes('browser')) result.browser = browser;
    if (features.includes('os')) result.os = os;
    if (features.includes('device_type')) result.device_type = deviceType;

    return result;
  }

  // 提取瀏覽器信息
  extractBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  // 提取操作系統信息
  extractOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Other';
  }

  // 提取設備類型
  extractDeviceType(userAgent) {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  // 抑制數據
  suppressData(data, rule) {
    return rule.replacement || '[SUPPRESSED]';
  }

  // 加密數據
  encryptData(data, rule) {
    if (!data) return data;

    const key = rule.key || 'default-encryption-key';
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  // 應用默認匿名化
  applyDefaultAnonymization(data, sensitivity) {
    switch (sensitivity) {
      case SENSITIVITY_LEVELS.RESTRICTED:
        return '[RESTRICTED]';
      case SENSITIVITY_LEVELS.CONFIDENTIAL:
        return this.hashData(data, { algorithm: 'sha256', salt: 'default-salt' });
      case SENSITIVITY_LEVELS.INTERNAL:
        return this.maskData(data, {});
      case SENSITIVITY_LEVELS.PUBLIC:
      default:
        return data;
    }
  }

  // 批量匿名化
  anonymizeBatch(dataArray, mappings = {}, options = {}) {
    return dataArray.map(item => {
      const anonymized = {};
      
      for (const [key, value] of Object.entries(item)) {
        const dataType = mappings[key];
        if (dataType) {
          anonymized[key] = this.anonymizeData(value, dataType, { ...options, logEvent: false });
        } else {
          anonymized[key] = value;
        }
      }
      
      return anonymized;
    });
  }

  // 匿名化用戶活動日誌
  anonymizeActivityLog(logEntry) {
    return {
      ...logEntry,
      userId: this.anonymizeData(logEntry.userId, DATA_TYPES.USER_ID),
      ip: this.anonymizeData(logEntry.ip, DATA_TYPES.IP_ADDRESS),
      userAgent: this.anonymizeData(logEntry.userAgent, DATA_TYPES.USER_AGENT),
      timestamp: this.anonymizeData(logEntry.timestamp, DATA_TYPES.TIMESTAMP),
      location: logEntry.location ? this.anonymizeData(logEntry.location, DATA_TYPES.LOCATION) : null
    };
  }

  // 匿名化錯誤日誌
  anonymizeErrorLog(errorLog) {
    return {
      ...errorLog,
      userId: errorLog.userId ? this.anonymizeData(errorLog.userId, DATA_TYPES.USER_ID) : null,
      filePath: errorLog.filePath ? this.anonymizeData(errorLog.filePath, DATA_TYPES.FILE_PATH) : null,
      message: this.sanitizeErrorMessage(errorLog.message),
      stack: this.sanitizeStackTrace(errorLog.stack)
    };
  }

  // 清理錯誤消息中的敏感信息
  sanitizeErrorMessage(message) {
    if (!message) return message;

    // 移除可能的文件路徑
    message = message.replace(/[C-Z]:\\[^\\]*\\[^\\]*\\/gi, '[PATH]/');
    message = message.replace(/\/[^\/]*\/[^\/]*\//gi, '[PATH]/');
    
    // 移除可能的用戶名
    message = message.replace(/user[_-]?\d+/gi, '[USER]');
    
    // 移除可能的電子郵件
    message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL]');
    
    return message;
  }

  // 清理堆棧跟蹤
  sanitizeStackTrace(stack) {
    if (!stack) return stack;

    // 保留函數名和行號，但移除文件路徑
    return stack.replace(/at .+[\\\/]([^\\\/]+:\d+:\d+)/g, 'at [PATH]/$1');
  }

  // 檢查數據是否需要匿名化
  needsAnonymization(dataType, sensitivity = SENSITIVITY_LEVELS.INTERNAL) {
    if (sensitivity === SENSITIVITY_LEVELS.PUBLIC) return false;
    
    const rule = this.generalizationRules.get(dataType);
    if (!rule) return sensitivity !== SENSITIVITY_LEVELS.PUBLIC;
    
    return rule.sensitivity !== SENSITIVITY_LEVELS.PUBLIC;
  }

  // 設定清理定時器
  setupCleanupTimer() {
    // 每24小時清理一次假名映射
    setInterval(() => {
      this.cleanupPseudonymMappings();
    }, 24 * 60 * 60 * 1000);
  }

  // 清理假名映射
  cleanupPseudonymMappings() {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    const cutoff = Date.now() - maxAge;
    
    let cleanedCount = 0;
    for (const [key, value] of this.pseudonymMappings.entries()) {
      if (value.createdAt && new Date(value.createdAt).getTime() < cutoff) {
        this.pseudonymMappings.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'pseudonym_mappings_cleaned',
          cleanedCount
        },
        RISK_LEVELS.LOW
      );
    }
  }

  // 獲取匿名化統計
  getStatistics() {
    return {
      isInitialized: this.isInitialized,
      rulesCount: this.generalizationRules.size,
      pseudonymMappingsCount: this.pseudonymMappings.size,
      supportedDataTypes: Object.values(DATA_TYPES),
      supportedAnonymizationTypes: Object.values(ANONYMIZATION_TYPES),
      sensitivityLevels: Object.values(SENSITIVITY_LEVELS)
    };
  }

  // 驗證匿名化效果
  validateAnonymization(original, anonymized, dataType) {
    const rule = this.generalizationRules.get(dataType);
    if (!rule) return true;

    // 檢查是否真的被匿名化了
    if (rule.type !== ANONYMIZATION_TYPES.ENCRYPT && original === anonymized) {
      return false;
    }

    // 檢查是否保留了必要的統計特性
    if (rule.preserveStatistics) {
      // 這裡可以添加統計特性驗證邏輯
    }

    return true;
  }
}

// 全局數據匿名化管理器實例
export const dataAnonymizationManager = new DataAnonymizationManager();

// React Hook 用於數據匿名化
import { useState, useCallback, useEffect } from 'react';

export const useDataAnonymization = () => {
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    setStatistics(dataAnonymizationManager.getStatistics());
  }, []);

  const anonymize = useCallback((data, dataType, options) => {
    return dataAnonymizationManager.anonymizeData(data, dataType, options);
  }, []);

  const anonymizeBatch = useCallback((dataArray, mappings, options) => {
    return dataAnonymizationManager.anonymizeBatch(dataArray, mappings, options);
  }, []);

  const anonymizeLog = useCallback((logEntry) => {
    return dataAnonymizationManager.anonymizeActivityLog(logEntry);
  }, []);

  const needsAnonymization = useCallback((dataType, sensitivity) => {
    return dataAnonymizationManager.needsAnonymization(dataType, sensitivity);
  }, []);

  return {
    statistics,
    anonymize,
    anonymizeBatch,
    anonymizeLog,
    needsAnonymization
  };
};

// 便利函數
export const anonymizeData = (data, dataType, options) =>
  dataAnonymizationManager.anonymizeData(data, dataType, options);

export const anonymizeBatch = (dataArray, mappings, options) =>
  dataAnonymizationManager.anonymizeBatch(dataArray, mappings, options);

export const anonymizeActivityLog = (logEntry) =>
  dataAnonymizationManager.anonymizeActivityLog(logEntry);

export const anonymizeErrorLog = (errorLog) =>
  dataAnonymizationManager.anonymizeErrorLog(errorLog);

export default DataAnonymizationManager;