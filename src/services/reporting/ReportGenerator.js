// 報告生成器 - 產生各種類型的遷移報告和分析
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// 報告類型
export const REPORT_TYPES = {
  MIGRATION_SUMMARY: 'migration_summary',
  PERFORMANCE_METRICS: 'performance_metrics', 
  ERROR_ANALYSIS: 'error_analysis',
  USER_ACTIVITY: 'user_activity',
  PLATFORM_COMPARISON: 'platform_comparison',
  TREND_ANALYSIS: 'trend_analysis',
  USAGE_STATISTICS: 'usage_statistics',
  SECURITY_AUDIT: 'security_audit',
  CUSTOM: 'custom'
};

// 報告格式
export const REPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  PDF: 'pdf',
  XLSX: 'xlsx',
  HTML: 'html'
};

// 時間範圍
export const TIME_RANGES = {
  LAST_24_HOURS: '24h',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
  LAST_YEAR: '1y',
  CUSTOM: 'custom'
};

// 聚合類型
export const AGGREGATION_TYPES = {
  SUM: 'sum',
  AVERAGE: 'average',
  COUNT: 'count',
  MIN: 'min',
  MAX: 'max',
  MEDIAN: 'median',
  PERCENTILE: 'percentile',
  DISTINCT_COUNT: 'distinct_count'
};

