// 數據同步管理器 - 處理跨平台數據同步和衝突解決
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { PhotoApiService } from '../api/PhotoApiService.js';
import CryptoJS from 'crypto-js';

// 同步狀態
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// 同步類型
export const SYNC_TYPES = {
  FULL: 'full',           // 完整同步
  INCREMENTAL: 'incremental', // 增量同步
  DIFFERENTIAL: 'differential', // 差分同步
  MANUAL: 'manual'        // 手動同步
};

// 衝突類型
export const CONFLICT_TYPES = {
  METADATA_CONFLICT: 'metadata_conflict',     // 元數據衝突
  CONTENT_CONFLICT: 'content_conflict',       // 內容衝突
  TIMESTAMP_CONFLICT: 'timestamp_conflict',   // 時間戳衝突
  DUPLICATE_CONTENT: 'duplicate_content',     // 重複內容
  VERSION_CONFLICT: 'version_conflict'        // 版本衝突
};

// 解決策略
export const RESOLUTION_STRATEGIES = {
  MANUAL: 'manual',                          // 手動解決
  LATEST_TIMESTAMP: 'latest_timestamp',      // 最新時間戳優先
  SOURCE_PRIORITY: 'source_priority',        // 來源優先級
  LARGEST_SIZE: 'largest_size',             // 最大尺寸優先
  HIGHEST_QUALITY: 'highest_quality',       // 最高質量優先
  MERGE_METADATA: 'merge_metadata',         // 合併元數據
  KEEP_BOTH: 'keep_both'                    // 保留雙方
};

