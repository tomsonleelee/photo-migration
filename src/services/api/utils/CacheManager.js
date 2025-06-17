import { LRUCache } from 'lru-cache';
import { logger } from './Logger.js';

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIGS = {
  photos: {
    ttl: 5 * 60 * 1000,      // 5 minutes
    max: 1000,                // Max 1000 photo entries
    size: 50 * 1024 * 1024,  // 50MB
    fetchMethod: 'stale-while-revalidate'
  },
  albums: {
    ttl: 15 * 60 * 1000,     // 15 minutes
    max: 200,                 // Max 200 album entries
    size: 10 * 1024 * 1024,  // 10MB
    fetchMethod: 'fresh'
  },
  profiles: {
    ttl: 60 * 60 * 1000,     // 1 hour
    max: 100,                 // Max 100 profiles
    size: 5 * 1024 * 1024,   // 5MB
    fetchMethod: 'fresh'
  },
  api_limits: {
    ttl: 5 * 60 * 1000,      // 5 minutes
    max: 50,                  // Max 50 limit entries
    size: 1 * 1024 * 1024,   // 1MB
    fetchMethod: 'fresh'
  },
  default: {
    ttl: 10 * 60 * 1000,     // 10 minutes
    max: 500,                 // Max 500 entries
    size: 20 * 1024 * 1024,  // 20MB
    fetchMethod: 'fresh'
  }
};

/**
 * Cache strategies
 */
export const CacheStrategy = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Advanced Cache Manager with multi-level caching support
 */
export class CacheManager {
  constructor(options = {}) {
    this.options = {
      enableL1Cache: true,     // In-memory cache
      enableL2Cache: false,    // Local storage cache (not implemented)
      enableMetrics: true,
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      maxTotalSize: 200 * 1024 * 1024, // 200MB
      compressionEnabled: false,
      ...options
    };

    this.caches = new Map();
    this.metrics = new Map();
    this.totalSize = 0;
    
    this._initializeDefaultCaches();
  }

  /**
   * Get or create a cache for a specific type
   * @param {string} type - Cache type
   * @param {Object} customConfig - Custom configuration
   * @returns {LRU} Cache instance
   */
  getCache(type, customConfig = null) {
    if (this.caches.has(type)) {
      return this.caches.get(type);
    }

    const config = customConfig || CACHE_CONFIGS[type] || CACHE_CONFIGS.default;
    const cache = this._createCache(type, config);
    
    this.caches.set(type, cache);
    this._initializeMetrics(type);
    
    logger.info(`Created cache for type: ${type}`, {
      type,
      config: {
        ttl: config.ttl,
        max: config.max,
        size: config.size
      }
    });

    return cache;
  }