export class ReportGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxReportSize: options.maxReportSize || 50 * 1024 * 1024, // 50MB
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 30 * 60 * 1000, // 30分鐘
      enableScheduledReports: options.enableScheduledReports !== false,
      dataRetentionDays: options.dataRetentionDays || 365,
      exportFormats: options.exportFormats || Object.values(REPORT_FORMATS),
      ...options
    };
    
    // 數據源管理
    this.dataSources = new Map();
    this.reportCache = new Map();
    this.scheduledReports = new Map();
    
    // 統計資訊
    this.statistics = {
      totalReportsGenerated: 0,
      successfulReports: 0,
      failedReports: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageGenerationTime: 0,
      dataPointsProcessed: 0
    };
    
    // 報告模板
    this.reportTemplates = new Map();
    this.customReportBuilders = new Map();
    
    this.initialize();
  }

  // 初始化報告生成器
  initialize() {
    try {
      // 註冊默認數據源
      this.registerDefaultDataSources();
      
      // 載入預定義報告模板
      this.loadReportTemplates();
      
      // 啟動定時清理
      this.startCacheCleanup();
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 註冊數據源
  registerDataSource(name, dataSource) {
    if (!dataSource || typeof dataSource.getData !== 'function') {
      throw new Error('Data source must implement getData method');
    }
    
    this.dataSources.set(name, {
      source: dataSource,
      registeredAt: new Date().toISOString(),
      lastAccessed: null,
      accessCount: 0
    });
    
    this.emit('datasource-registered', { name });
  }

  // 註冊默認數據源
  registerDefaultDataSources() {
    // 遷移數據源
    this.registerDataSource('migrations', {
      async getData(query = {}) {
        // 模擬遷移數據
        return {
          migrations: this.generateMockMigrationData(query),
          totalCount: 100,
          timestamp: new Date().toISOString()
        };
      },
      
      generateMockMigrationData(query) {
        const { startDate, endDate, platform, status } = query;
        const data = [];
        
        for (let i = 0; i < 20; i++) {
          data.push({
            id: uuidv4(),
            platform: platform || ['Google Photos', 'Flickr', 'Instagram'][Math.floor(Math.random() * 3)],
            status: status || ['completed', 'failed', 'in_progress'][Math.floor(Math.random() * 3)],
            filesProcessed: Math.floor(Math.random() * 1000) + 100,
            filesTotal: Math.floor(Math.random() * 1200) + 500,
            bytesTransferred: Math.floor(Math.random() * 1000000000) + 100000000,
            duration: Math.floor(Math.random() * 3600000) + 60000,
            startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date().toISOString(),
            errorCount: Math.floor(Math.random() * 10),
            successRate: 0.85 + Math.random() * 0.15
          });
        }
        
        return data;
      }
    });

    // 性能指標數據源
    this.registerDataSource('performance', {
      async getData(query = {}) {
        return {
          metrics: this.generateMockPerformanceData(query),
          timestamp: new Date().toISOString()
        };
      },
      
      generateMockPerformanceData(query) {
        const data = [];
        const now = new Date();
        
        for (let i = 0; i < 24; i++) {
          const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
          data.push({
            timestamp: timestamp.toISOString(),
            throughput: Math.floor(Math.random() * 100) + 50,
            latency: Math.floor(Math.random() * 5000) + 100,
            errorRate: Math.random() * 0.1,
            concurrency: Math.floor(Math.random() * 10) + 1,
            cpuUsage: Math.random() * 100,
            memoryUsage: Math.random() * 100,
            networkBandwidth: Math.floor(Math.random() * 1000) + 100
          });
        }
        
        return data.reverse();
      }
    });

    // 錯誤分析數據源
    this.registerDataSource('errors', {
      async getData(query = {}) {
        return {
          errors: this.generateMockErrorData(query),
          timestamp: new Date().toISOString()
        };
      },
      
      generateMockErrorData(query) {
        const errorTypes = [
          'NetworkError',
          'AuthenticationError', 
          'QuotaExceededError',
          'FileNotFoundError',
          'PermissionError',
          'TimeoutError'
        ];
        
        const data = [];
        
        for (let i = 0; i < 15; i++) {
          data.push({
            id: uuidv4(),
            type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
            message: `Error message ${i + 1}`,
            platform: ['Google Photos', 'Flickr', 'Instagram'][Math.floor(Math.random() * 3)],
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            count: Math.floor(Math.random() * 50) + 1,
            severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
            resolved: Math.random() > 0.3
          });
        }
        
        return data;
      }
    });

    // 用戶活動數據源
    this.registerDataSource('user_activity', {
      async getData(query = {}) {
        return {
          activities: this.generateMockUserActivityData(query),
          timestamp: new Date().toISOString()
        };
      },
      
      generateMockUserActivityData(query) {
        const activities = [
          'login',
          'logout', 
          'start_migration',
          'pause_migration',
          'cancel_migration',
          'download_report',
          'change_settings',
          'view_progress'
        ];
        
        const data = [];
        
        for (let i = 0; i < 30; i++) {
          data.push({
            id: uuidv4(),
            userId: `user_${Math.floor(Math.random() * 100) + 1}`,
            activity: activities[Math.floor(Math.random() * activities.length)],
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            ip: `192.168.1.${Math.floor(Math.random() * 255) + 1}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            success: Math.random() > 0.1,
            duration: Math.floor(Math.random() * 10000) + 100
          });
        }
        
        return data;
      }
    });
  }

  // 載入報告模板
  loadReportTemplates() {
    // 遷移摘要報告模板
    this.reportTemplates.set(REPORT_TYPES.MIGRATION_SUMMARY, {
      name: 'Migration Summary Report',
      description: 'Overview of migration activities and results',
      dataSources: ['migrations'],
      fields: [
        { name: 'totalMigrations', label: '總遷移數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'successfulMigrations', label: '成功遷移數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'failedMigrations', label: '失敗遷移數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'totalFilesProcessed', label: '處理檔案總數', aggregation: AGGREGATION_TYPES.SUM },
        { name: 'totalBytesTransferred', label: '傳輸位元組總數', aggregation: AGGREGATION_TYPES.SUM },
        { name: 'averageSuccessRate', label: '平均成功率', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'averageDuration', label: '平均耗時', aggregation: AGGREGATION_TYPES.AVERAGE }
      ],
      charts: [
        { type: 'pie', field: 'status', title: '遷移狀態分布' },
        { type: 'bar', field: 'platform', title: '平台使用情況' },
        { type: 'line', field: 'startTime', title: '遷移趨勢' }
      ]
    });

    // 性能指標報告模板
    this.reportTemplates.set(REPORT_TYPES.PERFORMANCE_METRICS, {
      name: 'Performance Metrics Report',
      description: 'System performance and resource utilization metrics',
      dataSources: ['performance'],
      fields: [
        { name: 'averageThroughput', label: '平均吞吐量', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'averageLatency', label: '平均延遲', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'maxLatency', label: '最大延遲', aggregation: AGGREGATION_TYPES.MAX },
        { name: 'averageErrorRate', label: '平均錯誤率', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'averageCpuUsage', label: '平均 CPU 使用率', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'averageMemoryUsage', label: '平均記憶體使用率', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'peakConcurrency', label: '峰值並發數', aggregation: AGGREGATION_TYPES.MAX }
      ],
      charts: [
        { type: 'line', field: 'timestamp', title: '吞吐量趨勢' },
        { type: 'area', field: 'timestamp', title: '資源使用趨勢' },
        { type: 'scatter', field: 'latency', title: '延遲分布' }
      ]
    });

    // 錯誤分析報告模板
    this.reportTemplates.set(REPORT_TYPES.ERROR_ANALYSIS, {
      name: 'Error Analysis Report',
      description: 'Analysis of errors and issues in the migration process',
      dataSources: ['errors'],
      fields: [
        { name: 'totalErrors', label: '錯誤總數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'criticalErrors', label: '嚴重錯誤數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'resolvedErrors', label: '已解決錯誤數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'errorsByType', label: '錯誤類型分布', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'errorsByPlatform', label: '平台錯誤分布', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'averageResolutionTime', label: '平均解決時間', aggregation: AGGREGATION_TYPES.AVERAGE }
      ],
      charts: [
        { type: 'pie', field: 'type', title: '錯誤類型分布' },
        { type: 'bar', field: 'platform', title: '平台錯誤統計' },
        { type: 'timeline', field: 'timestamp', title: '錯誤時間軸' }
      ]
    });

    // 用戶活動報告模板
    this.reportTemplates.set(REPORT_TYPES.USER_ACTIVITY, {
      name: 'User Activity Report',
      description: 'User behavior and activity patterns',
      dataSources: ['user_activity'],
      fields: [
        { name: 'totalUsers', label: '總用戶數', aggregation: AGGREGATION_TYPES.DISTINCT_COUNT },
        { name: 'activeUsers', label: '活躍用戶數', aggregation: AGGREGATION_TYPES.DISTINCT_COUNT },
        { name: 'totalActivities', label: '總活動數', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'averageSessionDuration', label: '平均會話時長', aggregation: AGGREGATION_TYPES.AVERAGE },
        { name: 'popularActivities', label: '熱門活動', aggregation: AGGREGATION_TYPES.COUNT },
        { name: 'peakUsageTime', label: '使用高峰時間', aggregation: AGGREGATION_TYPES.COUNT }
      ],
      charts: [
        { type: 'bar', field: 'activity', title: '活動類型統計' },
        { type: 'line', field: 'timestamp', title: '用戶活動趨勢' },
        { type: 'heatmap', field: 'hour', title: '使用時間熱力圖' }
      ]
    });
  }

  // 生成報告
  async generateReport(type, options = {}) {
    const reportId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.emit('report-generation-started', { reportId, type });
      
      // 檢查快取
      const cacheKey = this.getCacheKey(type, options);
      if (this.config.cacheEnabled && this.reportCache.has(cacheKey)) {
        const cachedReport = this.reportCache.get(cacheKey);
        if (Date.now() - cachedReport.timestamp < this.config.cacheTTL) {
          this.statistics.cacheHits++;
          this.emit('report-generation-completed', { reportId, fromCache: true });
          return cachedReport.data;
        }
      }
      
      this.statistics.cacheMisses++;
      
      // 獲取報告模板
      const template = this.reportTemplates.get(type);
      if (!template && type !== REPORT_TYPES.CUSTOM) {
        throw new Error(`Unknown report type: ${type}`);
      }
      
      // 準備報告配置
      const reportConfig = {
        id: reportId,
        type,
        template,
        options: {
          timeRange: TIME_RANGES.LAST_7_DAYS,
          format: REPORT_FORMATS.JSON,
          includeCharts: true,
          includeRawData: false,
          ...options
        },
        timestamp: new Date().toISOString()
      };
      
      // 收集數據
      const data = await this.collectReportData(reportConfig);
      
      // 處理和聚合數據
      const processedData = await this.processReportData(data, reportConfig);
      
      // 生成報告
      const report = await this.buildReport(processedData, reportConfig);
      
      // 快取報告
      if (this.config.cacheEnabled) {
        this.reportCache.set(cacheKey, {
          data: report,
          timestamp: Date.now()
        });
      }
      
      // 更新統計
      const duration = Date.now() - startTime;
      this.updateStatistics(true, duration);
      
      this.emit('report-generation-completed', {
        reportId,
        type,
        duration,
        dataPoints: report.metadata?.dataPoints || 0
      });
      
      return report;
      
    } catch (error) {
      this.updateStatistics(false, Date.now() - startTime);
      
      this.emit('report-generation-failed', {
        reportId,
        type,
        error: error.message
      });
      
      throw error;
    }
  }

  // 收集報告數據
  async collectReportData(reportConfig) {
    const { template, options } = reportConfig;
    
    if (!template) {
      // 自定義報告
      return await this.collectCustomReportData(reportConfig);
    }
    
    const data = {};
    
    // 為每個數據源收集數據
    for (const sourceKey of template.dataSources) {
      const sourceInfo = this.dataSources.get(sourceKey);
      if (!sourceInfo) {
        throw new Error(`Data source not found: ${sourceKey}`);
      }
      
      // 準備查詢參數
      const query = this.buildDataSourceQuery(options);
      
      // 獲取數據
      const sourceData = await sourceInfo.source.getData(query);
      data[sourceKey] = sourceData;
      
      // 更新訪問統計
      sourceInfo.lastAccessed = new Date().toISOString();
      sourceInfo.accessCount++;
    }
    
    return data;
  }

  // 建構數據源查詢
  buildDataSourceQuery(options) {
    const query = {};
    
    // 時間範圍
    if (options.timeRange && options.timeRange !== TIME_RANGES.CUSTOM) {
      const timeRangeMap = {
        [TIME_RANGES.LAST_24_HOURS]: 24 * 60 * 60 * 1000,
        [TIME_RANGES.LAST_7_DAYS]: 7 * 24 * 60 * 60 * 1000,
        [TIME_RANGES.LAST_30_DAYS]: 30 * 24 * 60 * 60 * 1000,
        [TIME_RANGES.LAST_90_DAYS]: 90 * 24 * 60 * 60 * 1000,
        [TIME_RANGES.LAST_YEAR]: 365 * 24 * 60 * 60 * 1000
      };
      
      const duration = timeRangeMap[options.timeRange];
      if (duration) {
        query.startDate = new Date(Date.now() - duration).toISOString();
        query.endDate = new Date().toISOString();
      }
    } else if (options.startDate && options.endDate) {
      query.startDate = options.startDate;
      query.endDate = options.endDate;
    }
    
    // 其他過濾條件
    if (options.platform) query.platform = options.platform;
    if (options.status) query.status = options.status;
    if (options.userId) query.userId = options.userId;
    
    return query;
  }

  // 處理報告數據
  async processReportData(data, reportConfig) {
    const { template } = reportConfig;
    
    if (!template) {
      return data; // 自定義報告不需要模板處理
    }
    
    const processedData = {
      summary: {},
      charts: [],
      rawData: data,
      metadata: {
        dataPoints: 0,
        sources: Object.keys(data)
      }
    };
    
    // 處理摘要字段
    for (const field of template.fields) {
      const value = await this.calculateFieldValue(data, field);
      processedData.summary[field.name] = {
        label: field.label,
        value,
        aggregation: field.aggregation
      };
    }
    
    // 處理圖表數據
    if (reportConfig.options.includeCharts && template.charts) {
      for (const chart of template.charts) {
        const chartData = await this.generateChartData(data, chart);
        processedData.charts.push({
          ...chart,
          data: chartData
        });
      }
    }
    
    // 計算數據點數量
    processedData.metadata.dataPoints = this.calculateDataPoints(data);
    this.statistics.dataPointsProcessed += processedData.metadata.dataPoints;
    
    return processedData;
  }

  // 計算字段值
  async calculateFieldValue(data, field) {
    // 根據聚合類型計算值
    let values = [];
    
    // 從所有數據源中提取相關值
    for (const [sourceKey, sourceData] of Object.entries(data)) {
      if (Array.isArray(sourceData.migrations)) {
        values = values.concat(sourceData.migrations.map(item => item[field.name]));
      } else if (Array.isArray(sourceData.metrics)) {
        values = values.concat(sourceData.metrics.map(item => item[field.name]));
      } else if (Array.isArray(sourceData.errors)) {
        values = values.concat(sourceData.errors.map(item => item[field.name]));
      } else if (Array.isArray(sourceData.activities)) {
        values = values.concat(sourceData.activities.map(item => item[field.name]));
      }
    }
    
    // 過濾無效值
    values = values.filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return 0;
    
    switch (field.aggregation) {
      case AGGREGATION_TYPES.SUM:
        return values.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
      
      case AGGREGATION_TYPES.AVERAGE:
        const numericValues = values.filter(v => typeof v === 'number');
        return numericValues.length > 0 ? 
          numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length : 0;
      
      case AGGREGATION_TYPES.COUNT:
        return values.length;
      
      case AGGREGATION_TYPES.MIN:
        const minValues = values.filter(v => typeof v === 'number');
        return minValues.length > 0 ? Math.min(...minValues) : 0;
      
      case AGGREGATION_TYPES.MAX:
        const maxValues = values.filter(v => typeof v === 'number');
        return maxValues.length > 0 ? Math.max(...maxValues) : 0;
      
      case AGGREGATION_TYPES.MEDIAN:
        const sortedValues = values.filter(v => typeof v === 'number').sort((a, b) => a - b);
        if (sortedValues.length === 0) return 0;
        const mid = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0 ? 
          (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
      
      case AGGREGATION_TYPES.DISTINCT_COUNT:
        return new Set(values).size;
      
      case AGGREGATION_TYPES.PERCENTILE:
        // 預設計算95百分位
        const percentileValues = values.filter(v => typeof v === 'number').sort((a, b) => a - b);
        if (percentileValues.length === 0) return 0;
        const percentileIndex = Math.ceil(percentileValues.length * 0.95) - 1;
        return percentileValues[Math.max(0, percentileIndex)];
      
      default:
        return values.length > 0 ? values[0] : 0;
    }
  }

  // 生成圖表數據
  async generateChartData(data, chart) {
    const chartData = [];
    
    // 從數據中提取圖表數據
    for (const [sourceKey, sourceData] of Object.entries(data)) {
      let items = [];
      
      if (Array.isArray(sourceData.migrations)) {
        items = sourceData.migrations;
      } else if (Array.isArray(sourceData.metrics)) {
        items = sourceData.metrics;
      } else if (Array.isArray(sourceData.errors)) {
        items = sourceData.errors;
      } else if (Array.isArray(sourceData.activities)) {
        items = sourceData.activities;
      }
      
      for (const item of items) {
        if (item[chart.field] !== undefined) {
          chartData.push({
            label: item[chart.field],
            value: item.count || 1,
            timestamp: item.timestamp || item.startTime,
            source: sourceKey,
            item
          });
        }
      }
    }
    
    // 根據圖表類型聚合數據
    switch (chart.type) {
      case 'pie':
      case 'bar':
        return this.aggregateByCategory(chartData, chart.field);
      
      case 'line':
      case 'area':
        return this.aggregateByTime(chartData);
      
      case 'scatter':
        return chartData.map(item => ({
          x: item.timestamp,
          y: item.value
        }));
      
      default:
        return chartData;
    }
  }

  // 按類別聚合
  aggregateByCategory(data, field) {
    const groups = {};
    
    for (const item of data) {
      const key = item.label;
      if (!groups[key]) {
        groups[key] = { label: key, value: 0, count: 0 };
      }
      groups[key].value += item.value;
      groups[key].count += 1;
    }
    
    return Object.values(groups).sort((a, b) => b.value - a.value);
  }

  // 按時間聚合
  aggregateByTime(data) {
    const groups = {};
    
    for (const item of data) {
      if (!item.timestamp) continue;
      
      const date = new Date(item.timestamp);
      const key = date.toISOString().split('T')[0]; // 按日期分組
      
      if (!groups[key]) {
        groups[key] = { date: key, value: 0, count: 0 };
      }
      groups[key].value += item.value;
      groups[key].count += 1;
    }
    
    return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // 建構報告
  async buildReport(processedData, reportConfig) {
    const report = {
      id: reportConfig.id,
      type: reportConfig.type,
      title: reportConfig.template?.name || 'Custom Report',
      description: reportConfig.template?.description || '',
      generatedAt: reportConfig.timestamp,
      timeRange: reportConfig.options.timeRange,
      format: reportConfig.options.format,
      
      // 報告內容
      summary: processedData.summary,
      charts: processedData.charts,
      metadata: {
        ...processedData.metadata,
        generator: 'ReportGenerator v1.0',
        configHash: this.generateConfigHash(reportConfig)
      }
    };
    
    // 包含原始數據（如果需要）
    if (reportConfig.options.includeRawData) {
      report.rawData = processedData.rawData;
    }
    
    // 格式化輸出
    if (reportConfig.options.format !== REPORT_FORMATS.JSON) {
      return await this.formatReport(report, reportConfig.options.format);
    }
    
    return report;
  }

  // 格式化報告
  async formatReport(report, format) {
    switch (format) {
      case REPORT_FORMATS.CSV:
        return this.convertToCSV(report);
      
      case REPORT_FORMATS.HTML:
        return this.convertToHTML(report);
      
      case REPORT_FORMATS.PDF:
        return this.convertToPDF(report);
      
      case REPORT_FORMATS.XLSX:
        return this.convertToXLSX(report);
      
      default:
        return report;
    }
  }

  // 轉換為CSV格式
  convertToCSV(report) {
    const rows = [];
    
    // 標題行
    rows.push(['Report Type', 'Generated At', 'Time Range']);
    rows.push([report.type, report.generatedAt, report.timeRange]);
    rows.push([]);
    
    // 摘要數據
    rows.push(['Summary']);
    rows.push(['Metric', 'Value', 'Aggregation']);
    
    for (const [key, data] of Object.entries(report.summary)) {
      rows.push([data.label, data.value, data.aggregation]);
    }
    
    // 圖表數據
    if (report.charts && report.charts.length > 0) {
      rows.push([]);
      rows.push(['Charts']);
      
      for (const chart of report.charts) {
        rows.push([]);
        rows.push([chart.title]);
        rows.push(['Label', 'Value']);
        
        for (const item of chart.data) {
          rows.push([item.label || item.date, item.value]);
        }
      }
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }

  // 轉換為HTML格式
  convertToHTML(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .summary table { border-collapse: collapse; width: 100%; }
        .summary th, .summary td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .summary th { background-color: #f2f2f2; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
        <p><strong>Time Range:</strong> ${report.timeRange}</p>
        <p><strong>Description:</strong> ${report.description}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <table>
            <thead>
                <tr><th>Metric</th><th>Value</th><th>Aggregation</th></tr>
            </thead>
            <tbody>
                ${Object.entries(report.summary).map(([key, data]) => 
                  `<tr><td>${data.label}</td><td>${data.value}</td><td>${data.aggregation}</td></tr>`
                ).join('')}
            </tbody>
        </table>
    </div>
    
    ${report.charts ? report.charts.map(chart => `
        <div class="chart">
            <h3>${chart.title}</h3>
            <p>Chart Type: ${chart.type}</p>
            <!-- Chart data would be rendered here with a charting library -->
        </div>
    `).join('') : ''}
    
    <div class="metadata">
        <h2>Metadata</h2>
        <p><strong>Data Points:</strong> ${report.metadata.dataPoints}</p>
        <p><strong>Sources:</strong> ${report.metadata.sources.join(', ')}</p>
        <p><strong>Generator:</strong> ${report.metadata.generator}</p>
    </div>
</body>
</html>`;
  }

  // 轉換為PDF格式（模擬）
  async convertToPDF(report) {
    // 在實際實現中，這裡會使用像 puppeteer 或 jsPDF 這樣的庫
    return {
      format: 'pdf',
      content: 'PDF content would be generated here',
      metadata: report.metadata
    };
  }

  // 轉換為XLSX格式（模擬）
  async convertToXLSX(report) {
    // 在實際實現中，這裡會使用像 SheetJS 這樣的庫
    return {
      format: 'xlsx',
      content: 'Excel content would be generated here',
      metadata: report.metadata
    };
  }

  // 生成配置雜湊
  generateConfigHash(config) {
    return `hash_${Date.now()}_${config.type}`;
  }

  // 計算數據點數量
  calculateDataPoints(data) {
    let count = 0;
    
    for (const sourceData of Object.values(data)) {
      if (Array.isArray(sourceData.migrations)) {
        count += sourceData.migrations.length;
      }
      if (Array.isArray(sourceData.metrics)) {
        count += sourceData.metrics.length;
      }
      if (Array.isArray(sourceData.errors)) {
        count += sourceData.errors.length;
      }
      if (Array.isArray(sourceData.activities)) {
        count += sourceData.activities.length;
      }
    }
    
    return count;
  }

  // 收集自定義報告數據
  async collectCustomReportData(reportConfig) {
    const { options } = reportConfig;
    
    if (options.customBuilder && this.customReportBuilders.has(options.customBuilder)) {
      const builder = this.customReportBuilders.get(options.customBuilder);
      return await builder.getData(options);
    }
    
    throw new Error('Custom report builder not found');
  }

  // 註冊自定義報告建構器
  registerCustomReportBuilder(name, builder) {
    if (!builder || typeof builder.getData !== 'function') {
      throw new Error('Custom report builder must implement getData method');
    }
    
    this.customReportBuilders.set(name, builder);
    this.emit('custom-builder-registered', { name });
  }

  // 生成快取鍵
  getCacheKey(type, options) {
    const keyData = { type, ...options };
    return JSON.stringify(keyData);
  }

  // 更新統計資訊
  updateStatistics(success, duration) {
    this.statistics.totalReportsGenerated++;
    
    if (success) {
      this.statistics.successfulReports++;
    } else {
      this.statistics.failedReports++;
    }
    
    // 更新平均生成時間
    const totalDuration = this.statistics.averageGenerationTime * (this.statistics.totalReportsGenerated - 1) + duration;
    this.statistics.averageGenerationTime = totalDuration / this.statistics.totalReportsGenerated;
  }

  // 啟動快取清理
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.reportCache.entries()) {
        if (now - value.timestamp > this.config.cacheTTL) {
          this.reportCache.delete(key);
        }
      }
    }, this.config.cacheTTL);
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      ...this.statistics,
      cacheSize: this.reportCache.size,
      registeredDataSources: this.dataSources.size,
      availableTemplates: this.reportTemplates.size,
      customBuilders: this.customReportBuilders.size
    };
  }

  // 清理資源
  shutdown() {
    this.reportCache.clear();
    this.scheduledReports.clear();
    this.removeAllListeners();
    
    this.emit('shutdown');
  }
}

export default ReportGenerator;