export class SyncManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      autoSync: options.autoSync !== false,
      syncInterval: options.syncInterval || 30 * 60 * 1000, // 30分鐘
      maxConcurrentSyncs: options.maxConcurrentSyncs || 3,
      conflictResolutionStrategy: options.conflictResolutionStrategy || RESOLUTION_STRATEGIES.MANUAL,
      enableVersioning: options.enableVersioning !== false,
      enableDifferentialSync: options.enableDifferentialSync !== false,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000,
      changelogRetention: options.changelogRetention || 90 * 24 * 60 * 60 * 1000, // 90天
      ...options
    };
    
    // 同步狀態管理
    this.syncSessions = new Map();
    this.activeSyncs = new Set();
    this.syncQueue = [];
    this.changelog = [];
    this.lastSyncTimestamps = new Map();
    
    // 版本控制
    this.dataVersions = new Map();
    this.versionHashes = new Map();
    
    // 衝突管理
    this.conflicts = new Map();
    this.pendingResolutions = new Map();
    
    // 統計資訊
    this.statistics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      automatedResolutions: 0,
      manualResolutions: 0,
      totalDataTransferred: 0,
      averageSyncTime: 0
    };
    
    // API 服務
    this.apiService = new PhotoApiService();
    
    // 定時器
    this.syncTimer = null;
    this.cleanupTimer = null;
    
    this.initialize();
  }

  // 初始化同步管理器
  async initialize() {
    try {
      // 載入上次同步狀態
      await this.loadSyncState();
      
      // 載入版本信息
      await this.loadVersionData();
      
      // 載入變更日誌
      await this.loadChangelog();
      
      // 啟動自動同步
      if (this.config.autoSync) {
        this.startAutoSync();
      }
      
      // 啟動清理定時器
      this.startCleanup();
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 開始同步
  async startSync(platforms, options = {}) {
    try {
      const syncId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const syncSession = {
        id: syncId,
        platforms,
        type: options.type || SYNC_TYPES.INCREMENTAL,
        status: SYNC_STATUS.SYNCING,
        startTime: timestamp,
        endTime: null,
        
        // 同步配置
        config: {
          conflictResolution: options.conflictResolution || this.config.conflictResolutionStrategy,
          forceFull: options.forceFull || false,
          dryRun: options.dryRun || false,
          ...options
        },
        
        // 進度追蹤
        progress: {
          totalItems: 0,
          processedItems: 0,
          syncedItems: 0,
          skippedItems: 0,
          conflictItems: 0,
          percentage: 0
        },
        
        // 統計信息
        stats: {
          dataTransferred: 0,
          conflicts: [],
          errors: [],
          changes: []
        }
      };
      
      // 檢查並發限制
      if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
        this.syncQueue.push(syncSession);
        this.emit('sync-queued', { syncId, platforms });
        return syncId;
      }
      
      // 存儲同步會話
      this.syncSessions.set(syncId, syncSession);
      this.activeSyncs.add(syncId);
      
      this.emit('sync-started', {
        syncId,
        platforms,
        type: syncSession.type
      });
      
      // 執行同步
      await this.executeSyncSession(syncId);
      
      return syncId;
      
    } catch (error) {
      this.emit('error', {
        type: 'sync_start_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 執行同步會話
  async executeSyncSession(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    try {
      // 步驟1: 收集數據
      await this.collectDataFromPlatforms(syncId);
      
      // 步驟2: 檢測衝突
      await this.detectConflicts(syncId);
      
      // 步驟3: 解決衝突
      await this.resolveConflicts(syncId);
      
      // 步驟4: 應用更改
      await this.applyChanges(syncId);
      
      // 步驟5: 完成同步
      await this.completeSyncSession(syncId);
      
    } catch (error) {
      await this.failSyncSession(syncId, error);
    }
  }

  // 收集平台數據
  async collectDataFromPlatforms(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    const platformData = new Map();
    
    for (const platform of session.platforms) {
      try {
        this.emit('sync-progress', {
          syncId,
          phase: 'collecting',
          platform,
          message: `正在收集 ${platform} 的數據`
        });
        
        let data;
        
        if (session.type === SYNC_TYPES.FULL || session.config.forceFull) {
          // 完整同步
          data = await this.collectFullData(platform);
        } else {
          // 增量同步
          const lastSync = this.lastSyncTimestamps.get(platform);
          data = await this.collectIncrementalData(platform, lastSync);
        }
        
        platformData.set(platform, data);
        session.progress.totalItems += data.length;
        
      } catch (error) {
        session.stats.errors.push({
          platform,
          phase: 'collection',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        this.emit('sync-error', {
          syncId,
          platform,
          phase: 'collection',
          error: error.message
        });
      }
    }
    
    session.platformData = platformData;
    this.updateSyncProgress(syncId);
  }

  // 收集完整數據
  async collectFullData(platform) {
    const photos = await this.apiService.fetchPhotos(platform, {
      limit: 10000,
      includeMetadata: true
    });
    
    return photos.map(photo => ({
      ...photo,
      source: platform,
      collectTime: new Date().toISOString(),
      version: this.generateDataVersion(photo)
    }));
  }

  // 收集增量數據
  async collectIncrementalData(platform, lastSyncTime) {
    const since = lastSyncTime ? new Date(lastSyncTime) : new Date(0);
    
    const photos = await this.apiService.fetchPhotos(platform, {
      since,
      limit: 5000,
      includeMetadata: true
    });
    
    return photos.map(photo => ({
      ...photo,
      source: platform,
      collectTime: new Date().toISOString(),
      version: this.generateDataVersion(photo)
    }));
  }

  // 生成數據版本
  generateDataVersion(data) {
    const versionData = {
      id: data.id,
      url: data.url,
      metadata: data.metadata,
      lastModified: data.lastModified || data.createdAt
    };
    
    const hash = CryptoJS.SHA256(JSON.stringify(versionData)).toString();
    return {
      hash,
      timestamp: new Date().toISOString(),
      size: data.size || 0
    };
  }

  // 檢測衝突
  async detectConflicts(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session || !session.platformData) return;
    
    const conflicts = [];
    const dataGroups = this.groupDataByIdentity(session.platformData);
    
    for (const [identity, items] of dataGroups.entries()) {
      if (items.length > 1) {
        const conflict = await this.analyzeConflict(identity, items);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    session.stats.conflicts = conflicts;
    session.progress.conflictItems = conflicts.length;
    this.statistics.conflictsDetected += conflicts.length;
    
    this.emit('conflicts-detected', {
      syncId,
      conflictCount: conflicts.length,
      conflicts: conflicts.map(c => ({
        id: c.id,
        type: c.type,
        items: c.items.length
      }))
    });
    
    this.updateSyncProgress(syncId);
  }

  // 按身份分組數據
  groupDataByIdentity(platformData) {
    const groups = new Map();
    
    for (const [platform, items] of platformData.entries()) {
      for (const item of items) {
        const identity = this.generateItemIdentity(item);
        
        if (!groups.has(identity)) {
          groups.set(identity, []);
        }
        
        groups.get(identity).push(item);
      }
    }
    
    return groups;
  }

  // 生成項目身份標識
  generateItemIdentity(item) {
    // 基於多個因素生成身份標識
    const identityFactors = [
      item.filename,
      item.size,
      item.createdAt,
      item.metadata?.cameraMake,
      item.metadata?.cameraModel
    ].filter(Boolean);
    
    return CryptoJS.SHA256(identityFactors.join('|')).toString();
  }

  // 分析衝突
  async analyzeConflict(identity, items) {
    const conflictId = uuidv4();
    
    // 檢測衝突類型
    const conflictTypes = [];
    
    // 元數據衝突
    if (this.hasMetadataConflict(items)) {
      conflictTypes.push(CONFLICT_TYPES.METADATA_CONFLICT);
    }
    
    // 內容衝突
    if (this.hasContentConflict(items)) {
      conflictTypes.push(CONFLICT_TYPES.CONTENT_CONFLICT);
    }
    
    // 時間戳衝突
    if (this.hasTimestampConflict(items)) {
      conflictTypes.push(CONFLICT_TYPES.TIMESTAMP_CONFLICT);
    }
    
    // 版本衝突
    if (this.hasVersionConflict(items)) {
      conflictTypes.push(CONFLICT_TYPES.VERSION_CONFLICT);
    }
    
    if (conflictTypes.length === 0) {
      return null; // 沒有衝突
    }
    
    const conflict = {
      id: conflictId,
      identity,
      types: conflictTypes,
      items,
      severity: this.calculateConflictSeverity(conflictTypes, items),
      detectedAt: new Date().toISOString(),
      resolved: false,
      resolution: null
    };
    
    this.conflicts.set(conflictId, conflict);
    return conflict;
  }

  // 檢測元數據衝突
  hasMetadataConflict(items) {
    const metadataHashes = items.map(item => 
      CryptoJS.SHA256(JSON.stringify(item.metadata || {})).toString()
    );
    
    return new Set(metadataHashes).size > 1;
  }

  // 檢測內容衝突
  hasContentConflict(items) {
    const contentHashes = items.map(item => item.version?.hash || '');
    return new Set(contentHashes.filter(Boolean)).size > 1;
  }

  // 檢測時間戳衝突
  hasTimestampConflict(items) {
    const timestamps = items.map(item => 
      new Date(item.lastModified || item.createdAt).getTime()
    );
    
    const uniqueTimestamps = new Set(timestamps);
    return uniqueTimestamps.size > 1;
  }

  // 檢測版本衝突
  hasVersionConflict(items) {
    const versions = items.map(item => item.version?.timestamp || '');
    return new Set(versions.filter(Boolean)).size > 1;
  }

  // 計算衝突嚴重性
  calculateConflictSeverity(conflictTypes, items) {
    let severity = 1;
    
    // 根據衝突類型加權
    if (conflictTypes.includes(CONFLICT_TYPES.CONTENT_CONFLICT)) {
      severity += 3;
    }
    if (conflictTypes.includes(CONFLICT_TYPES.VERSION_CONFLICT)) {
      severity += 2;
    }
    if (conflictTypes.includes(CONFLICT_TYPES.METADATA_CONFLICT)) {
      severity += 1;
    }
    
    // 根據項目數量調整
    severity += Math.min(items.length - 2, 3);
    
    return Math.min(severity, 10);
  }

  // 解決衝突
  async resolveConflicts(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session || !session.stats.conflicts.length) return;
    
    const strategy = session.config.conflictResolution;
    let resolvedCount = 0;
    
    for (const conflict of session.stats.conflicts) {
      try {
        this.emit('sync-progress', {
          syncId,
          phase: 'resolving',
          message: `正在解決衝突: ${conflict.id}`
        });
        
        let resolution;
        
        if (strategy === RESOLUTION_STRATEGIES.MANUAL) {
          // 手動解決 - 添加到待解決隊列
          this.pendingResolutions.set(conflict.id, {
            syncId,
            conflict,
            addedAt: new Date().toISOString()
          });
          
          this.emit('conflict-requires-resolution', {
            syncId,
            conflictId: conflict.id,
            conflict
          });
          
          continue;
        } else {
          // 自動解決
          resolution = await this.automaticConflictResolution(conflict, strategy);
        }
        
        if (resolution) {
          conflict.resolved = true;
          conflict.resolution = resolution;
          conflict.resolvedAt = new Date().toISOString();
          
          resolvedCount++;
          this.statistics.automatedResolutions++;
          
          this.emit('conflict-resolved', {
            syncId,
            conflictId: conflict.id,
            resolution
          });
        }
        
      } catch (error) {
        session.stats.errors.push({
          conflictId: conflict.id,
          phase: 'resolution',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.statistics.conflictsResolved += resolvedCount;
    this.updateSyncProgress(syncId);
  }

  // 自動衝突解決
  async automaticConflictResolution(conflict, strategy) {
    const { items } = conflict;
    
    switch (strategy) {
      case RESOLUTION_STRATEGIES.LATEST_TIMESTAMP:
        return this.resolveByLatestTimestamp(items);
        
      case RESOLUTION_STRATEGIES.SOURCE_PRIORITY:
        return this.resolveBySourcePriority(items);
        
      case RESOLUTION_STRATEGIES.LARGEST_SIZE:
        return this.resolveByLargestSize(items);
        
      case RESOLUTION_STRATEGIES.HIGHEST_QUALITY:
        return this.resolveByHighestQuality(items);
        
      case RESOLUTION_STRATEGIES.MERGE_METADATA:
        return this.resolveByMergingMetadata(items);
        
      case RESOLUTION_STRATEGIES.KEEP_BOTH:
        return this.resolveByKeepingBoth(items);
        
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }
  }

  // 按最新時間戳解決
  resolveByLatestTimestamp(items) {
    const sorted = items.sort((a, b) => {
      const timeA = new Date(a.lastModified || a.createdAt).getTime();
      const timeB = new Date(b.lastModified || b.createdAt).getTime();
      return timeB - timeA;
    });
    
    return {
      strategy: RESOLUTION_STRATEGIES.LATEST_TIMESTAMP,
      selectedItem: sorted[0],
      reason: '選擇最新的項目'
    };
  }

  // 按來源優先級解決
  resolveBySourcePriority(items) {
    const priorityOrder = ['google_photos', 'flickr', 'facebook', 'instagram', '500px'];
    
    const sorted = items.sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.source);
      const priorityB = priorityOrder.indexOf(b.source);
      return priorityA - priorityB;
    });
    
    return {
      strategy: RESOLUTION_STRATEGIES.SOURCE_PRIORITY,
      selectedItem: sorted[0],
      reason: `選擇來源優先級最高的項目: ${sorted[0].source}`
    };
  }

  // 按最大尺寸解決
  resolveByLargestSize(items) {
    const sorted = items.sort((a, b) => (b.size || 0) - (a.size || 0));
    
    return {
      strategy: RESOLUTION_STRATEGIES.LARGEST_SIZE,
      selectedItem: sorted[0],
      reason: '選擇文件大小最大的項目'
    };
  }

  // 按最高質量解決
  resolveByHighestQuality(items) {
    const sorted = items.sort((a, b) => {
      const qualityA = this.calculateImageQuality(a);
      const qualityB = this.calculateImageQuality(b);
      return qualityB - qualityA;
    });
    
    return {
      strategy: RESOLUTION_STRATEGIES.HIGHEST_QUALITY,
      selectedItem: sorted[0],
      reason: '選擇圖像質量最高的項目'
    };
  }

  // 計算圖像質量分數
  calculateImageQuality(item) {
    let score = 0;
    
    // 基於尺寸
    if (item.width && item.height) {
      score += Math.sqrt(item.width * item.height) / 1000;
    }
    
    // 基於文件大小
    if (item.size) {
      score += item.size / (1024 * 1024); // MB
    }
    
    // 基於格式
    const formatScore = {
      'png': 10,
      'tiff': 9,
      'jpg': 7,
      'jpeg': 7,
      'webp': 6,
      'gif': 3
    };
    
    const format = item.format?.toLowerCase() || '';
    score += formatScore[format] || 0;
    
    return score;
  }

  // 通過合併元數據解決
  resolveByMergingMetadata(items) {
    const mergedItem = { ...items[0] };
    const mergedMetadata = {};
    
    // 合併所有項目的元數據
    for (const item of items) {
      if (item.metadata) {
        Object.assign(mergedMetadata, item.metadata);
      }
    }
    
    mergedItem.metadata = mergedMetadata;
    
    return {
      strategy: RESOLUTION_STRATEGIES.MERGE_METADATA,
      selectedItem: mergedItem,
      reason: '合併所有項目的元數據'
    };
  }

  // 保留雙方
  resolveByKeepingBoth(items) {
    return {
      strategy: RESOLUTION_STRATEGIES.KEEP_BOTH,
      selectedItems: items,
      reason: '保留所有衝突的項目'
    };
  }

  // 手動解決衝突
  async resolveConflictManually(conflictId, resolution) {
    const pendingResolution = this.pendingResolutions.get(conflictId);
    if (!pendingResolution) {
      throw new Error(`Conflict ${conflictId} not found in pending resolutions`);
    }
    
    const { syncId, conflict } = pendingResolution;
    
    conflict.resolved = true;
    conflict.resolution = {
      strategy: RESOLUTION_STRATEGIES.MANUAL,
      ...resolution,
      resolvedAt: new Date().toISOString()
    };
    
    this.pendingResolutions.delete(conflictId);
    this.statistics.manualResolutions++;
    this.statistics.conflictsResolved++;
    
    this.emit('conflict-resolved-manually', {
      syncId,
      conflictId,
      resolution: conflict.resolution
    });
    
    // 檢查是否可以繼續同步
    const session = this.syncSessions.get(syncId);
    if (session && this.areAllConflictsResolved(session)) {
      await this.applyChanges(syncId);
    }
  }

  // 檢查所有衝突是否已解決
  areAllConflictsResolved(session) {
    return session.stats.conflicts.every(conflict => conflict.resolved);
  }

  // 應用更改
  async applyChanges(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    this.emit('sync-progress', {
      syncId,
      phase: 'applying',
      message: '正在應用更改'
    });
    
    // 收集所有已解決的更改
    const changes = [];
    
    for (const conflict of session.stats.conflicts) {
      if (conflict.resolved && conflict.resolution) {
        const change = this.createChangeFromResolution(conflict);
        if (change) {
          changes.push(change);
        }
      }
    }
    
    // 應用更改
    for (const change of changes) {
      try {
        await this.applyChange(change);
        session.progress.syncedItems++;
        session.stats.changes.push(change);
        
        this.emit('change-applied', {
          syncId,
          changeId: change.id,
          type: change.type
        });
        
      } catch (error) {
        session.stats.errors.push({
          changeId: change.id,
          phase: 'apply',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        session.progress.skippedItems++;
      }
    }
    
    // 更新版本信息
    await this.updateVersionData(session);
    
    // 記錄到變更日誌
    await this.logChanges(syncId, changes);
    
    this.updateSyncProgress(syncId);
  }

  // 從解決方案創建更改
  createChangeFromResolution(conflict) {
    const { resolution } = conflict;
    
    if (resolution.strategy === RESOLUTION_STRATEGIES.KEEP_BOTH) {
      return null; // 不需要更改
    }
    
    return {
      id: uuidv4(),
      type: 'sync',
      conflictId: conflict.id,
      selectedItem: resolution.selectedItem,
      strategy: resolution.strategy,
      reason: resolution.reason,
      timestamp: new Date().toISOString()
    };
  }

  // 應用單個更改
  async applyChange(change) {
    const { selectedItem } = change;
    
    // 這裡實現具體的更改應用邏輯
    // 例如：更新數據庫、同步到其他平台等
    
    // 更新本地數據版本
    this.dataVersions.set(selectedItem.id, selectedItem.version);
    this.versionHashes.set(selectedItem.id, selectedItem.version.hash);
    
    this.emit('change-applied-successfully', {
      changeId: change.id,
      itemId: selectedItem.id
    });
  }

  // 完成同步會話
  async completeSyncSession(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    session.status = SYNC_STATUS.COMPLETED;
    session.endTime = new Date().toISOString();
    session.progress.percentage = 100;
    
    const duration = new Date(session.endTime) - new Date(session.startTime);
    
    // 更新統計
    this.statistics.totalSyncs++;
    this.statistics.successfulSyncs++;
    this.updateAverageSyncTime(duration);
    
    // 更新最後同步時間戳
    for (const platform of session.platforms) {
      this.lastSyncTimestamps.set(platform, session.endTime);
    }
    
    // 移出活動同步
    this.activeSyncs.delete(syncId);
    
    // 處理隊列中的下一個同步
    await this.processNextSync();
    
    // 持久化狀態
    await this.saveSyncState();
    
    this.emit('sync-completed', {
      syncId,
      duration,
      stats: session.stats,
      progress: session.progress
    });
  }

  // 失敗同步會話
  async failSyncSession(syncId, error) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    session.status = SYNC_STATUS.FAILED;
    session.endTime = new Date().toISOString();
    session.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    this.statistics.failedSyncs++;
    this.activeSyncs.delete(syncId);
    
    // 處理隊列中的下一個同步
    await this.processNextSync();
    
    this.emit('sync-failed', {
      syncId,
      error: error.message,
      stats: session.stats
    });
  }

  // 更新同步進度
  updateSyncProgress(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) return;
    
    const { totalItems, processedItems, syncedItems, skippedItems } = session.progress;
    
    if (totalItems > 0) {
      session.progress.percentage = Math.round(
        ((processedItems + syncedItems + skippedItems) / totalItems) * 100
      );
    }
    
    this.emit('sync-progress-updated', {
      syncId,
      progress: session.progress
    });
  }

  // 更新平均同步時間
  updateAverageSyncTime(duration) {
    const { successfulSyncs } = this.statistics;
    const currentAverage = this.statistics.averageSyncTime;
    
    this.statistics.averageSyncTime = 
      ((currentAverage * (successfulSyncs - 1)) + duration) / successfulSyncs;
  }

  // 處理隊列中的下一個同步
  async processNextSync() {
    if (this.syncQueue.length > 0 && this.activeSyncs.size < this.config.maxConcurrentSyncs) {
      const nextSession = this.syncQueue.shift();
      this.syncSessions.set(nextSession.id, nextSession);
      this.activeSyncs.add(nextSession.id);
      
      await this.executeSyncSession(nextSession.id);
    }
  }

  // 暫停同步
  async pauseSync(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) {
      throw new Error(`Sync session ${syncId} not found`);
    }
    
    if (session.status !== SYNC_STATUS.SYNCING) {
      throw new Error(`Cannot pause sync in status: ${session.status}`);
    }
    
    session.status = SYNC_STATUS.PAUSED;
    session.pausedAt = new Date().toISOString();
    
    this.emit('sync-paused', { syncId });
  }

  // 恢復同步
  async resumeSync(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) {
      throw new Error(`Sync session ${syncId} not found`);
    }
    
    if (session.status !== SYNC_STATUS.PAUSED) {
      throw new Error(`Cannot resume sync in status: ${session.status}`);
    }
    
    session.status = SYNC_STATUS.SYNCING;
    session.resumedAt = new Date().toISOString();
    
    this.emit('sync-resumed', { syncId });
    
    // 繼續執行同步
    await this.executeSyncSession(syncId);
  }

  // 取消同步
  async cancelSync(syncId) {
    const session = this.syncSessions.get(syncId);
    if (!session) {
      throw new Error(`Sync session ${syncId} not found`);
    }
    
    session.status = SYNC_STATUS.CANCELLED;
    session.endTime = new Date().toISOString();
    
    this.activeSyncs.delete(syncId);
    
    // 清理相關的待解決衝突
    for (const [conflictId, resolution] of this.pendingResolutions.entries()) {
      if (resolution.syncId === syncId) {
        this.pendingResolutions.delete(conflictId);
      }
    }
    
    this.emit('sync-cancelled', { syncId });
    
    // 處理隊列中的下一個同步
    await this.processNextSync();
  }

  // 啟動自動同步
  startAutoSync() {
    this.syncTimer = setInterval(async () => {
      try {
        // 檢查是否有需要同步的平台
        const platforms = await this.getPlatformsNeedingSync();
        
        if (platforms.length > 0) {
          await this.startSync(platforms, {
            type: SYNC_TYPES.INCREMENTAL
          });
        }
      } catch (error) {
        this.emit('auto-sync-error', error);
      }
    }, this.config.syncInterval);
  }

  // 停止自動同步
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // 獲取需要同步的平台
  async getPlatformsNeedingSync() {
    // 實現邏輯來確定哪些平台需要同步
    // 例如：檢查上次同步時間、檢測數據變化等
    return [];
  }

  // 啟動清理
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // 每24小時清理一次
  }

  // 清理舊數據
  cleanupOldData() {
    const cutoff = Date.now() - this.config.changelogRetention;
    
    // 清理舊的變更日誌
    this.changelog = this.changelog.filter(entry => 
      new Date(entry.timestamp).getTime() > cutoff
    );
    
    // 清理已完成的同步會話
    for (const [syncId, session] of this.syncSessions.entries()) {
      if (
        (session.status === SYNC_STATUS.COMPLETED || 
         session.status === SYNC_STATUS.FAILED ||
         session.status === SYNC_STATUS.CANCELLED) &&
        new Date(session.endTime).getTime() < cutoff
      ) {
        this.syncSessions.delete(syncId);
      }
    }
    
    this.emit('cleanup-completed', {
      changelogEntries: this.changelog.length,
      activeSessions: this.syncSessions.size
    });
  }

  // 記錄變更
  async logChanges(syncId, changes) {
    const logEntry = {
      id: uuidv4(),
      syncId,
      timestamp: new Date().toISOString(),
      changes: changes.map(change => ({
        id: change.id,
        type: change.type,
        strategy: change.strategy,
        reason: change.reason
      }))
    };
    
    this.changelog.push(logEntry);
    
    this.emit('changes-logged', {
      syncId,
      logEntryId: logEntry.id,
      changeCount: changes.length
    });
  }

  // 更新版本數據
  async updateVersionData(session) {
    for (const change of session.stats.changes) {
      if (change.selectedItem) {
        const { id, version } = change.selectedItem;
        this.dataVersions.set(id, version);
        this.versionHashes.set(id, version.hash);
      }
    }
  }

  // 載入同步狀態
  async loadSyncState() {
    // 實現從存儲載入同步狀態
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = localStorage.getItem('sync_state');
        if (data) {
          const state = JSON.parse(data);
          this.lastSyncTimestamps = new Map(state.lastSyncTimestamps || []);
          this.statistics = { ...this.statistics, ...state.statistics };
        }
      } catch (error) {
        console.warn('Failed to load sync state:', error);
      }
    }
  }

  // 保存同步狀態
  async saveSyncState() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const state = {
          lastSyncTimestamps: Array.from(this.lastSyncTimestamps.entries()),
          statistics: this.statistics
        };
        localStorage.setItem('sync_state', JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to save sync state:', error);
      }
    }
  }

  // 載入版本數據
  async loadVersionData() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = localStorage.getItem('version_data');
        if (data) {
          const versions = JSON.parse(data);
          this.dataVersions = new Map(versions.dataVersions || []);
          this.versionHashes = new Map(versions.versionHashes || []);
        }
      } catch (error) {
        console.warn('Failed to load version data:', error);
      }
    }
  }

  // 載入變更日誌
  async loadChangelog() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = localStorage.getItem('sync_changelog');
        if (data) {
          this.changelog = JSON.parse(data);
        }
      } catch (error) {
        console.warn('Failed to load changelog:', error);
      }
    }
  }

  // 獲取同步狀態
  getSyncStatus(syncId) {
    return this.syncSessions.get(syncId);
  }

  // 獲取所有同步會話
  getAllSyncSessions() {
    return Array.from(this.syncSessions.values());
  }

  // 獲取活動同步
  getActiveSyncs() {
    return Array.from(this.activeSyncs).map(syncId => 
      this.syncSessions.get(syncId)
    ).filter(Boolean);
  }

  // 獲取待解決衝突
  getPendingConflicts() {
    return Array.from(this.pendingResolutions.values());
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      ...this.statistics,
      activeSyncs: this.activeSyncs.size,
      queuedSyncs: this.syncQueue.length,
      pendingConflicts: this.pendingResolutions.size,
      changelogEntries: this.changelog.length
    };
  }

  // 關閉同步管理器
  async shutdown() {
    // 停止自動同步
    this.stopAutoSync();
    
    // 清理定時器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // 取消所有活動同步
    for (const syncId of this.activeSyncs) {
      await this.cancelSync(syncId);
    }
    
    // 保存狀態
    await this.saveSyncState();
    
    this.emit('shutdown');
  }
}

export default SyncManager;