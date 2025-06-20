// 隱私保護分析系統
import { dataAnonymizationManager, DATA_TYPES, SENSITIVITY_LEVELS } from '../security/dataAnonymization.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from '../security/securityLogger.js';

// 分析事件類型
export const ANALYTICS_EVENTS = {
  // 用戶行為
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  SEARCH: 'search',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  
  // 功能使用
  MIGRATION_START: 'migration_start',
  MIGRATION_COMPLETE: 'migration_complete',
  MIGRATION_ERROR: 'migration_error',
  PLATFORM_CONNECT: 'platform_connect',
  PLATFORM_DISCONNECT: 'platform_disconnect',
  
  // 性能指標
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  ERROR_OCCURRED: 'error_occurred',
  
  // 業務指標
  USER_REGISTRATION: 'user_registration',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel'
};

// 聚合級別
export const AGGREGATION_LEVELS = {
  RAW: 'raw',           // 原始數據（匿名化）
  HOURLY: 'hourly',     // 小時聚合
  DAILY: 'daily',       // 日聚合
  WEEKLY: 'weekly',     // 週聚合
  MONTHLY: 'monthly'    // 月聚合
};

class PrivacyAnalyticsManager {
  constructor() {
    this.events = new Map();
    this.aggregatedData = new Map();
    this.retentionPeriods = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  // 初始化分析系統
  initialize() {
    try {
      // 設定數據保留期限
      this.setupRetentionPeriods();
      
      // 載入現有數據
      this.loadStoredData();
      
      // 設定定時任務
      this.setupPeriodicTasks();
      
      this.isInitialized = true;
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'PrivacyAnalyticsManager',
          action: 'initialized'
        },
        RISK_LEVELS.LOW
      );

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'PrivacyAnalyticsManager',
          action: 'initialization_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 設定數據保留期限
  setupRetentionPeriods() {
    // 原始事件數據保留期
    this.retentionPeriods.set(AGGREGATION_LEVELS.RAW, 7 * 24 * 60 * 60 * 1000); // 7天
    
    // 聚合數據保留期
    this.retentionPeriods.set(AGGREGATION_LEVELS.HOURLY, 30 * 24 * 60 * 60 * 1000); // 30天
    this.retentionPeriods.set(AGGREGATION_LEVELS.DAILY, 365 * 24 * 60 * 60 * 1000); // 1年
    this.retentionPeriods.set(AGGREGATION_LEVELS.WEEKLY, 2 * 365 * 24 * 60 * 60 * 1000); // 2年
    this.retentionPeriods.set(AGGREGATION_LEVELS.MONTHLY, 5 * 365 * 24 * 60 * 60 * 1000); // 5年
  }

  // 記錄分析事件（隱私保護）
  async trackEvent(eventType, data = {}, options = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Analytics manager not initialized');
        return;
      }

      // 創建基礎事件對象
      const baseEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        sessionId: this.getOrCreateSessionId(),
        ...data
      };

      // 匿名化敏感數據
      const anonymizedEvent = await this.anonymizeEvent(baseEvent, options);
      
      // 存儲事件
      this.storeEvent(anonymizedEvent);
      
      // 如果是實時事件，立即處理
      if (options.realtime) {
        this.processRealtimeEvent(anonymizedEvent);
      }

