// 報告和分析模組統一入口
export { 
  ReportGenerator,
  REPORT_TYPES,
  REPORT_FORMATS,
  TIME_RANGES,
  AGGREGATION_TYPES
} from './ReportGenerator.js';

export { 
  ReportExporter,
  EXPORT_STATUS,
  EXPORT_OPTIONS
} from './ReportExporter.js';

// 報告服務工廠
export class ReportingServiceFactory {
  static createReportGenerator(options = {}) {
    return new ReportGenerator(options);
  }
  
  static createReportExporter(options = {}) {
    return new ReportExporter(options);
  }
  
  // 創建完整的報告系統
  static createReportingSystem(config = {}) {
    const {
      generatorOptions = {},
      exporterOptions = {}
    } = config;
    
    const reportGenerator = new ReportGenerator(generatorOptions);
    const reportExporter = new ReportExporter(exporterOptions);
    
    return {
      reportGenerator,
      reportExporter
    };
  }
}

export default ReportingServiceFactory;