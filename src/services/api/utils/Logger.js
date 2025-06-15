/**
 * Centralized Logging System for API Integration Layer
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

export const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

/**
 * Main Logger class
 */
export class Logger {
  constructor(options = {}) {
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: false,
      maxStorageEntries: 1000,
      includeTimestamp: true,
      includeStack: false,
      contextPrefix: '',
      ...options
    };

    this.logs = [];
    this.listeners = new Set();
  }

  /**
   * Set the minimum log level
   * @param {number} level - Log level
   */
  setLevel(level) {
    this.options.level = level;
  }

  /**
   * Add a log entry listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a log entry listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   */
  debug(message, metadata = {}, context = {}) {
    this._log(LogLevel.DEBUG, message, metadata, context);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   */
  info(message, metadata = {}, context = {}) {
    this._log(LogLevel.INFO, message, metadata, context);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   */
  warn(message, metadata = {}, context = {}) {
    this._log(LogLevel.WARN, message, metadata, context);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   */
  error(message, metadata = {}, context = {}) {
    this._log(LogLevel.ERROR, message, metadata, context);
  }

  /**
   * Log a fatal error message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   */
  fatal(message, metadata = {}, context = {}) {
    this._log(LogLevel.FATAL, message, metadata, context);
  }

  /**
   * Log API activity
   * @param {string} platform - Platform identifier
   * @param {string} operation - Operation name
   * @param {Object} metadata - Additional metadata
   */
  logApiActivity(platform, operation, metadata = {}) {
    this.info(`API Activity: ${platform}`, {
      operation,
      platform,
      ...metadata
    }, { type: 'api_activity' });
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  logPerformance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      durationMs: duration,
      ...metadata
    }, { type: 'performance' });
  }

  /**
   * Log rate limiting events
   * @param {string} platform - Platform identifier
   * @param {string} action - Rate limit action
   * @param {Object} metadata - Additional metadata
   */
  logRateLimit(platform, action, metadata = {}) {
    this.warn(`Rate Limit: ${platform}`, {
      platform,
      action,
      ...metadata
    }, { type: 'rate_limit' });
  }

  /**
   * Log authentication events
   * @param {string} platform - Platform identifier
   * @param {string} event - Auth event type
   * @param {Object} metadata - Additional metadata
   */
  logAuth(platform, event, metadata = {}) {
    this.info(`Auth: ${platform}`, {
      platform,
      event,
      ...metadata
    }, { type: 'authentication' });
  }

  /**
   * Get recent log entries
   * @param {number} count - Number of entries to return
   * @param {number} level - Minimum log level
   * @returns {Array} Log entries
   */
  getRecentLogs(count = 50, level = LogLevel.DEBUG) {
    return this.logs
      .filter(log => log.level >= level)
      .slice(-count);
  }

  /**
   * Get log entries by type
   * @param {string} type - Context type
   * @param {number} count - Number of entries to return
   * @returns {Array} Log entries
   */
  getLogsByType(type, count = 50) {
    return this.logs
      .filter(log => log.context.type === type)
      .slice(-count);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get logging statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.logs.length,
      byLevel: {},
      byType: {},
      recentActivity: this.getRecentLogs(10)
    };

    // Count by level
    for (const level of Object.values(LogLevel)) {
      stats.byLevel[LogLevelNames[level]] = this.logs.filter(log => log.level === level).length;
    }

    // Count by type
    for (const log of this.logs) {
      const type = log.context.type || 'general';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Internal logging method
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   * @private
   */
  _log(level, message, metadata = {}, context = {}) {
    if (level < this.options.level) {
      return;
    }

    const logEntry = this._createLogEntry(level, message, metadata, context);

    // Store log entry
    if (this.options.enableStorage) {
      this.logs.push(logEntry);
      
      // Trim logs if necessary
      if (this.logs.length > this.options.maxStorageEntries) {
        this.logs = this.logs.slice(-this.options.maxStorageEntries);
      }
    }

    // Console output
    if (this.options.enableConsole) {
      this._outputToConsole(logEntry);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(logEntry);
      } catch (error) {
        console.error('Logger listener error:', error);
      }
    }
  }

  /**
   * Create a log entry object
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {Object} context - Context information
   * @returns {Object} Log entry
   * @private
   */
  _createLogEntry(level, message, metadata, context) {
    const entry = {
      level,
      levelName: LogLevelNames[level],
      message: this.options.contextPrefix ? `${this.options.contextPrefix} ${message}` : message,
      metadata,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.options.includeStack && (level >= LogLevel.ERROR)) {
      entry.stack = new Error().stack;
    }

    return entry;
  }

  /**
   * Output log entry to console
   * @param {Object} logEntry - Log entry
   * @private
   */
  _outputToConsole(logEntry) {
    const { level, levelName, message, metadata, timestamp } = logEntry;
    
    const prefix = this.options.includeTimestamp 
      ? `[${timestamp}] [${levelName}]` 
      : `[${levelName}]`;
    
    const hasMetadata = Object.keys(metadata).length > 0;
    
    switch (level) {
      case LogLevel.DEBUG:
        if (hasMetadata) {
          console.debug(prefix, message, metadata);
        } else {
          console.debug(prefix, message);
        }
        break;
      case LogLevel.INFO:
        if (hasMetadata) {
          console.info(prefix, message, metadata);
        } else {
          console.info(prefix, message);
        }
        break;
      case LogLevel.WARN:
        if (hasMetadata) {
          console.warn(prefix, message, metadata);
        } else {
          console.warn(prefix, message);
        }
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        if (hasMetadata) {
          console.error(prefix, message, metadata);
        } else {
          console.error(prefix, message);
        }
        if (logEntry.stack) {
          console.error('Stack trace:', logEntry.stack);
        }
        break;
      default:
        console.log(prefix, message, hasMetadata ? metadata : '');
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger({
  level: LogLevel.INFO,
  enableStorage: true,
  contextPrefix: '[PhotoAPI]'
});

/**
 * Create a context-specific logger
 * @param {string} context - Context identifier
 * @param {Object} options - Logger options
 * @returns {Logger} Context logger
 */
export function createContextLogger(context, options = {}) {
  return new Logger({
    ...options,
    contextPrefix: `[PhotoAPI:${context}]`
  });
}

/**
 * Create a platform-specific logger
 * @param {string} platform - Platform identifier
 * @param {Object} options - Logger options
 * @returns {Logger} Platform logger
 */
export function createPlatformLogger(platform, options = {}) {
  return createContextLogger(platform, options);
} 