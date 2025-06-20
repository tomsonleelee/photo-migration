// 數據同步模組統一入口
export { 
  SyncManager, 
  SYNC_STATUS, 
  SYNC_TYPES, 
  CONFLICT_TYPES, 
  RESOLUTION_STRATEGIES 
} from './SyncManager.js';

// 同步服務工廠
export class SyncServiceFactory {
  static createSyncManager(options = {}) {
    return new SyncManager(options);
  }
  
  // 創建預配置的同步管理器
  static createDefaultSyncManager() {
    return new SyncManager({
      autoSync: true,
      syncInterval: 30 * 60 * 1000, // 30分鐘
      conflictResolutionStrategy: RESOLUTION_STRATEGIES.LATEST_TIMESTAMP,
      enableVersioning: true,
      enableDifferentialSync: true
    });
  }
  
  // 創建高頻同步管理器
  static createHighFrequencySyncManager() {
    return new SyncManager({
      autoSync: true,
      syncInterval: 5 * 60 * 1000, // 5分鐘
      maxConcurrentSyncs: 5,
      conflictResolutionStrategy: RESOLUTION_STRATEGIES.MANUAL,
      enableVersioning: true,
      enableDifferentialSync: true
    });
  }
  
  // 創建批量同步管理器
  static createBatchSyncManager() {
    return new SyncManager({
      autoSync: false,
      maxConcurrentSyncs: 10,
      conflictResolutionStrategy: RESOLUTION_STRATEGIES.SOURCE_PRIORITY,
      enableVersioning: true,
      enableDifferentialSync: true
    });
  }
}

export default SyncServiceFactory;