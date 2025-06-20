// 報告組件統一入口
export { Dashboard } from './Dashboard.jsx';
export { MigrationHistory } from './MigrationHistory.jsx';
export { LogViewer } from './LogViewer.jsx';

// 組件工廠
export class ReportingComponentFactory {
  static createDashboard(props = {}) {
    return Dashboard;
  }
  
  static createMigrationHistory(props = {}) {
    return MigrationHistory;
  }
  
  static createLogViewer(props = {}) {
    return LogViewer;
  }
}

export default ReportingComponentFactory;