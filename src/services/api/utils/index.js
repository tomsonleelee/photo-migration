/**
 * API Integration Layer Utilities
 * 
 * This module exports all shared utilities for the API integration layer,
 * including logging, rate limiting, caching, and error handling utilities.
 */

// Logging utilities
export {
  Logger,
  LogLevel,
  LogLevelNames,
  logger,
  createContextLogger,
  createPlatformLogger
} from './Logger.js';

// Rate limiting utilities
export {
  RateLimitManager,
  PLATFORM_RATE_LIMITS,
  rateLimitManager,
  createPlatformLimiter,
  executeWithRateLimit
} from './RateLimitManager.js';

// Caching utilities
export {
  CacheManager,
  CacheStrategy,
  CACHE_CONFIGS,
  cacheManager,
  createCache,
  fetchWithCache
} from './CacheManager.js';

// Data normalization utilities
export {
  ExifNormalizer,
  FileNameNormalizer,
  MetadataNormalizer,
  DataNormalizationPipeline
} from './DataNormalizer.js';

// Performance monitoring and optimization utilities
export {
  MemoryMonitor,
  RequestOptimizer
} from './PerformanceMonitor.js';

/**
 * Unified utilities configuration
 */
export const UTILS_CONFIG = {
  logging: {
    defaultLevel: 'INFO',
    enableStorage: true,
    maxStorageEntries: 1000
  },
  rateLimit: {
    enableGlobalLimit: true,
    enablePlatformLimits: true,
    enableMetrics: true
  },
  cache: {
    enableMetrics: true,
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxTotalSize: 200 * 1024 * 1024 // 200MB
  }
};

/**
 * Initialize all utilities with unified configuration
 * @param {Object} config - Configuration options
 * @returns {Object} Initialized utilities
 */
export function initializeUtils(config = {}) {
  const finalConfig = {
    ...UTILS_CONFIG,
    ...config
  };

  // Initialize logger
  const utilLogger = new Logger({
    level: finalConfig.logging.defaultLevel,
    enableStorage: finalConfig.logging.enableStorage,
    maxStorageEntries: finalConfig.logging.maxStorageEntries,
    contextPrefix: '[PhotoAPI:Utils]'
  });

  // Initialize rate limiter
  const utilRateLimitManager = new RateLimitManager({
    enableGlobalLimit: finalConfig.rateLimit.enableGlobalLimit,
    enablePlatformLimits: finalConfig.rateLimit.enablePlatformLimits,
    enableMetrics: finalConfig.rateLimit.enableMetrics
  });

  // Initialize cache manager
  const utilCacheManager = new CacheManager({
    enableMetrics: finalConfig.cache.enableMetrics,
    defaultTTL: finalConfig.cache.defaultTTL,
    maxTotalSize: finalConfig.cache.maxTotalSize
  });

  utilLogger.info('Initialized API utilities', {
    config: finalConfig
  });

  return {
    logger: utilLogger,
    rateLimitManager: utilRateLimitManager,
    cacheManager: utilCacheManager,
    config: finalConfig
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor(logger = null) {
    this.logger = logger || createContextLogger('Performance');
    this.metrics = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} operation - Operation name
   * @returns {Function} End timing function
   */
  startTimer(operation) {
    const startTime = Date.now();
    
    return (metadata = {}) => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, metadata);
      return duration;
    };
  }

  /**
   * Record a performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  recordMetric(operation, duration, metadata = {}) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastExecution: null
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastExecution = new Date().toISOString();

    this.logger.logPerformance(operation, duration, {
      count: metric.count,
      average: metric.averageDuration,
      ...metadata
    });
  }

  /**
   * Get performance statistics
   * @param {string} operation - Operation name (optional)
   * @returns {Object} Performance statistics
   */
  getStats(operation = null) {
    if (operation) {
      return this.metrics.get(operation) || null;
    }

    const stats = {};
    for (const [op, metric] of this.metrics) {
      stats[op] = { ...metric };
    }
    return stats;
  }

  /**
   * Reset metrics
   * @param {string} operation - Operation name (optional)
   */
  reset(operation = null) {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * Retry utilities
 */
export class RetryManager {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitter: true,
      retryCondition: (error) => error.statusCode >= 500 || error.statusCode === 429,
      ...options
    };
    
    this.logger = createContextLogger('Retry');
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Execution result
   */
  async execute(fn, options = {}) {
    const config = { ...this.options, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 0) {
          this.logger.info(`Retry succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === config.maxRetries) {
          this.logger.error(`All retry attempts failed`, {
            attempts: attempt + 1,
            error: error.message
          });
          break;
        }

        if (!config.retryCondition(error)) {
          this.logger.warn(`Error not retryable`, {
            error: error.message,
            statusCode: error.statusCode
          });
          break;
        }

        const delay = this._calculateDelay(attempt, config);
        
        this.logger.warn(`Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          delay,
          error: error.message
        });

        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate retry delay
   * @param {number} attempt - Attempt number
   * @param {Object} config - Configuration
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.exponentialBase, attempt);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      delay += Math.random() * 1000;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Health check utilities
 */
export class HealthChecker {
  constructor(logger = null) {
    this.logger = logger || createContextLogger('Health');
    this.checks = new Map();
  }

  /**
   * Register a health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Check function
   * @param {Object} options - Check options
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      lastResult: null,
      lastChecked: null
    });
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    const results = {};
    const promises = [];

    for (const [name, check] of this.checks) {
      promises.push(
        this._runCheck(name, check)
          .then(result => {
            results[name] = result;
          })
          .catch(error => {
            results[name] = {
              status: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            };
          })
      );
    }

    await Promise.all(promises);

    const overallStatus = this._calculateOverallStatus(results);
    
    this.logger.info(`Health check completed`, {
      status: overallStatus,
      checks: Object.keys(results).length
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  /**
   * Run a single health check
   * @param {string} name - Check name
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Check result
   * @private
   */
  async _runCheck(name, check) {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });

      const result = await Promise.race([
        check.checkFn(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      const checkResult = {
        status: 'healthy',
        result,
        duration,
        timestamp: new Date().toISOString()
      };

      check.lastResult = checkResult;
      check.lastChecked = new Date().toISOString();

      return checkResult;
    } catch (error) {
      const duration = Date.now() - startTime;

      const checkResult = {
        status: 'unhealthy',
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };

      check.lastResult = checkResult;
      check.lastChecked = new Date().toISOString();

      return checkResult;
    }
  }

  /**
   * Calculate overall health status
   * @param {Object} results - Check results
   * @returns {string} Overall status
   * @private
   */
  _calculateOverallStatus(results) {
    const statuses = Object.values(results).map(r => r.status);
    
    if (statuses.includes('error') || statuses.includes('unhealthy')) {
      // Check if any critical checks failed
      for (const [name, check] of this.checks) {
        if (check.critical && results[name]?.status !== 'healthy') {
          return 'critical';
        }
      }
      return 'degraded';
    }

    return 'healthy';
  }
}

/**
 * Default utility instances
 */
export const performanceMonitor = new PerformanceMonitor();
export const retryManager = new RetryManager();
export const healthChecker = new HealthChecker(); 