  /**
   * Get a value from cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Object} options - Options
   * @returns {any} Cached value or null
   */
  get(type, key, options = {}) {
    const cache = this.getCache(type);
    const fullKey = this._createKey(type, key);
    
    try {
      const value = cache.get(fullKey);
      
      if (value !== undefined) {
        this._updateMetrics(type, 'hit');
        
        logger.debug(`Cache hit for ${type}:${key}`, {
          type,
          key,
          hasValue: !!value
        });
        
        return value;
      } else {
        this._updateMetrics(type, 'miss');
        
        logger.debug(`Cache miss for ${type}:${key}`, {
          type,
          key
        });
        
        return null;
      }
    } catch (error) {
      this._updateMetrics(type, 'error');
      logger.error(`Cache get error for ${type}:${key}`, {
        type,
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {Object} options - Options
   * @returns {boolean} Success status
   */
  set(type, key, value, options = {}) {
    const cache = this.getCache(type);
    const fullKey = this._createKey(type, key);
    const { ttl = null } = options;
    
    try {
      const entryOptions = {};
      if (ttl) {
        entryOptions.ttl = ttl;
      }

      // Calculate size if value is an object
      const size = this._calculateSize(value);
      if (size) {
        entryOptions.size = size;
      }

      cache.set(fullKey, value, entryOptions);
      this._updateMetrics(type, 'set');
      
      logger.debug(`Cache set for ${type}:${key}`, {
        type,
        key,
        size,
        ttl
      });
      
      return true;
    } catch (error) {
      this._updateMetrics(type, 'error');
      logger.error(`Cache set error for ${type}:${key}`, {
        type,
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(type, key) {
    const cache = this.getCache(type);
    const fullKey = this._createKey(type, key);
    
    try {
      const deleted = cache.delete(fullKey);
      this._updateMetrics(type, 'delete');
      
      logger.debug(`Cache delete for ${type}:${key}`, {
        type,
        key,
        deleted
      });
      
      return deleted;
    } catch (error) {
      this._updateMetrics(type, 'error');
      logger.error(`Cache delete error for ${type}:${key}`, {
        type,
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @returns {boolean} Existence status
   */
  has(type, key) {
    const cache = this.getCache(type);
    const fullKey = this._createKey(type, key);
    
    return cache.has(fullKey);
  }

  /**
   * Clear all entries in a cache type
   * @param {string} type - Cache type
   */
  clear(type) {
    const cache = this.caches.get(type);
    if (cache) {
      cache.clear();
      this._resetMetrics(type);
      
      logger.info(`Cleared cache for type: ${type}`, { type });
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const [type, cache] of this.caches) {
      cache.clear();
      this._resetMetrics(type);
    }
    
    logger.info('Cleared all caches');
  }

  /**
   * Get cache statistics
   * @param {string} type - Cache type (optional)
   * @returns {Object} Statistics
   */
  getStats(type = null) {
    if (type) {
      const cache = this.caches.get(type);
      const metrics = this.metrics.get(type);
      
      if (!cache || !metrics) {
        return null;
      }
      
      return {
        type,
        size: cache.size,
        max: cache.max,
        calculatedSize: cache.calculatedSize,
        metrics: { ...metrics },
        hitRate: metrics.hit / (metrics.hit + metrics.miss) || 0
      };
    }
    
    const stats = {
      caches: {},
      totalCaches: this.caches.size,
      totalSize: this.totalSize
    };
    
    for (const cacheType of this.caches.keys()) {
      stats.caches[cacheType] = this.getStats(cacheType);
    }
    
    return stats;
  }

  /**
   * Fetch with cache strategy
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   */
  async fetchWithStrategy(type, key, fetchFn, options = {}) {
    const {
      strategy = CacheStrategy.CACHE_FIRST,
      ttl = null,
      forceRefresh = false
    } = options;

    switch (strategy) {
      case CacheStrategy.CACHE_FIRST:
        return this._fetchCacheFirst(type, key, fetchFn, { ttl, forceRefresh });
      
      case CacheStrategy.NETWORK_FIRST:
        return this._fetchNetworkFirst(type, key, fetchFn, { ttl, forceRefresh });
      
      case CacheStrategy.CACHE_ONLY:
        return this.get(type, key);
      
      case CacheStrategy.NETWORK_ONLY:
        return fetchFn();
      
      case CacheStrategy.STALE_WHILE_REVALIDATE:
        return this._fetchStaleWhileRevalidate(type, key, fetchFn, { ttl, forceRefresh });
      
      default:
        return this._fetchCacheFirst(type, key, fetchFn, { ttl, forceRefresh });
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} type - Cache type
   * @param {RegExp|string} pattern - Pattern to match keys
   */
  invalidateByPattern(type, pattern) {
    const cache = this.caches.get(type);
    if (!cache) {
      return;
    }

    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const keysToDelete = [];
    
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      cache.delete(key);
    }
    
    this._updateMetrics(type, 'invalidated', keysToDelete.length);
    
    logger.info(`Invalidated ${keysToDelete.length} cache entries for pattern`, {
      type,
      pattern: pattern.toString(),
      count: keysToDelete.length
    });
  }

  /**
   * Get cache health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const stats = this.getStats();
    const health = {
      status: 'healthy',
      issues: [],
      totalMemoryUsage: this.totalSize,
      cacheCount: this.caches.size
    };

    // Check memory usage
    if (this.totalSize > this.options.maxTotalSize * 0.9) {
      health.status = 'warning';
      health.issues.push('High memory usage');
    }

    // Check hit rates
    for (const [type, cacheStats] of Object.entries(stats.caches)) {
      if (cacheStats.hitRate < 0.5 && cacheStats.metrics.hit + cacheStats.metrics.miss > 100) {
        health.status = 'warning';
        health.issues.push(`Low hit rate for ${type}: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
      }
    }

    return health;
  }

  /**
   * Initialize default caches
   * @private
   */
  _initializeDefaultCaches() {
    for (const type of Object.keys(CACHE_CONFIGS)) {
      if (type !== 'default') {
        this.getCache(type);
      }
    }
  }

  /**
   * Create a cache instance
   * @param {string} type - Cache type
   * @param {Object} config - Cache configuration
   * @returns {LRU} Cache instance
   * @private
   */
  _createCache(type, config) {
    const options = {
      max: config.max,
      ttl: config.ttl,
      updateAgeOnGet: true,
      allowStale: false
    };

    if (config.size) {
      options.maxSize = config.size;
      options.sizeCalculation = (value) => this._calculateSize(value);
    }

    const cache = new LRUCache(options);

    // Set up event handlers
    cache.on('evict', (key, value, reason) => {
      this._updateMetrics(type, 'evicted');
      logger.debug(`Cache eviction for ${type}`, {
        type,
        key,
        reason
      });
    });

    return cache;
  }

  /**
   * Create a cache key
   * @param {string} type - Cache type
   * @param {string} key - Original key
   * @returns {string} Full cache key
   * @private
   */
  _createKey(type, key) {
    return `${type}:${key}`;
  }

  /**
   * Calculate the size of a value
   * @param {any} value - Value to calculate size for
   * @returns {number} Size in bytes
   * @private
   */
  _calculateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // Approximate Unicode size
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    } else {
      return 8; // Approximate size for primitives
    }
  }

  /**
   * Initialize metrics for a cache type
   * @param {string} type - Cache type
   * @private
   */
  _initializeMetrics(type) {
    if (!this.options.enableMetrics) {
      return;
    }

    this.metrics.set(type, {
      hit: 0,
      miss: 0,
      set: 0,
      delete: 0,
      evicted: 0,
      invalidated: 0,
      error: 0,
      lastActivity: null
    });
  }

  /**
   * Update metrics for a cache type
   * @param {string} type - Cache type
   * @param {string} operation - Operation type
   * @param {number} value - Value to add
   * @private
   */
  _updateMetrics(type, operation, value = 1) {
    if (!this.options.enableMetrics) {
      return;
    }

    const metrics = this.metrics.get(type);
    if (!metrics) {
      return;
    }

    metrics[operation] += value;
    metrics.lastActivity = new Date().toISOString();
  }

  /**
   * Reset metrics for a cache type
   * @param {string} type - Cache type
   * @private
   */
  _resetMetrics(type) {
    this._initializeMetrics(type);
  }

  /**
   * Cache-first fetch strategy
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Fetch function
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   * @private
   */
  async _fetchCacheFirst(type, key, fetchFn, options) {
    const cached = this.get(type, key);
    
    if (cached && !options.forceRefresh) {
      return cached;
    }
    
    try {
      const data = await fetchFn();
      this.set(type, key, data, { ttl: options.ttl });
      return data;
    } catch (error) {
      // Return stale data if available
      if (cached) {
        logger.warn(`Returning stale data for ${type}:${key} due to fetch error`, {
          error: error.message
        });
        return cached;
      }
      throw error;
    }
  }

  /**
   * Network-first fetch strategy
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Fetch function
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   * @private
   */
  async _fetchNetworkFirst(type, key, fetchFn, options) {
    try {
      const data = await fetchFn();
      this.set(type, key, data, { ttl: options.ttl });
      return data;
    } catch (error) {
      const cached = this.get(type, key);
      if (cached) {
        logger.warn(`Returning cached data for ${type}:${key} due to fetch error`, {
          error: error.message
        });
        return cached;
      }
      throw error;
    }
  }

  /**
   * Stale-while-revalidate fetch strategy
   * @param {string} type - Cache type
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Fetch function
   * @param {Object} options - Options
   * @returns {Promise<any>} Data
   * @private
   */
  async _fetchStaleWhileRevalidate(type, key, fetchFn, options) {
    const cached = this.get(type, key);
    
    // Start background fetch
    fetchFn()
      .then(data => {
        this.set(type, key, data, { ttl: options.ttl });
      })
      .catch(error => {
        logger.error(`Background fetch failed for ${type}:${key}`, {
          error: error.message
        });
      });
    
    // Return cached data immediately if available
    if (cached) {
      return cached;
    }
    
    // If no cached data, wait for fetch
    return fetchFn();
  }
}

/**
 * Default cache manager instance
 */
export const cacheManager = new CacheManager();

/**
 * Helper function to get a cache instance
 * @param {string} type - Cache type
 * @param {Object} customConfig - Custom configuration
 * @returns {LRU} Cache instance
 */
export function createCache(type, customConfig = null) {
  return cacheManager.getCache(type, customConfig);
}

/**
 * Helper function to fetch with caching
 * @param {string} type - Cache type
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Fetch function
 * @param {Object} options - Options
 * @returns {Promise<any>} Data
 */
export async function fetchWithCache(type, key, fetchFn, options = {}) {
  return cacheManager.fetchWithStrategy(type, key, fetchFn, options);
} 