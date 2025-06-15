import Bottleneck from 'bottleneck';
import { logger } from './Logger.js';

/**
 * Platform-specific rate limit configurations
 */
export const PLATFORM_RATE_LIMITS = {
  google_photos: {
    minTime: 100,           // 100ms between requests
    maxConcurrent: 10,      // 10 concurrent requests
    reservoir: 10000,       // 10,000 requests per hour
    reservoirRefreshAmount: 10000,
    reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
    retries: 3,
    retryDelayMultiplier: 2000
  },
  facebook: {
    minTime: 200,           // 200ms between requests
    maxConcurrent: 5,       // 5 concurrent requests
    reservoir: 200,         // 200 requests per hour (conservative)
    reservoirRefreshAmount: 200,
    reservoirRefreshInterval: 60 * 60 * 1000,
    retries: 3,
    retryDelayMultiplier: 5000
  },
  instagram: {
    minTime: 500,           // 500ms between requests
    maxConcurrent: 3,       // 3 concurrent requests
    reservoir: 200,         // 200 requests per hour
    reservoirRefreshAmount: 200,
    reservoirRefreshInterval: 60 * 60 * 1000,
    retries: 2,
    retryDelayMultiplier: 10000
  },
  flickr: {
    minTime: 100,           // 100ms between requests
    maxConcurrent: 8,       // 8 concurrent requests
    reservoir: 3600,        // 3,600 requests per hour
    reservoirRefreshAmount: 3600,
    reservoirRefreshInterval: 60 * 60 * 1000,
    retries: 3,
    retryDelayMultiplier: 1000
  },
  '500px': {
    minTime: 1000,          // 1 second between requests
    maxConcurrent: 2,       // 2 concurrent requests
    reservoir: 100,         // 100 requests per hour (very conservative)
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 60 * 60 * 1000,
    retries: 2,
    retryDelayMultiplier: 15000
  },
  default: {
    minTime: 250,
    maxConcurrent: 5,
    reservoir: 1000,
    reservoirRefreshAmount: 1000,
    reservoirRefreshInterval: 60 * 60 * 1000,
    retries: 3,
    retryDelayMultiplier: 2000
  }
};

/**
 * Rate Limit Manager - Manages rate limiting for multiple platforms
 */
export class RateLimitManager {
  constructor(options = {}) {
    this.options = {
      enableGlobalLimit: true,
      globalConfig: {
        minTime: 50,
        maxConcurrent: 20,
        reservoir: 50000,
        reservoirRefreshAmount: 50000,
        reservoirRefreshInterval: 60 * 60 * 1000
      },
      enablePlatformLimits: true,
      enableMetrics: true,
      ...options
    };

    this.limiters = new Map();
    this.globalLimiter = null;
    this.metrics = new Map();
    
    this._initializeGlobalLimiter();
  }

  /**
   * Get or create a rate limiter for a platform
   * @param {string} platform - Platform identifier
   * @param {Object} customConfig - Custom configuration
   * @returns {Bottleneck} Rate limiter instance
   */
  getLimiter(platform, customConfig = null) {
    if (this.limiters.has(platform)) {
      return this.limiters.get(platform);
    }

    const config = customConfig || PLATFORM_RATE_LIMITS[platform] || PLATFORM_RATE_LIMITS.default;
    const limiter = this._createLimiter(platform, config);
    
    this.limiters.set(platform, limiter);
    this._initializeMetrics(platform);
    
    logger.info(`Created rate limiter for platform: ${platform}`, {
      platform,
      config: {
        minTime: config.minTime,
        maxConcurrent: config.maxConcurrent,
        reservoir: config.reservoir
      }
    });

    return limiter;
  }

