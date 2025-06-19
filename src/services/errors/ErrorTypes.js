// 基礎錯誤類別
export class PhotoMigrationError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = true;
    this.severity = 'error';
    this.userMessage = message;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      severity: this.severity,
      userMessage: this.userMessage,
      stack: this.stack
    };
  }
}

// 網路相關錯誤
export class NetworkError extends PhotoMigrationError {
  constructor(message, context = {}) {
    super(message, 'NETWORK_ERROR', context);
    this.retryable = true;
    this.severity = 'warning';
    this.userMessage = '網路連線問題，請檢查您的網路連線並重試';
  }
}

// 連線超時錯誤
export class TimeoutError extends PhotoMigrationError {
  constructor(message, timeout = 30000, context = {}) {
    super(message, 'TIMEOUT_ERROR', { ...context, timeout });
    this.timeout = timeout;
    this.retryable = true;
    this.severity = 'warning';
    this.userMessage = `操作超時 (${timeout/1000}秒)，請重試`;
  }
}

// 認證錯誤
export class AuthenticationError extends PhotoMigrationError {
  constructor(message, platform, context = {}) {
    super(message, 'AUTH_ERROR', { ...context, platform });
    this.platform = platform;
    this.retryable = false;
    this.severity = 'critical';
    this.userMessage = `${platform} 認證失敗，請重新登入`;
  }
}

// 授權錯誤
export class AuthorizationError extends PhotoMigrationError {
  constructor(message, requiredPermission, context = {}) {
    super(message, 'AUTHORIZATION_ERROR', { ...context, requiredPermission });
    this.requiredPermission = requiredPermission;
    this.retryable = false;
    this.severity = 'error';
    this.userMessage = `權限不足，需要 ${requiredPermission} 權限`;
  }
}

// API 限制錯誤
export class RateLimitError extends PhotoMigrationError {
  constructor(message, retryAfter = 60, platform, context = {}) {
    super(message, 'RATE_LIMIT_ERROR', { ...context, platform, retryAfter });
    this.retryAfter = retryAfter;
    this.platform = platform;
    this.retryable = true;
    this.severity = 'warning';
    this.userMessage = `${platform} API 請求過於頻繁，請等待 ${retryAfter} 秒後重試`;
  }
}

// 配額超限錯誤
export class QuotaExceededError extends PhotoMigrationError {
  constructor(message, quotaType, resetTime, context = {}) {
    super(message, 'QUOTA_EXCEEDED_ERROR', { ...context, quotaType, resetTime });
    this.quotaType = quotaType;
    this.resetTime = resetTime;
    this.retryable = true;
    this.severity = 'error';
    const resetDate = new Date(resetTime).toLocaleString('zh-TW');
    this.userMessage = `${quotaType} 配額已用完，將於 ${resetDate} 重置`;
  }
}

// 檔案處理錯誤
export class FileProcessingError extends PhotoMigrationError {
  constructor(message, fileName, operation, context = {}) {
    super(message, 'FILE_PROCESSING_ERROR', { ...context, fileName, operation });
    this.fileName = fileName;
    this.operation = operation;
    this.retryable = true;
    this.severity = 'warning';
    this.userMessage = `檔案 "${fileName}" 在 ${operation} 時發生錯誤`;
  }
}

// 檔案不存在錯誤
export class FileNotFoundError extends PhotoMigrationError {
  constructor(message, fileName, context = {}) {
    super(message, 'FILE_NOT_FOUND_ERROR', { ...context, fileName });
    this.fileName = fileName;
    this.retryable = false;
    this.severity = 'error';
    this.userMessage = `找不到檔案 "${fileName}"`;
  }
}

// 檔案格式錯誤
export class UnsupportedFileFormatError extends PhotoMigrationError {
  constructor(message, fileName, format, context = {}) {
    super(message, 'UNSUPPORTED_FORMAT_ERROR', { ...context, fileName, format });
    this.fileName = fileName;
    this.format = format;
    this.retryable = false;
    this.severity = 'warning';
    this.userMessage = `檔案 "${fileName}" 的格式 "${format}" 不支援`;
  }
}

// 檔案大小錯誤
export class FileSizeError extends PhotoMigrationError {
  constructor(message, fileName, actualSize, maxSize, context = {}) {
    super(message, 'FILE_SIZE_ERROR', { ...context, fileName, actualSize, maxSize });
    this.fileName = fileName;
    this.actualSize = actualSize;
    this.maxSize = maxSize;
    this.retryable = false;
    this.severity = 'warning';
    this.userMessage = `檔案 "${fileName}" 大小 (${this.formatBytes(actualSize)}) 超過限制 (${this.formatBytes(maxSize)})`;
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// 數據驗證錯誤
export class ValidationError extends PhotoMigrationError {
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', { ...context, field, value });
    this.field = field;
    this.value = value;
    this.retryable = false;
    this.severity = 'warning';
    this.userMessage = `資料驗證失敗：${field} 的值無效`;
  }
}

// 平台特定錯誤
export class PlatformError extends PhotoMigrationError {
  constructor(message, platform, platformCode, context = {}) {
    super(message, 'PLATFORM_ERROR', { ...context, platform, platformCode });
    this.platform = platform;
    this.platformCode = platformCode;
    this.retryable = this.determinePlatformRetryability(platform, platformCode);
    this.severity = 'error';
    this.userMessage = `${platform} 平台錯誤：${message}`;
  }

