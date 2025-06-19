import {
  PhotoMigrationError,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  FileProcessingError,
  ValidationError,
  ErrorFactory,
  categorizeError,
  getErrorSeverity
} from '../ErrorTypes.js';

describe('錯誤類型系統', () => {
  describe('PhotoMigrationError', () => {
    it('應該正確創建基礎錯誤', () => {
      const error = new PhotoMigrationError('測試錯誤', 'TEST_ERROR', { test: true });
      
      expect(error.message).toBe('測試錯誤');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context.test).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('error');
      expect(error.userMessage).toBe('測試錯誤');
    });

    it('應該正確序列化為JSON', () => {
      const error = new PhotoMigrationError('測試錯誤', 'TEST_ERROR');
      const json = error.toJSON();
      
      expect(json.name).toBe('PhotoMigrationError');
      expect(json.message).toBe('測試錯誤');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('NetworkError', () => {
    it('應該正確創建網路錯誤', () => {
      const error = new NetworkError('連線失敗');
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('warning');
      expect(error.userMessage).toBe('網路連線問題，請檢查您的網路連線並重試');
    });
  });

  describe('AuthenticationError', () => {
    it('應該正確創建認證錯誤', () => {
      const error = new AuthenticationError('認證失敗', 'facebook');
      
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.platform).toBe('facebook');
      expect(error.retryable).toBe(false);
      expect(error.severity).toBe('critical');
      expect(error.userMessage).toBe('facebook 認證失敗，請重新登入');
    });
  });

  describe('RateLimitError', () => {
    it('應該正確創建速率限制錯誤', () => {
      const error = new RateLimitError('請求過於頻繁', 120, 'instagram');
      
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryAfter).toBe(120);
      expect(error.platform).toBe('instagram');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('warning');
      expect(error.userMessage).toBe('instagram API 請求過於頻繁，請等待 120 秒後重試');
    });
  });

  describe('FileProcessingError', () => {
    it('應該正確創建檔案處理錯誤', () => {
      const error = new FileProcessingError('處理失敗', 'test.jpg', 'upload');
      
      expect(error.code).toBe('FILE_PROCESSING_ERROR');
      expect(error.fileName).toBe('test.jpg');
      expect(error.operation).toBe('upload');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('warning');
      expect(error.userMessage).toBe('檔案 "test.jpg" 在 upload 時發生錯誤');
    });
  });

  describe('ValidationError', () => {
    it('應該正確創建驗證錯誤', () => {
      const error = new ValidationError('無效的欄位值', 'email', 'invalid-email');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid-email');
      expect(error.retryable).toBe(false);
      expect(error.severity).toBe('warning');
      expect(error.userMessage).toBe('資料驗證失敗：email 的值無效');
    });
  });

  describe('ErrorFactory', () => {
    it('應該根據類型創建錯誤', () => {
      const error = ErrorFactory.createError('network', '連線失敗');
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('連線失敗');
    });

    it('應該從API錯誤創建錯誤', () => {
      const apiError = {
        status: 401,
        code: 'invalid_token',
        message: '無效的存取權杖',
        data: {}
      };

      const error = ErrorFactory.fromApiError(apiError, { platform: 'facebook' });
      
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.platform).toBe('facebook');
      expect(error.context.status).toBe(401);
    });

    it('應該處理不同的HTTP狀態碼', () => {
      const testCases = [
        { status: 403, expectedType: 'AuthorizationError' },
        { status: 404, expectedType: 'FileNotFoundError' },
        { status: 429, expectedType: 'RateLimitError' },
        { status: 500, expectedType: 'NetworkError' }
      ];

      testCases.forEach(({ status, expectedType }) => {
        const apiError = { status, message: '測試錯誤' };
        const error = ErrorFactory.fromApiError(apiError);
        expect(error.constructor.name).toBe(expectedType);
      });
    });
  });

  describe('categorizeError', () => {
    it('應該正確分類錯誤', () => {
      const testCases = [
        { code: 'NETWORK_ERROR', expected: 'NETWORK' },
        { code: 'AUTH_ERROR', expected: 'AUTH' },
        { code: 'RATE_LIMIT_ERROR', expected: 'RATE_LIMIT' },
        { code: 'FILE_PROCESSING_ERROR', expected: 'FILE' },
        { code: 'VALIDATION_ERROR', expected: 'VALIDATION' },
        { code: 'UNKNOWN_ERROR', expected: 'UNKNOWN' }
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        expect(categorizeError(error)).toBe(expected);
      });
    });
  });

  describe('getErrorSeverity', () => {
    it('應該返回錯誤的嚴重程度', () => {
      const errorWithSeverity = { severity: 'critical' };
      expect(getErrorSeverity(errorWithSeverity)).toBe('critical');
    });

    it('應該根據錯誤代碼推斷嚴重程度', () => {
      const testCases = [
        { code: 'AUTH_ERROR', expected: 'critical' },
        { code: 'FILE_NOT_FOUND_ERROR', expected: 'error' },
        { code: 'RATE_LIMIT_ERROR', expected: 'warning' },
        { code: 'UNKNOWN_ERROR', expected: 'info' }
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        expect(getErrorSeverity(error)).toBe(expected);
      });
    });
  });
});