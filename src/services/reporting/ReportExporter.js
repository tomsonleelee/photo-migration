// 報告匯出器 - 支援多種格式的報告匯出功能
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { REPORT_FORMATS } from './ReportGenerator.js';

// 匯出狀態
export const EXPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// 匯出選項
export const EXPORT_OPTIONS = {
  INCLUDE_CHARTS: 'includeCharts',
  INCLUDE_RAW_DATA: 'includeRawData',
  INCLUDE_METADATA: 'includeMetadata',
  COMPRESS_OUTPUT: 'compressOutput',
  PASSWORD_PROTECT: 'passwordProtect'
};

export class ReportExporter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      supportedFormats: options.supportedFormats || [
        REPORT_FORMATS.CSV,
        REPORT_FORMATS.PDF,
        REPORT_FORMATS.XLSX,
        REPORT_FORMATS.JSON,
        REPORT_FORMATS.HTML
      ],
      enableCompression: options.enableCompression !== false,
      enablePasswordProtection: options.enablePasswordProtection !== false,
      defaultFormat: options.defaultFormat || REPORT_FORMATS.PDF,
      outputDirectory: options.outputDirectory || './exports',
      ...options
    };
    
    // 匯出任務管理
    this.exportTasks = new Map();
    this.exportHistory = [];
    
    // 統計資訊
    this.statistics = {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      totalFileSize: 0,
      averageExportTime: 0,
      formatUsage: {}
    };
    
    // 格式處理器
    this.formatProcessors = new Map();
    
    this.initialize();
  }

  // 初始化匯出器
  initialize() {
    try {
      // 註冊默認格式處理器
      this.registerDefaultProcessors();
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 註冊默認格式處理器
  registerDefaultProcessors() {
    // CSV 處理器
    this.formatProcessors.set(REPORT_FORMATS.CSV, {
      process: this.processCSVExport.bind(this),
      mimeType: 'text/csv',
      fileExtension: '.csv'
    });

    // PDF 處理器
    this.formatProcessors.set(REPORT_FORMATS.PDF, {
      process: this.processPDFExport.bind(this),
      mimeType: 'application/pdf',
      fileExtension: '.pdf'
    });

    // XLSX 處理器
    this.formatProcessors.set(REPORT_FORMATS.XLSX, {
      process: this.processXLSXExport.bind(this),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileExtension: '.xlsx'
    });

    // JSON 處理器
    this.formatProcessors.set(REPORT_FORMATS.JSON, {
      process: this.processJSONExport.bind(this),
      mimeType: 'application/json',
      fileExtension: '.json'
    });

    // HTML 處理器
    this.formatProcessors.set(REPORT_FORMATS.HTML, {
      process: this.processHTMLExport.bind(this),
      mimeType: 'text/html',
      fileExtension: '.html'
    });
  }

  // 匯出報告
  async exportReport(report, format = this.config.defaultFormat, options = {}) {
    const exportId = uuidv4();
    const startTime = Date.now();

    try {
      // 驗證格式支援
      if (!this.config.supportedFormats.includes(format)) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // 創建匯出任務
      const exportTask = {
        id: exportId,
        reportId: report.id,
        format,
        status: EXPORT_STATUS.PENDING,
        startTime: new Date().toISOString(),
        options: {
          includeCharts: true,
          includeRawData: false,
          includeMetadata: true,
          compressOutput: false,
          passwordProtect: false,
          ...options
        },
        progress: 0,
        fileSize: 0,
        fileName: null,
        downloadUrl: null
      };

      this.exportTasks.set(exportId, exportTask);
      this.emit('export-started', { exportId, format });

      // 更新狀態為處理中
      exportTask.status = EXPORT_STATUS.PROCESSING;
      this.emit('export-progress', { exportId, progress: 10 });

      // 預處理報告數據
      const processedReport = await this.preprocessReport(report, exportTask);
      this.emit('export-progress', { exportId, progress: 30 });

      // 獲取格式處理器
      const processor = this.formatProcessors.get(format);
      if (!processor) {
        throw new Error(`No processor found for format: ${format}`);
      }

      // 處理匯出
      const exportResult = await processor.process(processedReport, exportTask);
      this.emit('export-progress', { exportId, progress: 80 });

      // 後處理（壓縮、密碼保護等）
      const finalResult = await this.postprocessExport(exportResult, exportTask);
      this.emit('export-progress', { exportId, progress: 100 });

      // 更新任務狀態
      exportTask.status = EXPORT_STATUS.COMPLETED;
      exportTask.endTime = new Date().toISOString();
      exportTask.duration = Date.now() - startTime;
      exportTask.fileSize = finalResult.fileSize;
      exportTask.fileName = finalResult.fileName;
      exportTask.downloadUrl = finalResult.downloadUrl;

      // 更新統計
      this.updateStatistics(format, true, exportTask.duration, exportTask.fileSize);

      // 記錄匯出歷史
      this.recordExportHistory(exportTask);

      this.emit('export-completed', {
        exportId,
        format,
        fileName: exportTask.fileName,
        fileSize: exportTask.fileSize,
        downloadUrl: exportTask.downloadUrl
      });

      return {
        exportId,
        fileName: exportTask.fileName,
        fileSize: exportTask.fileSize,
        downloadUrl: exportTask.downloadUrl,
        mimeType: processor.mimeType
      };

    } catch (error) {
      // 更新任務狀態為失敗
      const exportTask = this.exportTasks.get(exportId);
      if (exportTask) {
        exportTask.status = EXPORT_STATUS.FAILED;
        exportTask.error = error.message;
        exportTask.endTime = new Date().toISOString();
        exportTask.duration = Date.now() - startTime;
      }

      this.updateStatistics(format, false, Date.now() - startTime, 0);

      this.emit('export-failed', {
        exportId,
        format,
        error: error.message
      });

      throw error;
    }
  }

  // 預處理報告
  async preprocessReport(report, exportTask) {
    const { options } = exportTask;
    const processedReport = { ...report };

    // 移除不需要的數據
    if (!options.includeRawData) {
      delete processedReport.rawData;
    }

    if (!options.includeMetadata) {
      delete processedReport.metadata;
    }

    if (!options.includeCharts) {
      delete processedReport.charts;
    }

    // 數據清理和格式化
    if (processedReport.summary) {
      for (const [key, data] of Object.entries(processedReport.summary)) {
        if (typeof data.value === 'number') {
          data.formattedValue = this.formatNumber(data.value);
        }
      }
    }

    return processedReport;
  }

  // 後處理匯出結果
  async postprocessExport(exportResult, exportTask) {
    let result = exportResult;

    // 壓縮處理
    if (exportTask.options.compressOutput && this.config.enableCompression) {
      result = await this.compressFile(result);
    }

    // 密碼保護
    if (exportTask.options.passwordProtect && this.config.enablePasswordProtection) {
      result = await this.passwordProtectFile(result, exportTask.options.password);
    }

    return result;
  }

  // 處理 CSV 匯出
  async processCSVExport(report, exportTask) {
    const csvData = [];
    
    // 報告基本資訊
    csvData.push(['Report Information']);
    csvData.push(['Type', report.type]);
    csvData.push(['Title', report.title]);
    csvData.push(['Generated At', report.generatedAt]);
    csvData.push(['Time Range', report.timeRange]);
    csvData.push([]);

    // 摘要數據
    if (report.summary) {
      csvData.push(['Summary Metrics']);
      csvData.push(['Metric', 'Value', 'Formatted Value', 'Aggregation']);
      
      for (const [key, data] of Object.entries(report.summary)) {
        csvData.push([
          data.label || key,
          data.value,
          data.formattedValue || data.value,
          data.aggregation
        ]);
      }
      csvData.push([]);
    }

    // 圖表數據
    if (report.charts && exportTask.options.includeCharts) {
      for (const chart of report.charts) {
        csvData.push([`Chart: ${chart.title}`]);
        csvData.push(['Label', 'Value', 'Additional Info']);
        
        for (const item of chart.data) {
          csvData.push([
            item.label || item.date || item.x,
            item.value || item.y,
            item.count || item.source || ''
          ]);
        }
        csvData.push([]);
      }
    }

    // 原始數據
    if (report.rawData && exportTask.options.includeRawData) {
      csvData.push(['Raw Data']);
      csvData.push(['Source', 'Data']);
      
      for (const [source, data] of Object.entries(report.rawData)) {
        csvData.push([source, JSON.stringify(data)]);
      }
    }

    const csvContent = csvData.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    ).join('\n');

    const fileName = `${report.type}_${Date.now()}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return {
      content: csvContent,
      fileName,
      fileSize: blob.size,
      downloadUrl: this.createDownloadUrl(blob, fileName)
    };
  }

  // 處理 PDF 匯出
  async processPDFExport(report, exportTask) {
    // 生成 HTML 內容
    const htmlContent = this.generateReportHTML(report, exportTask);
    
    // 在實際環境中，這裡會使用 puppeteer 或類似工具生成 PDF
    // 這裡我們模擬 PDF 生成過程
    const pdfContent = await this.generatePDFFromHTML(htmlContent);
    
    const fileName = `${report.type}_${Date.now()}.pdf`;
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    
    return {
      content: pdfContent,
      fileName,
      fileSize: blob.size,
      downloadUrl: this.createDownloadUrl(blob, fileName)
    };
  }

  // 處理 XLSX 匯出
  async processXLSXExport(report, exportTask) {
    // 在實際環境中，這裡會使用 SheetJS (xlsx) 庫
    // 這裡我們模擬 Excel 文件生成
    const workbook = await this.createExcelWorkbook(report, exportTask);
    
    const fileName = `${report.type}_${Date.now()}.xlsx`;
    const blob = new Blob([workbook], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    return {
      content: workbook,
      fileName,
      fileSize: blob.size,
      downloadUrl: this.createDownloadUrl(blob, fileName)
    };
  }

  // 處理 JSON 匯出
  async processJSONExport(report, exportTask) {
    const jsonContent = JSON.stringify(report, null, 2);
    const fileName = `${report.type}_${Date.now()}.json`;
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    return {
      content: jsonContent,
      fileName,
      fileSize: blob.size,
      downloadUrl: this.createDownloadUrl(blob, fileName)
    };
  }

  // 處理 HTML 匯出
  async processHTMLExport(report, exportTask) {
    const htmlContent = this.generateReportHTML(report, exportTask);
    const fileName = `${report.type}_${Date.now()}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    return {
      content: htmlContent,
      fileName,
      fileSize: blob.size,
      downloadUrl: this.createDownloadUrl(blob, fileName)
    };
  }

  // 生成報告 HTML
  generateReportHTML(report, exportTask) {
    const includeCharts = exportTask.options.includeCharts && report.charts;
    
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0 0 10px 0;
        }
        .meta-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .meta-item {
            padding: 10px;
            background: white;
            border-radius: 3px;
            border-left: 4px solid #007bff;
        }
        .meta-label {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
        }
        .meta-value {
            color: #333;
            font-size: 1.1em;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #007bff;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 0.9em;
            opacity: 0.9;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .summary-card .aggregation {
            font-size: 0.8em;
            opacity: 0.8;
        }
        .chart-section {
            margin: 30px 0;
        }
        .chart-placeholder {
            height: 300px;
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            border-radius: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
            color: #495057;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        @media print {
            body { padding: 0; }
            .chart-placeholder { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>${report.description || ''}</p>
        
        <div class="meta-info">
            <div class="meta-item">
                <div class="meta-label">報告類型</div>
                <div class="meta-value">${report.type}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">生成時間</div>
                <div class="meta-value">${new Date(report.generatedAt).toLocaleString('zh-TW')}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">時間範圍</div>
                <div class="meta-value">${report.timeRange}</div>
            </div>
            ${report.metadata ? `
            <div class="meta-item">
                <div class="meta-label">數據點數</div>
                <div class="meta-value">${report.metadata.dataPoints?.toLocaleString()}</div>
            </div>
            ` : ''}
        </div>
    </div>

    ${report.summary ? `
    <div class="section">
        <h2>摘要指標</h2>
        <div class="summary-grid">
            ${Object.entries(report.summary).map(([key, data]) => `
                <div class="summary-card">
                    <h3>${data.label || key}</h3>
                    <div class="value">${data.formattedValue || data.value}</div>
                    <div class="aggregation">${data.aggregation}</div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${includeCharts ? `
    <div class="section">
        <h2>圖表分析</h2>
        ${report.charts.map(chart => `
            <div class="chart-section">
                <h3>${chart.title}</h3>
                <div class="chart-placeholder">
                    圖表: ${chart.type} - ${chart.title}
                    <br>
                    <small>此處在實際 PDF 中會顯示真實圖表</small>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>標籤</th>
                            <th>數值</th>
                            ${chart.data[0]?.count !== undefined ? '<th>計數</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${chart.data.map(item => `
                            <tr>
                                <td>${item.label || item.date || 'N/A'}</td>
                                <td>${item.value}</td>
                                ${item.count !== undefined ? `<td>${item.count}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${report.metadata && exportTask.options.includeMetadata ? `
    <div class="section">
        <h2>元數據</h2>
        <table>
            <tbody>
                <tr><th>生成器</th><td>${report.metadata.generator || 'N/A'}</td></tr>
                <tr><th>數據來源</th><td>${report.metadata.sources?.join(', ') || 'N/A'}</td></tr>
                <tr><th>數據點數量</th><td>${report.metadata.dataPoints?.toLocaleString() || 'N/A'}</td></tr>
                <tr><th>配置雜湊</th><td>${report.metadata.configHash || 'N/A'}</td></tr>
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>此報告由照片遷移系統自動生成 © ${new Date().getFullYear()}</p>
        <p>生成時間: ${new Date().toLocaleString('zh-TW')}</p>
    </div>
</body>
</html>`;
  }

  // 模擬 PDF 生成
  async generatePDFFromHTML(htmlContent) {
    // 在實際環境中，這裡會使用 puppeteer 或其他 PDF 生成工具
    return new Uint8Array([37, 80, 68, 70]); // PDF 文件頭的模擬
  }

  // 模擬 Excel 工作簿創建
  async createExcelWorkbook(report, exportTask) {
    // 在實際環境中，這裡會使用 SheetJS 創建真實的 Excel 文件
    return new Uint8Array([80, 75, 3, 4]); // ZIP 文件頭的模擬（Excel 基於 ZIP）
  }

  // 壓縮文件
  async compressFile(exportResult) {
    // 在實際環境中，這裡會使用壓縮庫
    return {
      ...exportResult,
      fileName: exportResult.fileName.replace(/\.[^.]+$/, '.zip'),
      compressed: true
    };
  }

  // 密碼保護文件
  async passwordProtectFile(exportResult, password) {
    // 在實際環境中，這裡會應用密碼保護
    return {
      ...exportResult,
      passwordProtected: true,
      password
    };
  }

  // 創建下載 URL
  createDownloadUrl(blob, fileName) {
    const url = URL.createObjectURL(blob);
    
    // 在瀏覽器環境中，可以觸發下載
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      return url;
    }
    
    return url;
  }

  // 格式化數字
  formatNumber(value) {
    if (typeof value !== 'number') return value;
    
    if (value >= 1e9) {
      return (value / 1e9).toFixed(1) + 'B';
    } else if (value >= 1e6) {
      return (value / 1e6).toFixed(1) + 'M';
    } else if (value >= 1e3) {
      return (value / 1e3).toFixed(1) + 'K';
    }
    
    return value.toLocaleString();
  }

  // 更新統計資訊
  updateStatistics(format, success, duration, fileSize) {
    this.statistics.totalExports++;
    
    if (success) {
      this.statistics.successfulExports++;
      this.statistics.totalFileSize += fileSize;
    } else {
      this.statistics.failedExports++;
    }

    // 更新平均匯出時間
    const totalDuration = this.statistics.averageExportTime * (this.statistics.totalExports - 1) + duration;
    this.statistics.averageExportTime = totalDuration / this.statistics.totalExports;

    // 更新格式使用統計
    if (!this.statistics.formatUsage[format]) {
      this.statistics.formatUsage[format] = 0;
    }
    this.statistics.formatUsage[format]++;
  }

  // 記錄匯出歷史
  recordExportHistory(exportTask) {
    this.exportHistory.push({
      ...exportTask,
      timestamp: new Date().toISOString()
    });

    // 限制歷史記錄長度
    if (this.exportHistory.length > 1000) {
      this.exportHistory = this.exportHistory.slice(-1000);
    }
  }

  // 取消匯出
  cancelExport(exportId) {
    const exportTask = this.exportTasks.get(exportId);
    if (!exportTask) {
      throw new Error(`Export task not found: ${exportId}`);
    }

    if (exportTask.status === EXPORT_STATUS.COMPLETED) {
      throw new Error('Cannot cancel completed export');
    }

    exportTask.status = EXPORT_STATUS.CANCELLED;
    exportTask.endTime = new Date().toISOString();

    this.emit('export-cancelled', { exportId });
    
    return true;
  }

  // 獲取匯出狀態
  getExportStatus(exportId) {
    const exportTask = this.exportTasks.get(exportId);
    if (!exportTask) {
      throw new Error(`Export task not found: ${exportId}`);
    }

    return {
      id: exportTask.id,
      status: exportTask.status,
      progress: exportTask.progress,
      format: exportTask.format,
      fileName: exportTask.fileName,
      fileSize: exportTask.fileSize,
      downloadUrl: exportTask.downloadUrl,
      error: exportTask.error,
      startTime: exportTask.startTime,
      endTime: exportTask.endTime,
      duration: exportTask.duration
    };
  }

  // 獲取所有匯出任務
  getAllExportTasks() {
    return Array.from(this.exportTasks.values());
  }

  // 獲取匯出歷史
  getExportHistory(limit = 50) {
    return this.exportHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      ...this.statistics,
      activeTasks: this.exportTasks.size,
      historySize: this.exportHistory.length,
      supportedFormats: this.config.supportedFormats
    };
  }

  // 清理過期任務
  cleanupExpiredTasks(maxAge = 24 * 60 * 60 * 1000) { // 24小時
    const cutoff = Date.now() - maxAge;
    
    for (const [taskId, task] of this.exportTasks.entries()) {
      const taskTime = new Date(task.startTime).getTime();
      if (taskTime < cutoff && task.status !== EXPORT_STATUS.PROCESSING) {
        this.exportTasks.delete(taskId);
      }
    }
  }

  // 關閉匯出器
  shutdown() {
    // 取消所有處理中的任務
    for (const [taskId, task] of this.exportTasks.entries()) {
      if (task.status === EXPORT_STATUS.PROCESSING) {
        this.cancelExport(taskId);
      }
    }

    this.exportTasks.clear();
    this.removeAllListeners();
    
    this.emit('shutdown');
  }
}

export default ReportExporter;