  determinePlatformRetryability(platform, code) {
    // 根據平台和錯誤代碼決定是否可重試
    const nonRetryableCodes = ['invalid_token', 'permission_denied', 'not_found'];
    return !nonRetryableCodes.includes(code);
  }
}

// 系統配置錯誤
export class ConfigurationError extends PhotoMigrationError {
  constructor(message, configKey, context = {}) {
    super(message, 'CONFIG_ERROR', { ...context, configKey });
    this.configKey = configKey;
    this.retryable = false;
    this.severity = 'error';
    this.userMessage = `系統配置錯誤：${configKey}`;
  }
}

// 並發錯誤
export class ConcurrencyError extends PhotoMigrationError {
  constructor(message, resource, context = {}) {
    super(message, 'CONCURRENCY_ERROR', { ...context, resource });
    this.resource = resource;
    this.retryable = true;
    this.severity = 'warning';
    this.userMessage = `資源競爭衝突，請稍後重試`;
  }
}

// 業務邏輯錯誤
export class BusinessLogicError extends PhotoMigrationError {
  constructor(message, operation, context = {}) {
    super(message, 'BUSINESS_LOGIC_ERROR', { ...context, operation });
    this.operation = operation;
    this.retryable = false;
    this.severity = 'error';
    this.userMessage = message;
  }
}

// 錯誤工廠類別
export class ErrorFactory {
  static createError(type, ...args) {
    const errorClasses = {
      'network': NetworkError,
      'timeout': TimeoutError,
      'authentication': AuthenticationError,
      'authorization': AuthorizationError,
      'rateLimit': RateLimitError,
      'quotaExceeded': QuotaExceededError,
      'fileProcessing': FileProcessingError,
      'fileNotFound': FileNotFoundError,
      'unsupportedFormat': UnsupportedFileFormatError,
      'fileSize': FileSizeError,
      'validation': ValidationError,
      'platform': PlatformError,
      'configuration': ConfigurationError,
      'concurrency': ConcurrencyError,
      'businessLogic': BusinessLogicError
    };

    const ErrorClass = errorClasses[type] || PhotoMigrationError;
    return new ErrorClass(...args);
  }

  static fromApiError(apiError, context = {}) {
    const { status, code, message, data } = apiError;

    switch (status) {
      case 401:
        return new AuthenticationError(message, context.platform, { status, code, data });
      case 403:
        return new AuthorizationError(message, context.requiredPermission, { status, code, data });
      case 404:
        return new FileNotFoundError(message, context.fileName, { status, code, data });
      case 413:
        return new FileSizeError(message, context.fileName, data?.actualSize, data?.maxSize, { status, code });
      case 429:
        return new RateLimitError(message, data?.retryAfter, context.platform, { status, code });
      case 500:
      case 502:
      case 503:
      case 504:
        return new NetworkError(message, { status, code, data });
      default:
        return new PlatformError(message, context.platform, code, { status, data });
    }
  }
}

// 錯誤分類輔助函數
export const ErrorCategories = {
  NETWORK: ['NETWORK_ERROR', 'TIMEOUT_ERROR'],
  AUTH: ['AUTH_ERROR', 'AUTHORIZATION_ERROR'],
  RATE_LIMIT: ['RATE_LIMIT_ERROR', 'QUOTA_EXCEEDED_ERROR'],
  FILE: ['FILE_PROCESSING_ERROR', 'FILE_NOT_FOUND_ERROR', 'UNSUPPORTED_FORMAT_ERROR', 'FILE_SIZE_ERROR'],
  VALIDATION: ['VALIDATION_ERROR'],
  PLATFORM: ['PLATFORM_ERROR'],
  SYSTEM: ['CONFIG_ERROR', 'CONCURRENCY_ERROR'],
  BUSINESS: ['BUSINESS_LOGIC_ERROR']
};

export const categorizeError = (error) => {
  const code = error.code || error.name;
  
  for (const [category, codes] of Object.entries(ErrorCategories)) {
    if (codes.includes(code)) {
      return category;
    }
  }
  
  return 'UNKNOWN';
};

// 錯誤嚴重程度分級
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

export const getErrorSeverity = (error) => {
  if (error.severity) {
    return error.severity;
  }

  // 根據錯誤類型決定嚴重程度
  const criticalCodes = ['AUTH_ERROR', 'CONFIG_ERROR'];
  const errorCodes = ['FILE_NOT_FOUND_ERROR', 'BUSINESS_LOGIC_ERROR'];
  const warningCodes = ['RATE_LIMIT_ERROR', 'FILE_SIZE_ERROR', 'VALIDATION_ERROR'];

  const code = error.code || error.name;

  if (criticalCodes.includes(code)) return ErrorSeverity.CRITICAL;
  if (errorCodes.includes(code)) return ErrorSeverity.ERROR;
  if (warningCodes.includes(code)) return ErrorSeverity.WARNING;

  return ErrorSeverity.INFO;
};