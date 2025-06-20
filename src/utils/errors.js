// 基礎錯誤類別
export class BaseError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.retryable = false;
    this.userFriendly = false;
    
    // 確保錯誤堆疊正確顯示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      stack: this.stack
    };
  }
}

// 網路相關錯誤
export class NetworkError extends BaseError {
  constructor(message, context = {}) {
    super(message, 'NETWORK_ERROR', context);
    this.retryable = true;
    this.userFriendly = true;
  }

  getUserMessage() {
    return '網路連線發生問題，請檢查您的網路連線後重試。';
  }

  getSuggestion() {
    return '建議檢查網路連線狀態，或稍後再試。';
  }
}

// API 相關錯誤
export class ApiError extends BaseError {
  constructor(message, statusCode, context = {}) {
    super(message, 'API_ERROR', { ...context, statusCode });
    this.statusCode = statusCode;
    this.retryable = statusCode >= 500 || statusCode === 429;
    this.userFriendly = true;
  }

  getUserMessage() {
    if (this.statusCode === 401) {
      return '登入已過期，請重新登入。';
    }
    if (this.statusCode === 403) {
      return '您沒有權限執行此操作。';
    }
    if (this.statusCode === 404) {
      return '請求的資源不存在。';
    }
    if (this.statusCode === 429) {
      return '請求過於頻繁，請稍後再試。';
    }
    if (this.statusCode >= 500) {
      return '伺服器發生錯誤，請稍後再試。';
    }
    return 'API 請求發生錯誤。';
  }

  getSuggestion() {
    if (this.statusCode === 401) {
      return '請重新登入您的帳戶。';
    }
    if (this.statusCode === 403) {
      return '請聯繫管理員獲取權限。';
    }
    if (this.statusCode === 429) {
      return '請等待一段時間後再試。';
    }
    if (this.statusCode >= 500) {
      return '這是伺服器問題，通常會自動修復。';
    }
    return '請檢查您的請求參數。';
  }
}

// 認證相關錯誤
export class AuthenticationError extends BaseError {
  constructor(message, context = {}) {
    super(message, 'AUTH_ERROR', context);
    this.retryable = false;
    this.userFriendly = true;
  }

  getUserMessage() {
    return '身份驗證失敗，請重新登入。';
  }

  getSuggestion() {
    return '請檢查您的登入憑證或重新授權。';
  }
}

// 檔案操作錯誤
export class FileError extends BaseError {
  constructor(message, operation, fileName, context = {}) {
    super(message, 'FILE_ERROR', { ...context, operation, fileName });
    this.operation = operation;
    this.fileName = fileName;
    this.retryable = operation === 'download' || operation === 'upload';
    this.userFriendly = true;
  }

  getUserMessage() {
    const { operation, fileName } = this.context;
    switch (operation) {
      case 'download':
        return `下載檔案 "${fileName}" 失敗。`;
      case 'upload':
        return `上傳檔案 "${fileName}" 失敗。`;
      case 'delete':
        return `刪除檔案 "${fileName}" 失敗。`;
      case 'read':
        return `讀取檔案 "${fileName}" 失敗。`;
      default:
        return `檔案操作失敗。`;
    }
  }

  getSuggestion() {
    const { operation } = this.context;
    switch (operation) {
      case 'download':
        return '請檢查網路連線或檔案是否存在。';
      case 'upload':
        return '請檢查檔案大小和格式是否符合要求。';
      case 'delete':
        return '請確認您有刪除權限。';
      default:
        return '請稍後重試或聯繫技術支援。';
    }
  }
}

// 驗證錯誤
export class ValidationError extends BaseError {
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', { ...context, field, value });
    this.field = field;
    this.value = value;
    this.retryable = false;
    this.userFriendly = true;
  }

  getUserMessage() {
    return `資料驗證失敗：${this.message}`;
  }

  getSuggestion() {
    return '請檢查並修正輸入的資料。';
  }
}

// 權限錯誤
export class PermissionError extends BaseError {
  constructor(message, resource, action, context = {}) {
    super(message, 'PERMISSION_ERROR', { ...context, resource, action });
    this.resource = resource;
    this.action = action;
    this.retryable = false;
    this.userFriendly = true;
  }

  getUserMessage() {
    const { resource, action } = this.context;
    return `您沒有權限${action}${resource}。`;
  }

  getSuggestion() {
    return '請聯繫管理員獲取必要的權限。';
  }
}

// 配額限制錯誤
export class QuotaError extends BaseError {
  constructor(message, quotaType, limit, current, context = {}) {
    super(message, 'QUOTA_ERROR', { ...context, quotaType, limit, current });
    this.quotaType = quotaType;
    this.limit = limit;
    this.current = current;
    this.retryable = false;
    this.userFriendly = true;
  }