  /**
   * Execute a function with rate limiting
   * @param {string} platform - Platform identifier
   * @param {Function} fn - Function to execute
   * @param {Object} options - Execution options
   * @returns {Promise} Execution result
   */
  async execute(platform, fn, options = {}) {
    const {
      priority = 5,
      weight = 1,
      expiration = 5 * 60 * 1000, // 5 minutes
      id = null
    } = options;

    const limiter = this.getLimiter(platform);
    const startTime = Date.now();
    
    // Update metrics
    this._updateMetrics(platform, 'requested');

    try {
      // Use global limiter if enabled
      if (this.options.enableGlobalLimit && this.globalLimiter) {
        await this.globalLimiter.schedule({ priority, weight, expiration, id }, async () => {
          return limiter.schedule({ priority, weight, expiration, id }, fn);
        });
      } else {
        return await limiter.schedule({ priority, weight, expiration, id }, fn);
      }
    } catch (error) {
      this._updateMetrics(platform, 'failed');
      
      // Log rate limit specific errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        logger.logRateLimit(platform, 'rate_limit_exceeded', {
          error: error.message,
          duration: Date.now() - startTime
        });
      }
      
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this._updateMetrics(platform, 'completed', duration);
      
      logger.logPerformance(`Rate Limited Request: ${platform}`, duration, {
        platform,
        success: true
      });
    }
  }

  /**
   * Get current status of all rate limiters
   * @returns {Object} Status information
   */
  getStatus() {
    const status = {
      global: null,
      platforms: {},
      metrics: this.getMetrics()
    };

    // Global limiter status
    if (this.globalLimiter) {
      status.global = {
        running: this.globalLimiter.running(),
        queued: this.globalLimiter.queued(),
        executing: this.globalLimiter.executing(),
        reservoir: this.globalLimiter.reservoir()
      };
    }

    // Platform limiter status
    for (const [platform, limiter] of this.limiters) {
      status.platforms[platform] = {
        running: limiter.running(),
        queued: limiter.queued(),
        executing: limiter.executing(),
        reservoir: limiter.reservoir()
      };
    }

    return status;
  }

  /**
   * Get metrics for all platforms
   * @returns {Object} Metrics data
   */
  getMetrics() {
    const metrics = {};
    
    for (const [platform, data] of this.metrics) {
      metrics[platform] = { ...data };
    }
    
    return metrics;
  }

  /**
   * Reset metrics for a platform or all platforms
   * @param {string} platform - Platform identifier (optional)
   */
  resetMetrics(platform = null) {
    if (platform) {
      this.metrics.delete(platform);
      this._initializeMetrics(platform);
    } else {
      this.metrics.clear();
      for (const platformKey of this.limiters.keys()) {
        this._initializeMetrics(platformKey);
      }
    }
    
    logger.info(`Reset metrics for ${platform || 'all platforms'}`);
  }

  /**
   * Pause a platform's rate limiter
   * @param {string} platform - Platform identifier
   * @param {number} duration - Pause duration in milliseconds
   */
  async pausePlatform(platform, duration = 60000) {
    const limiter = this.limiters.get(platform);
    if (!limiter) {
      throw new Error(`No rate limiter found for platform: ${platform}`);
    }

    await limiter.stop({ dropWaitingJobs: false });
    
    logger.logRateLimit(platform, 'paused', { duration });

    if (duration > 0) {
      setTimeout(() => {
        limiter.start();
        logger.logRateLimit(platform, 'resumed', {});
      }, duration);
    }
  }

  /**
   * Resume a paused platform's rate limiter
   * @param {string} platform - Platform identifier
   */
  resumePlatform(platform) {
    const limiter = this.limiters.get(platform);
    if (!limiter) {
      throw new Error(`No rate limiter found for platform: ${platform}`);
    }

    limiter.start();
    logger.logRateLimit(platform, 'resumed', {});
  }

  /**
   * Update rate limit configuration for a platform
   * @param {string} platform - Platform identifier
   * @param {Object} config - New configuration
   */
  updatePlatformConfig(platform, config) {
    const currentLimiter = this.limiters.get(platform);
    if (currentLimiter) {
      // Stop current limiter
      currentLimiter.stop({ dropWaitingJobs: false });
    }

    // Create new limiter with updated config
    const newLimiter = this._createLimiter(platform, config);
    this.limiters.set(platform, newLimiter);
    
    logger.info(`Updated rate limit config for platform: ${platform}`, { config });
  }

  /**
   * Shutdown all rate limiters
   * @param {Object} options - Shutdown options
   */
  async shutdown(options = {}) {
    const { dropWaitingJobs = false } = options;
    
    logger.info('Shutting down rate limiters', { dropWaitingJobs });

    // Stop global limiter
    if (this.globalLimiter) {
      await this.globalLimiter.stop({ dropWaitingJobs });
    }

    // Stop all platform limiters
    const shutdownPromises = [];
    for (const [platform, limiter] of this.limiters) {
      shutdownPromises.push(
        limiter.stop({ dropWaitingJobs })
          .then(() => logger.info(`Stopped rate limiter for platform: ${platform}`))
          .catch(error => logger.error(`Error stopping rate limiter for platform: ${platform}`, { error: error.message }))
      );
    }

    await Promise.all(shutdownPromises);
    
    this.limiters.clear();
    this.metrics.clear();
    
    logger.info('All rate limiters shut down');
  }

  /**
   * Initialize global rate limiter
   * @private
   */
  _initializeGlobalLimiter() {
    if (!this.options.enableGlobalLimit) {
      return;
    }

    this.globalLimiter = new Bottleneck(this.options.globalConfig);
    
    this.globalLimiter.on('failed', (error, jobInfo) => {
      logger.warn('Global rate limiter job failed', {
        error: error.message,
        retryCount: jobInfo.retryCount
      });
    });

    this.globalLimiter.on('retry', (error, jobInfo) => {
      logger.info('Global rate limiter retrying job', {
        error: error.message,
        retryCount: jobInfo.retryCount
      });
    });
  }

  /**
   * Create a rate limiter for a platform
   * @param {string} platform - Platform identifier
   * @param {Object} config - Rate limit configuration
   * @returns {Bottleneck} Rate limiter instance
   * @private
   */
  _createLimiter(platform, config) {
    const limiter = new Bottleneck(config);

    // Set up event handlers
    limiter.on('failed', (error, jobInfo) => {
      this._updateMetrics(platform, 'failed');
      logger.logRateLimit(platform, 'job_failed', {
        error: error.message,
        retryCount: jobInfo.retryCount
      });
    });

    limiter.on('retry', (error, jobInfo) => {
      this._updateMetrics(platform, 'retried');
      logger.logRateLimit(platform, 'job_retry', {
        error: error.message,
        retryCount: jobInfo.retryCount
      });
    });

    limiter.on('idle', () => {
      logger.debug(`Rate limiter idle for platform: ${platform}`);
    });

    limiter.on('depleted', () => {
      logger.logRateLimit(platform, 'reservoir_depleted', {
        reservoir: limiter.reservoir()
      });
    });

    return limiter;
  }

  /**
   * Initialize metrics for a platform
   * @param {string} platform - Platform identifier
   * @private
   */
  _initializeMetrics(platform) {
    if (!this.options.enableMetrics) {
      return;
    }

    this.metrics.set(platform, {
      requested: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastActivity: null
    });
  }

  /**
   * Update metrics for a platform
   * @param {string} platform - Platform identifier
   * @param {string} type - Metric type
   * @param {number} value - Metric value
   * @private
   */
  _updateMetrics(platform, type, value = null) {
    if (!this.options.enableMetrics) {
      return;
    }

    const metrics = this.metrics.get(platform);
    if (!metrics) {
      return;
    }

    metrics[type]++;
    metrics.lastActivity = new Date().toISOString();

    if (type === 'completed' && value) {
      metrics.totalDuration += value;
      metrics.averageDuration = metrics.totalDuration / metrics.completed;
    }
  }
}

/**
 * Default rate limit manager instance
 */
export const rateLimitManager = new RateLimitManager();

/**
 * Helper function to create a rate limiter for a specific platform
 * @param {string} platform - Platform identifier
 * @param {Object} customConfig - Custom configuration
 * @returns {Bottleneck} Rate limiter instance
 */
export function createPlatformLimiter(platform, customConfig = null) {
  return rateLimitManager.getLimiter(platform, customConfig);
}

/**
 * Helper function to execute a function with rate limiting
 * @param {string} platform - Platform identifier
 * @param {Function} fn - Function to execute
 * @param {Object} options - Execution options
 * @returns {Promise} Execution result
 */
export async function executeWithRateLimit(platform, fn, options = {}) {
  return rateLimitManager.execute(platform, fn, options);
} 