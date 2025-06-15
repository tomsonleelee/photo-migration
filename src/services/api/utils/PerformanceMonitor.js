/**
 * Performance Monitoring and Optimization Utilities
 * Provides comprehensive performance analysis and optimization tools for the API Integration Layer
 */

import { Logger } from './Logger.js';

/**
 * Performance metrics collection and analysis
 */
export class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logger = options.logger || new Logger('PerformanceMonitor');
    this.metrics = new Map();
    this.thresholds = {
      apiCall: 5000, // 5 seconds
      dataProcessing: 2000, // 2 seconds
      cacheOperation: 100, // 100ms
      normalization: 1000, // 1 second
      ...options.thresholds
    };
    this.activeTimers = new Map();
    this.aggregatedMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      platformBreakdown: new Map(),
      errorBreakdown: new Map()
    };
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId, metadata = {}) {
    if (!this.enabled) return;

    const timer = {
      startTime: performance.now(),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    this.activeTimers.set(operationId, timer);
    
    this.logger.debug(`Started timer for operation: ${operationId}`, {
      operationId,
      metadata
    });
  }

  /**
   * End timing an operation and record metrics
   */
  endTimer(operationId, additionalData = {}) {
    if (!this.enabled) return null;

    const timer = this.activeTimers.get(operationId);
    if (!timer) {
      this.logger.warn(`No timer found for operation: ${operationId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    
    const metric = {
      operationId,
      duration,
      startTime: timer.startTime,
      endTime,
      metadata: timer.metadata,
      ...additionalData
    };

    // Store metric
    this.metrics.set(`${operationId}_${Date.now()}`, metric);
    this.activeTimers.delete(operationId);

    // Update aggregated metrics
    this.updateAggregatedMetrics(metric);

    // Check thresholds
    this.checkThresholds(metric);

    this.logger.debug(`Completed operation: ${operationId}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...metric
    });

    return metric;
  }

  /**
   * Update aggregated performance metrics
   */
  updateAggregatedMetrics(metric) {
    this.aggregatedMetrics.totalRequests++;
    
    // Update average response time
    const currentAvg = this.aggregatedMetrics.averageResponseTime;
    const totalRequests = this.aggregatedMetrics.totalRequests;
    this.aggregatedMetrics.averageResponseTime = 
      ((currentAvg * (totalRequests - 1)) + metric.duration) / totalRequests;

    // Platform breakdown
    if (metric.metadata?.platform) {
      const platform = metric.metadata.platform;
      const platformStats = this.aggregatedMetrics.platformBreakdown.get(platform) || {
        requests: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0
      };
      
      platformStats.requests++;
      platformStats.totalTime += metric.duration;
      platformStats.averageTime = platformStats.totalTime / platformStats.requests;
      
      if (metric.error) {
        platformStats.errors++;
      }
      
      this.aggregatedMetrics.platformBreakdown.set(platform, platformStats);
    }

    // Error tracking
    if (metric.error) {
      this.aggregatedMetrics.totalErrors++;
      const errorType = metric.error.type || 'Unknown';
      const errorCount = this.aggregatedMetrics.errorBreakdown.get(errorType) || 0;
      this.aggregatedMetrics.errorBreakdown.set(errorType, errorCount + 1);
    }
  }

  /**
   * Check if operation exceeded performance thresholds
   */
  checkThresholds(metric) {
    const operationType = metric.metadata?.operationType || 'general';
    const threshold = this.thresholds[operationType] || this.thresholds.apiCall;

    if (metric.duration > threshold) {
      this.logger.warn(`Performance threshold exceeded`, {
        operationId: metric.operationId,
        duration: `${metric.duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        operationType,
        platform: metric.metadata?.platform
      });

      // Trigger performance analysis
      this.analyzeSlowOperation(metric);
    }
  }

  /**
   * Analyze slow operations for optimization opportunities
   */
  analyzeSlowOperation(metric) {
    const analysis = {
      operationId: metric.operationId,
      duration: metric.duration,
      recommendations: []
    };

    // Check for caching opportunities
    if (metric.metadata?.cacheable && !metric.metadata?.cacheHit) {
      analysis.recommendations.push({
        type: 'caching',
        message: 'Consider implementing or improving caching for this operation',
        priority: 'high'
      });
    }

    // Check for batch processing opportunities
    if (metric.metadata?.batchable && (!metric.metadata?.batchSize || metric.metadata.batchSize === 1)) {
      analysis.recommendations.push({
        type: 'batching',
        message: 'Consider batching multiple requests to improve efficiency',
        priority: 'medium'
      });
    }

    // Check for rate limiting issues
    if (metric.error?.type === 'RateLimitError') {
      analysis.recommendations.push({
        type: 'rate_limiting',
        message: 'Rate limit encountered. Consider adjusting request frequency',
        priority: 'high'
      });
    }

    // Check for large data processing
    if (metric.metadata?.dataSize && metric.metadata.dataSize > 1000000) { // 1MB
      analysis.recommendations.push({
        type: 'data_processing',
        message: 'Large data set detected. Consider streaming or chunking',
        priority: 'medium'
      });
    }

    this.logger.info('Performance analysis completed', analysis);
    return analysis;
  }

  /**
   * Get performance metrics for a specific time period
   */
  getMetrics(timeWindow = 3600000) { // 1 hour default
    const now = Date.now();
    const cutoff = now - timeWindow;
    
    const recentMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.startTime > cutoff);

    return {
      timeWindow: timeWindow,
      totalOperations: recentMetrics.length,
      metrics: recentMetrics,
      aggregated: { ...this.aggregatedMetrics },
      averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
      operationTypes: this.groupByOperationType(recentMetrics),
      platforms: this.groupByPlatform(recentMetrics),
      slowestOperations: this.getSlowOperations(recentMetrics, 10)
    };
  }

  /**
   * Calculate average response time for given metrics
   */
  calculateAverageResponseTime(metrics) {
    if (metrics.length === 0) return 0;
    const totalTime = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / metrics.length;
  }

  /**
   * Group metrics by operation type
   */
  groupByOperationType(metrics) {
    const grouped = new Map();
    
    metrics.forEach(metric => {
      const type = metric.metadata?.operationType || 'unknown';
      if (!grouped.has(type)) {
        grouped.set(type, {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0
        });
      }
      
      const stats = grouped.get(type);
      stats.count++;
      stats.totalTime += metric.duration;
      stats.averageTime = stats.totalTime / stats.count;
      stats.minTime = Math.min(stats.minTime, metric.duration);
      stats.maxTime = Math.max(stats.maxTime, metric.duration);
    });

    return Object.fromEntries(grouped);
  }

  /**
   * Group metrics by platform
   */
  groupByPlatform(metrics) {
    const grouped = new Map();
    
    metrics.forEach(metric => {
      const platform = metric.metadata?.platform || 'unknown';
      if (!grouped.has(platform)) {
        grouped.set(platform, {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          errors: 0,
          successRate: 0
        });
      }
      
      const stats = grouped.get(platform);
      stats.count++;
      stats.totalTime += metric.duration;
      stats.averageTime = stats.totalTime / stats.count;
      
      if (metric.error) {
        stats.errors++;
      }
      
      stats.successRate = ((stats.count - stats.errors) / stats.count) * 100;
    });

    return Object.fromEntries(grouped);
  }

  /**
   * Get slowest operations
   */
  getSlowOperations(metrics, limit = 10) {
    return metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(metric => ({
        operationId: metric.operationId,
        duration: metric.duration,
        platform: metric.metadata?.platform,
        operationType: metric.metadata?.operationType
      }));
  }

  /**
   * Generate performance report
   */
  generateReport(options = {}) {
    const timeWindow = options.timeWindow || 3600000; // 1 hour
    const metrics = this.getMetrics(timeWindow);
    
    const report = {
      generatedAt: new Date().toISOString(),
      timeWindow: timeWindow,
      summary: {
        totalOperations: metrics.totalOperations,
        averageResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms',
        successRate: this.calculateSuccessRate(metrics.metrics),
        totalErrors: this.aggregatedMetrics.totalErrors
      },
      platformBreakdown: metrics.platforms,
      operationBreakdown: metrics.operationTypes,
      slowestOperations: metrics.slowestOperations,
      recommendations: this.generateRecommendations(metrics)
    };

    this.logger.info('Performance report generated', {
      operationsAnalyzed: metrics.totalOperations,
      timeWindow: timeWindow
    });

    return report;
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(metrics) {
    if (metrics.length === 0) return 100;
    const errors = metrics.filter(m => m.error).length;
    return (((metrics.length - errors) / metrics.length) * 100).toFixed(2) + '%';
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Check average response time
    if (metrics.averageResponseTime > this.thresholds.apiCall) {
      recommendations.push({
        type: 'response_time',
        priority: 'high',
        message: `Average response time (${metrics.averageResponseTime.toFixed(2)}ms) exceeds threshold (${this.thresholds.apiCall}ms)`,
        suggestions: [
          'Implement or improve caching strategies',
          'Consider request batching',
          'Optimize data processing logic',
          'Review rate limiting configuration'
        ]
      });
    }

    // Check error rates by platform
    Object.entries(metrics.platforms).forEach(([platform, stats]) => {
      if (stats.successRate < 95) {
        recommendations.push({
          type: 'error_rate',
          priority: 'medium',
          platform: platform,
          message: `${platform} has low success rate (${stats.successRate.toFixed(2)}%)`,
          suggestions: [
            'Review API client error handling',
            'Implement better retry logic',
            'Check authentication token management',
            'Verify rate limiting configuration'
          ]
        });
      }
    });

    // Check for operations that could benefit from caching
    const uncachedOperations = metrics.metrics.filter(m => 
      m.metadata?.cacheable && !m.metadata?.cacheHit && m.duration > 1000
    );
    
    if (uncachedOperations.length > 0) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message: `${uncachedOperations.length} slow operations could benefit from caching`,
        suggestions: [
          'Implement caching for frequently accessed data',
          'Review cache TTL settings',
          'Consider cache warming strategies'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(maxAge = 86400000) { // 24 hours default
    const cutoff = Date.now() - maxAge;
    const keysToDelete = [];
    
    for (const [key, metric] of this.metrics) {
      if (metric.startTime < cutoff) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.metrics.delete(key));
    
    this.logger.debug(`Cleaned up ${keysToDelete.length} old metrics`);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.activeTimers.clear();
    this.aggregatedMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      platformBreakdown: new Map(),
      errorBreakdown: new Map()
    };
    
    this.logger.info('Performance metrics reset');
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  constructor(options = {}) {
    this.logger = options.logger || new Logger('MemoryMonitor');
    this.thresholds = {
      heapUsed: 100 * 1024 * 1024, // 100MB
      heapTotal: 200 * 1024 * 1024, // 200MB
      external: 50 * 1024 * 1024, // 50MB
      ...options.thresholds
    };
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.isMonitoring = false;
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(2),
      externalMB: (usage.external / 1024 / 1024).toFixed(2),
      rssMB: (usage.rss / 1024 / 1024).toFixed(2),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if memory usage exceeds thresholds
   */
  checkThresholds() {
    const usage = this.getCurrentUsage();
    const warnings = [];

    if (usage.heapUsed > this.thresholds.heapUsed) {
      warnings.push({
        type: 'heap_used',
        current: usage.heapUsedMB + 'MB',
        threshold: (this.thresholds.heapUsed / 1024 / 1024).toFixed(2) + 'MB'
      });
    }

    if (usage.heapTotal > this.thresholds.heapTotal) {
      warnings.push({
        type: 'heap_total',
        current: usage.heapTotalMB + 'MB',
        threshold: (this.thresholds.heapTotal / 1024 / 1024).toFixed(2) + 'MB'
      });
    }

    if (usage.external > this.thresholds.external) {
      warnings.push({
        type: 'external',
        current: usage.externalMB + 'MB',
        threshold: (this.thresholds.external / 1024 / 1024).toFixed(2) + 'MB'
      });
    }

    if (warnings.length > 0) {
      this.logger.warn('Memory usage threshold exceeded', {
        warnings,
        currentUsage: usage
      });
    }

    return { usage, warnings };
  }

  /**
   * Start continuous memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringTimer = setInterval(() => {
      this.checkThresholds();
    }, this.monitoringInterval);

    this.logger.info('Memory monitoring started', {
      interval: this.monitoringInterval + 'ms'
    });
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    clearInterval(this.monitoringTimer);
    this.isMonitoring = false;
    
    this.logger.info('Memory monitoring stopped');
  }

  /**
   * Force garbage collection (if exposed)
   */
  forceGC() {
    if (global.gc) {
      const before = this.getCurrentUsage();
      global.gc();
      const after = this.getCurrentUsage();
      
      this.logger.info('Garbage collection forced', {
        before: before.heapUsedMB + 'MB',
        after: after.heapUsedMB + 'MB',
        freed: (before.heapUsed - after.heapUsed) / 1024 / 1024 + 'MB'
      });
      
      return { before, after };
    } else {
      this.logger.warn('Garbage collection not available. Run with --expose-gc to enable.');
      return null;
    }
  }
}

/**
 * API request optimization analyzer
 */
export class RequestOptimizer {
  constructor(options = {}) {
    this.logger = options.logger || new Logger('RequestOptimizer');
    this.requestHistory = new Map();
    this.batchingOpportunities = new Map();
    this.cachingOpportunities = new Set();
  }

  /**
   * Analyze request patterns for optimization opportunities
   */
  analyzeRequest(requestData) {
    const { url, method, timestamp = Date.now(), platform, params } = requestData;
    const requestKey = `${method}:${url}`;
    
    // Track request frequency
    if (!this.requestHistory.has(requestKey)) {
      this.requestHistory.set(requestKey, []);
    }
    
    this.requestHistory.get(requestKey).push({
      timestamp,
      platform,
      params
    });

    // Analyze patterns
    this.detectBatchingOpportunities(requestKey);
    this.detectCachingOpportunities(requestKey);
    
    return this.generateOptimizationSuggestions(requestKey);
  }

  /**
   * Detect opportunities for request batching
   */
  detectBatchingOpportunities(requestKey) {
    const history = this.requestHistory.get(requestKey);
    if (history.length < 2) return;

    // Check for requests within a short time window
    const timeWindow = 5000; // 5 seconds
    const recentRequests = history.filter(req => 
      Date.now() - req.timestamp < timeWindow
    );

    if (recentRequests.length >= 3) {
      const opportunity = {
        requestKey,
        frequency: recentRequests.length,
        timeWindow,
        suggestion: 'Consider batching these requests to reduce API calls'
      };
      
      this.batchingOpportunities.set(requestKey, opportunity);
      
      this.logger.info('Batching opportunity detected', opportunity);
    }
  }

  /**
   * Detect opportunities for caching
   */
  detectCachingOpportunities(requestKey) {
    const history = this.requestHistory.get(requestKey);
    if (history.length < 3) return;

    // Check for repeated identical requests
    const uniqueRequests = new Set(
      history.map(req => JSON.stringify(req.params))
    );

    if (uniqueRequests.size < history.length * 0.8) {
      this.cachingOpportunities.add(requestKey);
      
      this.logger.info('Caching opportunity detected', {
        requestKey,
        totalRequests: history.length,
        uniqueRequests: uniqueRequests.size,
        duplicationRate: ((1 - uniqueRequests.size / history.length) * 100).toFixed(2) + '%'
      });
    }
  }

  /**
   * Generate optimization suggestions for a request
   */
  generateOptimizationSuggestions(requestKey) {
    const suggestions = [];

    if (this.batchingOpportunities.has(requestKey)) {
      suggestions.push({
        type: 'batching',
        priority: 'high',
        message: 'Frequent similar requests detected - consider batching',
        implementation: 'Implement request queuing and batch processing'
      });
    }

    if (this.cachingOpportunities.has(requestKey)) {
      suggestions.push({
        type: 'caching',
        priority: 'medium',
        message: 'Repeated requests detected - implement caching',
        implementation: 'Add response caching with appropriate TTL'
      });
    }

    return suggestions;
  }

  /**
   * Get optimization report
   */
  getOptimizationReport() {
    return {
      generatedAt: new Date().toISOString(),
      batchingOpportunities: Array.from(this.batchingOpportunities.values()),
      cachingOpportunities: Array.from(this.cachingOpportunities),
      requestPatterns: this.analyzeRequestPatterns(),
      recommendations: this.generateGlobalRecommendations()
    };
  }

  /**
   * Analyze overall request patterns
   */
  analyzeRequestPatterns() {
    const patterns = {
      totalUniqueRequests: this.requestHistory.size,
      totalRequests: 0,
      platformDistribution: new Map(),
      timeDistribution: new Map()
    };

    for (const [requestKey, history] of this.requestHistory) {
      patterns.totalRequests += history.length;
      
      // Platform distribution
      history.forEach(req => {
        const platform = req.platform || 'unknown';
        patterns.platformDistribution.set(
          platform,
          (patterns.platformDistribution.get(platform) || 0) + 1
        );
      });

      // Time distribution (hourly)
      history.forEach(req => {
        const hour = new Date(req.timestamp).getHours();
        patterns.timeDistribution.set(
          hour,
          (patterns.timeDistribution.get(hour) || 0) + 1
        );
      });
    }

    return {
      ...patterns,
      platformDistribution: Object.fromEntries(patterns.platformDistribution),
      timeDistribution: Object.fromEntries(patterns.timeDistribution)
    };
  }

  /**
   * Generate global optimization recommendations
   */
  generateGlobalRecommendations() {
    const recommendations = [];
    const patterns = this.analyzeRequestPatterns();

    // Request volume recommendations
    if (patterns.totalRequests > 1000) {
      recommendations.push({
        type: 'volume',
        priority: 'high',
        message: 'High request volume detected',
        suggestions: [
          'Implement more aggressive caching',
          'Consider request deduplication',
          'Implement request prioritization'
        ]
      });
    }

    // Platform balance recommendations
    const platforms = Object.entries(patterns.platformDistribution);
    if (platforms.length > 1) {
      const maxPlatform = platforms.reduce((a, b) => a[1] > b[1] ? a : b);
      const maxPercentage = (maxPlatform[1] / patterns.totalRequests) * 100;
      
      if (maxPercentage > 70) {
        recommendations.push({
          type: 'platform_balance',
          priority: 'medium',
          message: `${maxPlatform[0]} accounts for ${maxPercentage.toFixed(1)}% of requests`,
          suggestions: [
            'Consider platform-specific optimizations',
            'Implement platform-specific rate limiting',
            'Review platform usage patterns'
          ]
        });
      }
    }

    return recommendations;
  }
}

// Export all performance monitoring tools
export default {
  PerformanceMonitor,
  MemoryMonitor,
  RequestOptimizer
}; 