  getUserMessage() {
    const { quotaType, limit } = this.context;
    return `已達到${quotaType}限制（${limit}）。`;
  }

  getSuggestion() {
    return '請升級您的方案或清理一些數據後重試。';
  }
}

// 遷移特定錯誤
export class MigrationError extends BaseError {
  constructor(message, phase, itemId, context = {}) {
    super(message, 'MIGRATION_ERROR', { ...context, phase, itemId });
    this.phase = phase;
    this.itemId = itemId;
    this.retryable = phase !== 'validation';
    this.userFriendly = true;
  }

  getUserMessage() {
    const { phase, itemId } = this.context;
    return `遷移${phase}階段失敗：項目 ${itemId}`;
  }

  getSuggestion() {
    const { phase } = this.context;
    switch (phase) {
      case 'validation':
        return '請檢查來源數據的完整性。';
      case 'download':
        return '請檢查來源平台的連線狀態。';
      case 'upload':
        return '請檢查目標平台的連線狀態。';
      case 'cleanup':
        return '這不影響主要遷移過程，可以忽略。';
      default:
        return '請檢查網路連線後重試。';
    }
  }
}

// 超時錯誤
export class TimeoutError extends BaseError {
  constructor(message, operation, timeout, context = {}) {
    super(message, 'TIMEOUT_ERROR', { ...context, operation, timeout });
    this.operation = operation;
    this.timeout = timeout;
    this.retryable = true;
    this.userFriendly = true;
  }

  getUserMessage() {
    const { operation, timeout } = this.context;
    return `操作超時：${operation}（${timeout}ms）`;
  }

  getSuggestion() {
    return '請檢查網路連線速度，或稍後再試。';
  }
}

// 錯誤工廠函數
export class ErrorFactory {
  static createFromResponse(response, context = {}) {
    const { status, statusText } = response;
    
    if (status === 401) {
      return new AuthenticationError('Authentication failed', context);
    }
    
    if (status === 403) {
      return new PermissionError('Permission denied', context.resource, context.action, context);
    }
    
    if (status === 429) {
      return new QuotaError('Rate limit exceeded', 'API requests', context.limit, context.current, context);
    }
    
    return new ApiError(statusText || `HTTP ${status}`, status, context);
  }

  static createFromNetworkError(error, context = {}) {
    if (error.code === 'NETWORK_ERROR' || error.message.includes('fetch')) {
      return new NetworkError('Network connection failed', context);
    }
    
    if (error.name === 'TimeoutError') {
      return new TimeoutError('Request timeout', context.operation, context.timeout, context);
    }
    
    return new BaseError(error.message, 'UNKNOWN_ERROR', { ...context, originalError: error });
  }

  static createValidationError(field, value, message, context = {}) {
    return new ValidationError(message, field, value, context);
  }

  static createFileError(operation, fileName, error, context = {}) {
    return new FileError(error.message, operation, fileName, { ...context, originalError: error });
  }

  static createMigrationError(phase, itemId, error, context = {}) {
    return new MigrationError(error.message, phase, itemId, { ...context, originalError: error });
  }
}

// 錯誤分類器
export class ErrorClassifier {
  static classify(error) {
    if (error instanceof BaseError) {
      return {
        category: error.constructor.name,
        severity: this.getSeverity(error),
        retryable: error.retryable,
        userFriendly: error.userFriendly
      };
    }
    
    // 對於原生錯誤的分類
    if (error.name === 'TypeError') {
      return { category: 'CODE_ERROR', severity: 'HIGH', retryable: false, userFriendly: false };
    }
    
    if (error.name === 'ReferenceError') {
      return { category: 'CODE_ERROR', severity: 'HIGH', retryable: false, userFriendly: false };
    }
    
    return { category: 'UNKNOWN', severity: 'MEDIUM', retryable: false, userFriendly: false };
  }

  static getSeverity(error) {
    if (error instanceof AuthenticationError || error instanceof PermissionError) {
      return 'HIGH';
    }
    
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return 'MEDIUM';
    }
    
    if (error instanceof ValidationError) {
      return 'LOW';
    }
    
    if (error instanceof ApiError && error.statusCode >= 500) {
      return 'HIGH';
    }
    
    return 'MEDIUM';
  }

  static shouldReport(error) {
    const classification = this.classify(error);
    
    // 不報告驗證錯誤和用戶權限錯誤
    if (error instanceof ValidationError || error instanceof PermissionError) {
      return false;
    }
    
    // 高嚴重性錯誤總是報告
    if (classification.severity === 'HIGH') {
      return true;
    }
    
    // 非用戶友好錯誤（代碼錯誤）總是報告
    if (!classification.userFriendly) {
      return true;
    }
    
    return false;
  }
}