      // 記錄分析日誌
      logSecurityEvent(
        SECURITY_EVENT_TYPES.DATA_ACCESS,
        {
          action: 'analytics_event_tracked',
          eventType,
          anonymized: true
        },
        RISK_LEVELS.LOW
      );

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'analytics_tracking_failed',
          eventType,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
    }
  }

  // 匿名化分析事件
  async anonymizeEvent(event, options = {}) {
    const anonymized = { ...event };

    // 匿名化用戶 ID
    if (anonymized.userId) {
      anonymized.userId = dataAnonymizationManager.anonymizeData(
        anonymized.userId,
        DATA_TYPES.USER_ID,
        { logEvent: false }
      );
    }

    // 匿名化 IP 地址
    if (anonymized.ip) {
      anonymized.ip = dataAnonymizationManager.anonymizeData(
        anonymized.ip,
        DATA_TYPES.IP_ADDRESS,
        { logEvent: false }
      );
    }

    // 匿名化 User Agent
    if (anonymized.userAgent) {
      anonymized.userAgent = dataAnonymizationManager.anonymizeData(
        anonymized.userAgent,
        DATA_TYPES.USER_AGENT,
        { logEvent: false }
      );
    }

    // 匿名化位置信息
    if (anonymized.location) {
      anonymized.location = dataAnonymizationManager.anonymizeData(
        anonymized.location,
        DATA_TYPES.LOCATION,
        { logEvent: false }
      );
    }

    // 移除或匿名化其他敏感字段
    const sensitiveFields = options.sensitiveFields || [];
    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = dataAnonymizationManager.anonymizeData(
          anonymized[field],
          DATA_TYPES.USER_ID, // 默認使用 USER_ID 類型
          { logEvent: false }
        );
      }
    }

    // 添加匿名化標記
    anonymized._anonymized = true;
    anonymized._originalEventId = event.eventId;

    return anonymized;
  }

  // 存儲事件
  storeEvent(event) {
    const eventKey = `${event.eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.events.has(event.eventType)) {
      this.events.set(event.eventType, []);
    }
    
    const events = this.events.get(event.eventType);
    events.push({
      ...event,
      eventId: eventKey,
      storedAt: new Date().toISOString()
    });

    // 限制內存中的事件數量
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    // 異步持久化到本地存儲
    this.persistToStorage(event.eventType, events);
  }

  // 處理實時事件
  processRealtimeEvent(event) {
    // 更新實時統計
    this.updateRealtimeStats(event);
    
    // 觸發實時警報
    this.checkRealtimeAlerts(event);
  }

  // 更新實時統計
  updateRealtimeStats(event) {
    const statsKey = `realtime_${event.eventType}`;
    const now = new Date();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    
    if (!this.aggregatedData.has(statsKey)) {
      this.aggregatedData.set(statsKey, new Map());
    }
    
    const hourlyStats = this.aggregatedData.get(statsKey);
    const hourKey = currentHour.toISOString();
    
    if (!hourlyStats.has(hourKey)) {
      hourlyStats.set(hourKey, { count: 0, events: [] });
    }
    
    const stats = hourlyStats.get(hourKey);
    stats.count++;
    stats.events.push({
      timestamp: event.timestamp,
      sessionId: event.sessionId
    });
  }

  // 檢查實時警報
  checkRealtimeAlerts(event) {
    // 檢查異常活動模式
    if (event.eventType === ANALYTICS_EVENTS.ERROR_OCCURRED) {
      this.checkErrorSpike(event);
    }
    
    if (event.eventType === ANALYTICS_EVENTS.USER_LOGIN) {
      this.checkLoginSpike(event);
    }
  }

  // 檢查錯誤激增
  checkErrorSpike(event) {
    const recentErrors = this.getRecentEvents(ANALYTICS_EVENTS.ERROR_OCCURRED, 5 * 60 * 1000); // 5分鐘內
    
    if (recentErrors.length > 50) { // 5分鐘內超過50個錯誤
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        {
          alert: 'error_spike_detected',
          errorCount: recentErrors.length,
          timeWindow: '5_minutes'
        },
        RISK_LEVELS.HIGH
      );
    }
  }

  // 檢查登入激增
  checkLoginSpike(event) {
    const recentLogins = this.getRecentEvents(ANALYTICS_EVENTS.USER_LOGIN, 10 * 60 * 1000); // 10分鐘內
    
    if (recentLogins.length > 100) { // 10分鐘內超過100次登入
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        {
          alert: 'login_spike_detected',
          loginCount: recentLogins.length,
          timeWindow: '10_minutes'
        },
        RISK_LEVELS.MEDIUM
      );
    }
  }

  // 獲取最近的事件
  getRecentEvents(eventType, timeWindow) {
    const events = this.events.get(eventType) || [];
    const cutoff = Date.now() - timeWindow;
    
    return events.filter(event => 
      new Date(event.timestamp).getTime() > cutoff
    );
  }

  // 生成聚合報告
  generateAggregatedReport(eventType, aggregationLevel = AGGREGATION_LEVELS.DAILY, dateRange = {}) {
    const events = this.events.get(eventType) || [];
    const { startDate, endDate } = dateRange;
    
    // 過濾日期範圍
    let filteredEvents = events;
    if (startDate || endDate) {
      filteredEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (startDate && eventDate < new Date(startDate)) return false;
        if (endDate && eventDate > new Date(endDate)) return false;
        return true;
      });
    }

    // 按聚合級別分組
    const grouped = this.groupEventsByAggregation(filteredEvents, aggregationLevel);
    
    // 生成統計
    const report = this.generateStatistics(grouped, eventType);
    
    return {
      eventType,
      aggregationLevel,
      dateRange,
      totalEvents: filteredEvents.length,
      report,
      generatedAt: new Date().toISOString()
    };
  }

  // 按聚合級別分組事件
  groupEventsByAggregation(events, level) {
    const grouped = new Map();
    
    for (const event of events) {
      const key = this.getAggregationKey(new Date(event.timestamp), level);
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key).push(event);
    }
    
    return grouped;
  }

  // 獲取聚合鍵
  getAggregationKey(date, level) {
    switch (level) {
      case AGGREGATION_LEVELS.HOURLY:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      case AGGREGATION_LEVELS.DAILY:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case AGGREGATION_LEVELS.WEEKLY:
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      case AGGREGATION_LEVELS.MONTHLY:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString();
    }
  }

  // 生成統計數據
  generateStatistics(groupedEvents, eventType) {
    const stats = [];
    
    for (const [period, events] of groupedEvents.entries()) {
      const periodStats = {
        period,
        count: events.length,
        uniqueSessions: new Set(events.map(e => e.sessionId)).size,
        metrics: this.calculateEventMetrics(events, eventType)
      };
      
      stats.push(periodStats);
    }
    
    return stats.sort((a, b) => a.period.localeCompare(b.period));
  }

  // 計算事件指標
  calculateEventMetrics(events, eventType) {
    const metrics = {};
    
    switch (eventType) {
      case ANALYTICS_EVENTS.PAGE_LOAD_TIME:
        const loadTimes = events.map(e => e.loadTime).filter(t => t != null);
        metrics.averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
        metrics.medianLoadTime = this.calculateMedian(loadTimes);
        metrics.p95LoadTime = this.calculatePercentile(loadTimes, 95);
        break;
        
      case ANALYTICS_EVENTS.API_RESPONSE_TIME:
        const responseTimes = events.map(e => e.responseTime).filter(t => t != null);
        metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        metrics.medianResponseTime = this.calculateMedian(responseTimes);
        metrics.p95ResponseTime = this.calculatePercentile(responseTimes, 95);
        break;
        
      case ANALYTICS_EVENTS.MIGRATION_COMPLETE:
        const fileCounts = events.map(e => e.fileCount).filter(c => c != null);
        const durations = events.map(e => e.duration).filter(d => d != null);
        metrics.averageFileCount = fileCounts.reduce((sum, count) => sum + count, 0) / fileCounts.length;
        metrics.averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
        break;
        
      default:
        // 基本指標
        metrics.eventCount = events.length;
        break;
    }
    
    return metrics;
  }

  // 計算中位數
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  // 計算百分位數
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  // 獲取或創建會話 ID
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    
    return sessionId;
  }

  // 持久化到本地存儲
  async persistToStorage(eventType, events) {
    try {
      // 只保存最近的事件到 localStorage
      const recentEvents = events.slice(-100); // 最多保存100個事件
      const storageKey = `analytics_${eventType}`;
      
      localStorage.setItem(storageKey, JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to persist analytics data:', error);
    }
  }

  // 從本地存儲載入數據
  loadStoredData() {
    for (const eventType of Object.values(ANALYTICS_EVENTS)) {
      try {
        const storageKey = `analytics_${eventType}`;
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          const events = JSON.parse(storedData);
          this.events.set(eventType, events);
        }
      } catch (error) {
        console.warn(`Failed to load stored analytics data for ${eventType}:`, error);
      }
    }
  }

  // 設定定期任務
  setupPeriodicTasks() {
    // 每小時清理過期數據
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000);

    // 每天生成聚合報告
    setInterval(() => {
      this.generateDailyReports();
    }, 24 * 60 * 60 * 1000);
  }

  // 清理過期數據
  cleanupExpiredData() {
    let cleanedCount = 0;
    
    for (const [eventType, events] of this.events.entries()) {
      const retentionPeriod = this.retentionPeriods.get(AGGREGATION_LEVELS.RAW);
      const cutoff = Date.now() - retentionPeriod;
      
      const beforeCount = events.length;
      const filteredEvents = events.filter(event => 
        new Date(event.timestamp).getTime() > cutoff
      );
      
      this.events.set(eventType, filteredEvents);
      cleanedCount += beforeCount - filteredEvents.length;
    }

    if (cleanedCount > 0) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'analytics_data_cleaned',
          cleanedEvents: cleanedCount
        },
        RISK_LEVELS.LOW
      );
    }
  }

  // 生成每日報告
  generateDailyReports() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateRange = {
      startDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString(),
      endDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1).toISOString()
    };

    // 為主要事件類型生成報告
    const mainEventTypes = [
      ANALYTICS_EVENTS.PAGE_VIEW,
      ANALYTICS_EVENTS.USER_LOGIN,
      ANALYTICS_EVENTS.MIGRATION_COMPLETE,
      ANALYTICS_EVENTS.ERROR_OCCURRED
    ];

    for (const eventType of mainEventTypes) {
      const report = this.generateAggregatedReport(eventType, AGGREGATION_LEVELS.DAILY, dateRange);
      
      // 將報告存儲到聚合數據中
      const reportKey = `daily_report_${eventType}_${yesterday.toISOString().split('T')[0]}`;
      this.aggregatedData.set(reportKey, report);
    }
  }

  // 獲取分析統計
  getAnalyticsStatistics() {
    const stats = {
      isInitialized: this.isInitialized,
      totalEventTypes: this.events.size,
      totalEvents: 0,
      recentActivity: {},
      topEventTypes: []
    };

    // 計算總事件數和最近活動
    for (const [eventType, events] of this.events.entries()) {
      stats.totalEvents += events.length;
      
      // 最近24小時的活動
      const recentEvents = this.getRecentEvents(eventType, 24 * 60 * 60 * 1000);
      stats.recentActivity[eventType] = recentEvents.length;
    }

    // 最活躍的事件類型
    stats.topEventTypes = Object.entries(stats.recentActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([eventType, count]) => ({ eventType, count }));

    return stats;
  }

  // 導出分析數據（匿名化）
  exportAnalyticsData(options = {}) {
    const { eventTypes, dateRange, format = 'json' } = options;
    const exportData = {};

    const typesToExport = eventTypes || Object.values(ANALYTICS_EVENTS);
    
    for (const eventType of typesToExport) {
      const events = this.events.get(eventType) || [];
      
      // 過濾日期範圍
      let filteredEvents = events;
      if (dateRange) {
        filteredEvents = events.filter(event => {
          const eventDate = new Date(event.timestamp);
          if (dateRange.startDate && eventDate < new Date(dateRange.startDate)) return false;
          if (dateRange.endDate && eventDate > new Date(dateRange.endDate)) return false;
          return true;
        });
      }

      exportData[eventType] = filteredEvents;
    }

    // 根據格式返回數據
    switch (format) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'json':
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  // 轉換為 CSV 格式
  convertToCSV(data) {
    const csvLines = [];
    
    for (const [eventType, events] of Object.entries(data)) {
      if (events.length === 0) continue;
      
      // 添加事件類型標題
      csvLines.push(`# ${eventType}`);
      
      // 獲取所有字段
      const fields = new Set();
      events.forEach(event => {
        Object.keys(event).forEach(key => fields.add(key));
      });
      
      // 添加標頭
      csvLines.push(Array.from(fields).join(','));
      
      // 添加數據行
      events.forEach(event => {
        const row = Array.from(fields).map(field => {
          const value = event[field];
          if (value === undefined || value === null) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvLines.push(row.join(','));
      });
      
      csvLines.push(''); // 空行分隔
    }
    
    return csvLines.join('\n');
  }
}

// 全局隱私分析管理器實例
export const privacyAnalyticsManager = new PrivacyAnalyticsManager();

// 便利函數
export const trackEvent = (eventType, data, options) =>
  privacyAnalyticsManager.trackEvent(eventType, data, options);

export const generateReport = (eventType, aggregationLevel, dateRange) =>
  privacyAnalyticsManager.generateAggregatedReport(eventType, aggregationLevel, dateRange);

export const getAnalyticsStats = () =>
  privacyAnalyticsManager.getAnalyticsStatistics();

export default PrivacyAnalyticsManager;