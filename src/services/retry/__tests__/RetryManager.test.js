import { RetryManager, RetryConfig, RetryPresets } from '../RetryManager.js';
import { NetworkError, AuthenticationError, RateLimitError } from '../../errors/ErrorTypes.js';

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffFactor: 2,
      jitter: false
    });
  });

  describe('executeWithRetry', () => {
    it('應該在第一次成功時返回結果', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('應該在失敗後重試', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('連線失敗'))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('應該在達到最大重試次數後拋出錯誤', async () => {
      const error = new NetworkError('持續連線失敗');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryManager.executeWithRetry(operation)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('應該不重試不可重試的錯誤', async () => {
      const error = new AuthenticationError('認證失敗', 'facebook');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(retryManager.executeWithRetry(operation)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('應該處理 RateLimitError 的特殊延遲', async () => {
      const error = new RateLimitError('請求過於頻繁', 1, 'instagram');
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      const result = await retryManager.executeWithRetry(operation);
      const elapsed = Date.now() - startTime;
      
      expect(result).toBe('success');
      expect(elapsed).toBeGreaterThan(900); // 應該等待約1秒
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('應該調用重試回調', async () => {
      const onRetry = jest.fn();
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('連線失敗'))
        .mockResolvedValue('success');
      
      await retryManager.executeWithRetry(operation, {
        retryConfig: { onRetry }
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(NetworkError),
        1,
        expect.any(Object)
      );
    });
  });

  describe('calculateDelay', () => {
    it('應該計算指數退避延遲', async () => {
      const config = new RetryConfig({
        baseDelay: 1000,
        backoffFactor: 2,
        jitter: false
      });

      const delay1 = await retryManager.calculateDelay(new NetworkError('test'), 1, config);
      const delay2 = await retryManager.calculateDelay(new NetworkError('test'), 2, config);
      const delay3 = await retryManager.calculateDelay(new NetworkError('test'), 3, config);

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
      expect(delay3).toBe(4000);
    });

    it('應該限制最大延遲', async () => {
      const config = new RetryConfig({
        baseDelay: 1000,
        maxDelay: 3000,
        backoffFactor: 2,
        jitter: false
      });

      const delay = await retryManager.calculateDelay(new NetworkError('test'), 5, config);
      expect(delay).toBe(3000);
    });

    it('應該處理 RateLimitError 的 retryAfter', async () => {
      const config = new RetryConfig({ retryAfterHeader: true, maxDelay: 10000 });
      const error = new RateLimitError('請求過於頻繁', 5, 'platform');

      const delay = await retryManager.calculateDelay(error, 1, config);
      expect(delay).toBe(5000);
    });

    it('應該添加隨機抖動', async () => {
      const config = new RetryConfig({
        baseDelay: 1000,
        jitter: true
      });

      const delays = [];
      for (let i = 0; i < 10; i++) {
        const delay = await retryManager.calculateDelay(new NetworkError('test'), 1, config);
        delays.push(delay);
      }

      // 應該有不同的延遲值
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('statistics', () => {
    it('應該記錄成功的操作統計', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await retryManager.executeWithRetry(operation);
      
      const stats = retryManager.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(1);
    });

    it('應該記錄失敗的操作統計', async () => {
      const operation = jest.fn().mockRejectedValue(new AuthenticationError('認證失敗', 'facebook'));
      
      try {
        await retryManager.executeWithRetry(operation);
      } catch (e) {
        // 預期的錯誤
      }
      
      const stats = retryManager.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('應該記錄重試統計', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('連線失敗'))
        .mockRejectedValueOnce(new NetworkError('連線失敗'))
        .mockResolvedValue('success');
      
      await retryManager.executeWithRetry(operation);
      
      const stats = retryManager.getStats();
      expect(stats.totalRetries).toBe(2);
      expect(stats.avgRetryCount).toBe(2);
    });

    it('應該追蹤進行中的重試', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new NetworkError('連線失敗'))
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('success'), 100)));
      
      const promise = retryManager.executeWithRetry(operation, {
        operationId: 'test-op'
      });
      
      // 檢查進行中的重試
      const activeRetries = retryManager.getActiveRetries();
      expect(activeRetries).toHaveLength(1);
      expect(activeRetries[0].id).toBe('test-op');
      
      await promise;
      
      // 完成後應該沒有進行中的重試
      expect(retryManager.getActiveRetries()).toHaveLength(0);
    });

    it('應該重置統計', () => {
      retryManager.stats.totalOperations = 10;
      retryManager.stats.successfulOperations = 8;
      
      retryManager.resetStats();
      
      const stats = retryManager.getStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('RetryConfig', () => {
    it('應該使用預設值', () => {
      const config = new RetryConfig();
      
      expect(config.maxAttempts).toBe(3);
      expect(config.baseDelay).toBe(1000);
      expect(config.backoffFactor).toBe(2);
      expect(config.jitter).toBe(true);
    });

    it('應該覆寫預設值', () => {
      const config = new RetryConfig({
        maxAttempts: 5,
        baseDelay: 2000,
        jitter: false
      });
      
      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.jitter).toBe(false);
    });

    it('應該使用自定義重試條件', () => {
      const customCondition = jest.fn().mockReturnValue(false);
      const config = new RetryConfig({
        retryCondition: customCondition
      });
      
      const error = new NetworkError('測試');
      const shouldRetry = config.retryCondition(error, 1);
      
      expect(customCondition).toHaveBeenCalledWith(error, 1);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('RetryPresets', () => {
    it('應該有預定義的重試配置', () => {
      expect(RetryPresets.FAST).toBeDefined();
      expect(RetryPresets.STANDARD).toBeDefined();
      expect(RetryPresets.ROBUST).toBeDefined();
      expect(RetryPresets.FILE_OPERATIONS).toBeDefined();
      expect(RetryPresets.AUTHENTICATION).toBeDefined();
    });

    it('FAST 配置應該有較短的延遲', () => {
      expect(RetryPresets.FAST.baseDelay).toBeLessThan(RetryPresets.STANDARD.baseDelay);
      expect(RetryPresets.FAST.maxDelay).toBeLessThan(RetryPresets.STANDARD.maxDelay);
    });

    it('ROBUST 配置應該有更多重試次數', () => {
      expect(RetryPresets.ROBUST.maxAttempts).toBeGreaterThan(RetryPresets.STANDARD.maxAttempts);
    });

    it('AUTHENTICATION 配置應該限制重試條件', () => {
      const authError = new AuthenticationError('認證失敗', 'facebook');
      const networkError = new NetworkError('連線失敗');
      
      expect(RetryPresets.AUTHENTICATION.retryCondition(authError, 1)).toBe(false);
      expect(RetryPresets.AUTHENTICATION.retryCondition(networkError, 1)).toBe(true);
    });
  });

  describe('併發控制', () => {
    it('應該處理多個併發操作', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        jest.fn().mockResolvedValue(`result-${i}`)
      );
      
      const promises = operations.map((op, i) => 
        retryManager.executeWithRetry(op, { operationId: `op-${i}` })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toEqual(['result-0', 'result-1', 'result-2', 'result-3', 'result-4']);
      
      const stats = retryManager.getStats();
      expect(stats.totalOperations).toBe(5);
      expect(stats.successRate).toBe(1);
    });

    it('應該能取消進行中的重試', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new NetworkError('連線失敗'));
      
      const promise = retryManager.executeWithRetry(operation, {
        operationId: 'cancellable-op'
      });
      
      // 取消重試
      const cancelled = retryManager.cancelRetry('cancellable-op');
      expect(cancelled).toBe(true);
      
      // 操作應該仍然失敗
      await expect(promise).rejects.toThrow();
    });

    it('應該能取消所有重試', async () => {
      const operations = Array.from({ length: 3 }, () => 
        jest.fn().mockRejectedValue(new NetworkError('連線失敗'))
      );
      
      const promises = operations.map((op, i) => 
        retryManager.executeWithRetry(op, { operationId: `op-${i}` })
      );
      
      const cancelledCount = retryManager.cancelAllRetries();
      expect(cancelledCount).toBe(3);
      
      // 所有操作都應該失敗
      await Promise.all(promises.map(p => 
        expect(p).rejects.toThrow()
      ));
    });
  });
});