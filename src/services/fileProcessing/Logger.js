import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';

/**
 * 日誌級別
 */
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * 日誌管理器
 * 基於 Winston 的結構化日誌系統
 */
export class Logger {
  constructor(options = {}) {
    this.name = options.name || 'FileProcessor';
    this.logDir = options.logDir || './logs';
    this.level = options.level || LogLevels.INFO;
    this.maxFiles = options.maxFiles || 14; // 保留14天的日誌
    this.maxSize = options.maxSize || '20m'; // 每個檔案最大20MB
    
    this.winston = null;
    this._initialized = false;
    
    // 確保日誌目錄存在並初始化
    this._initialize();
  }

  /**
   * 初始化日誌系統
   * @private
   */
  async _initialize() {
    if (this._initialized) return;

    try {
      // 確保日誌目錄存在
      await this._ensureLogDirectory();

      // 創建 Winston 實例
      this._createWinstonLogger();

      this._initialized = true;
    } catch (error) {
      console.error('日誌系統初始化失敗:', error);
    }
  }

  /**
   * 創建 Winston Logger
   * @private
   */
  _createWinstonLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          logger: this.name,
          message,
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${this.name}] ${level}: ${message} ${metaStr}`;
      })
    );

    this.winston = winston.createLogger({
      level: this.level,
      format: logFormat,
      transports: [
        // 控制台輸出
        new winston.transports.Console({
          format: consoleFormat
        }),

        // 錯誤日誌檔案
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxFiles: this.maxFiles,
          maxsize: this.maxSize,
          tailable: true
        }),

        // 所有級別日誌檔案
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          maxFiles: this.maxFiles,
          maxsize: this.maxSize,
          tailable: true
        }),

        // 檔案處理專用日誌
        new winston.transports.File({
          filename: path.join(this.logDir, 'file-processing.log'),
          maxFiles: this.maxFiles,
          maxsize: this.maxSize,
          tailable: true
        })
      ],

      // 未捕獲的異常處理
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'exceptions.log')
        })
      ],

      // 未處理的 Promise 拒絕
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'rejections.log')
        })
      ]
    });
  }

  /**
   * 確保日誌目錄存在
   * @private
   */
  async _ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 記錄資訊級別日誌
   * @param {string} message - 日誌訊息
   * @param {Object} meta - 元資料
   */
  info(message, meta = {}) {
    this._log(LogLevels.INFO, message, meta);
  }

  /**
   * 記錄警告級別日誌
   * @param {string} message - 日誌訊息
   * @param {Object} meta - 元資料
   */
  warn(message, meta = {}) {
    this._log(LogLevels.WARN, message, meta);
  }

  /**
   * 記錄錯誤級別日誌
   * @param {string} message - 日誌訊息
   * @param {Object} meta - 元資料
   */
  error(message, meta = {}) {
    this._log(LogLevels.ERROR, message, meta);
  }

  /**
   * 記錄調試級別日誌
   * @param {string} message - 日誌訊息
   * @param {Object} meta - 元資料
   */
  debug(message, meta = {}) {
    this._log(LogLevels.DEBUG, message, meta);
  }

  /**
   * 記錄下載活動
   * @param {string} action - 動作類型
   * @param {Object} data - 下載資料
   */
  logDownload(action, data) {
    this.info(`Download ${action}`, {
      category: 'download',
      action,
      ...data
    });
  }

  /**
   * 記錄圖片處理活動
   * @param {string} action - 動作類型
   * @param {Object} data - 處理資料
   */
  logImageProcessing(action, data) {
    this.info(`Image processing ${action}`, {
      category: 'image-processing',
      action,
      ...data
    });
  }

  /**
   * 記錄上傳活動
   * @param {string} action - 動作類型
   * @param {Object} data - 上傳資料
   */
  logUpload(action, data) {
    this.info(`Upload ${action}`, {
      category: 'upload',
      action,
      ...data
    });
  }

  /**
   * 記錄佇列活動
   * @param {string} action - 動作類型
   * @param {Object} data - 佇列資料
   */
  logQueue(action, data) {
    this.info(`Queue ${action}`, {
      category: 'queue',
      action,
      ...data
    });
  }

  /**
   * 記錄錯誤並包含堆疊追蹤
   * @param {Error} error - 錯誤物件
   * @param {Object} context - 上下文資訊
   */
  logError(error, context = {}) {
    this.error(error.message, {
      category: 'error',
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  /**
   * 記錄性能指標
   * @param {string} operation - 操作名稱
   * @param {number} duration - 持續時間（毫秒）
   * @param {Object} meta - 額外元資料
   */
  logPerformance(operation, duration, meta = {}) {
    this.info(`Performance: ${operation}`, {
      category: 'performance',
      operation,
      duration,
      durationFormatted: `${duration}ms`,
      ...meta
    });
  }

  /**
   * 記錄統計資訊
   * @param {string} type - 統計類型
   * @param {Object} stats - 統計資料
   */
  logStats(type, stats) {
    this.info(`Stats: ${type}`, {
      category: 'stats',
      type,
      ...stats
    });
  }

  /**
   * 創建子日誌器
   * @param {string} childName - 子日誌器名稱
   * @returns {Logger} 子日誌器實例
   */
  child(childName) {
    return new Logger({
      name: `${this.name}:${childName}`,
      logDir: this.logDir,
      level: this.level,
      maxFiles: this.maxFiles,
      maxSize: this.maxSize
    });
  }

  /**
   * 設置日誌級別
   * @param {string} level - 新的日誌級別
   */
  setLevel(level) {
    if (Object.values(LogLevels).includes(level)) {
      this.level = level;
      if (this.winston) {
        this.winston.level = level;
      }
    }
  }

  /**
   * 獲取日誌統計
   * @returns {Object} 日誌統計資訊
   */
  getStats() {
    return {
      name: this.name,
      level: this.level,
      logDir: this.logDir,
      initialized: this._initialized
    };
  }

  /**
   * 清理舊日誌檔案
   * @param {number} days - 保留天數
   */
  async cleanupLogs(days = 7) {
    try {
      const files = await fs.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          this.info(`清理舊日誌檔案: ${file}`);
        }
      }
    } catch (error) {
      this.error('清理日誌檔案時發生錯誤', { error: error.message });
    }
  }

  // 私有方法

  /**
   * 內部日誌記錄方法
   * @private
   */
  async _log(level, message, meta = {}) {
    // 確保已初始化
    if (!this._initialized) {
      await this._initialize();
    }

    if (this.winston) {
      this.winston.log(level, message, meta);
    } else {
      // 備用的控制台輸出
      console.log(`[${new Date().toISOString()}] [${this.name}] ${level.toUpperCase()}: ${message}`, meta);
    }
  }
}

/**
 * 建立日誌器實例
 * @param {string} name - 日誌器名稱
 * @param {Object} options - 配置選項
 * @returns {Logger} 日誌器實例
 */
export function createLogger(name, options = {}) {
  return new Logger({
    name,
    ...options
  });
}

/**
 * 全域日誌器實例
 */
let globalLogger = null;

/**
 * 取得全域日誌器
 * @returns {Logger} 全域日誌器實例
 */
export function getLogger() {
  if (!globalLogger) {
    globalLogger = createLogger('FileProcessing');
  }
  return globalLogger;
}

/**
 * 設置全域日誌器
 * @param {Logger} logger - 日誌器實例
 */
export function setLogger(logger) {
  globalLogger = logger;
}

export default Logger; 