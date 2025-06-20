// 日誌查看器組件 - 遷移日誌的過濾和搜尋功能
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';

// 日誌級別
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// 日誌級別顏色
const LOG_LEVEL_COLORS = {
  [LOG_LEVELS.DEBUG]: 'text-gray-600 bg-gray-100',
  [LOG_LEVELS.INFO]: 'text-blue-600 bg-blue-100',
  [LOG_LEVELS.WARN]: 'text-yellow-600 bg-yellow-100',
  [LOG_LEVELS.ERROR]: 'text-red-600 bg-red-100',
  [LOG_LEVELS.CRITICAL]: 'text-purple-600 bg-purple-100'
};

const LOG_LEVEL_LABELS = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.CRITICAL]: 'CRITICAL'
};

// 日誌類別
const LOG_CATEGORIES = {
  MIGRATION: 'migration',
  API: 'api',
  AUTH: 'auth',
  FILE_PROCESSING: 'file_processing',
  SYNC: 'sync',
  BATCH: 'batch',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  SYSTEM: 'system'
};

export const LogViewer = ({
  migrationId,
  className = '',
  realTimeUpdates = false,
  maxLogs = 1000,
  enableExport = true,
  enableSearch = true,
  enableFilters = true
}) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // 搜尋和篩選狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    timeRange: '',
    source: ''
  });
  
  // 顯示設定
  const [displaySettings, setDisplaySettings] = useState({
    showTimestamp: true,
    showLevel: true,
    showCategory: true,
    showSource: true,
    autoScroll: true,
    wordWrap: true,
    highlightSearch: true
  });
  
  // 分頁和虛擬化
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [isAtBottom, setIsAtBottom] = useState(true);
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);

  // 載入日誌
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 模擬 API 呼叫載入日誌
      const mockLogs = await generateMockLogs(migrationId);
      setLogs(mockLogs);
      
    } catch (error) {
      console.error('Failed to load logs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [migrationId]);

  // 生成模擬日誌
  const generateMockLogs = async (migrationId) => {
    const levels = Object.values(LOG_LEVELS);
    const categories = Object.values(LOG_CATEGORIES);
    const sources = ['Migration Engine', 'API Client', 'File Processor', 'Sync Manager', 'Batch Manager'];
    
    const messages = {
      [LOG_LEVELS.DEBUG]: [
        'Processing file: {filename}',
        'API request: {method} {url}',
        'Cache hit for key: {key}',
        'Worker thread {id} started',
        'Memory usage: {usage}MB'
      ],
      [LOG_LEVELS.INFO]: [
        'Migration started for platform: {platform}',
        'File uploaded successfully: {filename}',
        'Authentication completed for user: {userId}',
        'Batch processing completed: {count} files',
        'Sync operation completed'
      ],
      [LOG_LEVELS.WARN]: [
        'Rate limit approaching for API: {api}',
        'File already exists, skipping: {filename}',
        'Slow response from API: {duration}ms',
        'Memory usage high: {usage}%',
        'Retry attempt {attempt} for operation'
      ],
      [LOG_LEVELS.ERROR]: [
        'Failed to upload file: {filename} - {error}',
        'API authentication failed',
        'Network timeout for request',
        'File processing error: {error}',
        'Database connection failed'
      ],
      [LOG_LEVELS.CRITICAL]: [
        'System out of memory',
        'Database connection lost',
        'Critical authentication failure',
        'File system full',
        'Security breach detected'
      ]
    };

    const logs = [];
    const startTime = Date.now() - 24 * 60 * 60 * 1000; // 24小時前
    
    for (let i = 0; i < 500; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const timestamp = new Date(startTime + Math.random() * 24 * 60 * 60 * 1000);
      
      const messageTemplates = messages[level];
      let message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
      
      // 替換模板變數
      message = message
        .replace('{filename}', `photo_${Math.floor(Math.random() * 1000)}.jpg`)
        .replace('{platform}', ['Google Photos', 'Flickr', 'Instagram'][Math.floor(Math.random() * 3)])
        .replace('{userId}', `user_${Math.floor(Math.random() * 100)}`)
        .replace('{method}', ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)])
        .replace('{url}', '/api/photos/upload')
        .replace('{key}', `cache_key_${Math.floor(Math.random() * 1000)}`)
        .replace('{id}', Math.floor(Math.random() * 10))
        .replace('{usage}', Math.floor(Math.random() * 1000) + 100)
        .replace('{count}', Math.floor(Math.random() * 100) + 10)
        .replace('{api}', 'Google Photos API')
        .replace('{duration}', Math.floor(Math.random() * 5000) + 1000)
        .replace('{attempt}', Math.floor(Math.random() * 5) + 1)
        .replace('{error}', 'Network timeout');

      logs.push({
        id: `log_${i + 1}`,
        timestamp: timestamp.toISOString(),
        level,
        category,
        source,
        message,
        migrationId: migrationId || `migration_${Math.floor(Math.random() * 10) + 1}`,
        contextData: {
          threadId: Math.floor(Math.random() * 10) + 1,
          sessionId: `session_${Math.floor(Math.random() * 100)}`,
          correlationId: `corr_${Math.floor(Math.random() * 1000)}`,
          metadata: {
            fileSize: level === LOG_LEVELS.DEBUG ? Math.floor(Math.random() * 10000000) : undefined,
            duration: level === LOG_LEVELS.INFO ? Math.floor(Math.random() * 5000) : undefined,
            retryCount: level === LOG_LEVELS.ERROR ? Math.floor(Math.random() * 3) : undefined
          }
        },
        stackTrace: level === LOG_LEVELS.ERROR || level === LOG_LEVELS.CRITICAL ? 
          generateMockStackTrace() : null
      });
    }
    
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // 生成模擬堆疊追蹤
  const generateMockStackTrace = () => {
    const stackLines = [
      'at PhotoProcessor.processFile (src/services/PhotoProcessor.js:123:15)',
      'at FileUploader.upload (src/services/FileUploader.js:87:22)',
      'at MigrationEngine.processPhoto (src/services/MigrationEngine.js:245:18)',
      'at BatchProcessor.processBatch (src/services/BatchProcessor.js:156:12)',
      'at MigrationController.startMigration (src/controllers/MigrationController.js:89:25)'
    ];
    
    return stackLines.slice(0, Math.floor(Math.random() * stackLines.length) + 2).join('\n');
  };

  // 初始載入
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 即時更新
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      // 模擬新日誌
      const newLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: Object.values(LOG_LEVELS)[Math.floor(Math.random() * Object.values(LOG_LEVELS).length)],
        category: Object.values(LOG_CATEGORIES)[Math.floor(Math.random() * Object.values(LOG_CATEGORIES).length)],
        source: 'Migration Engine',
        message: `Real-time log message at ${new Date().toLocaleTimeString()}`,
        migrationId: migrationId || 'current',
        contextData: {}
      };

      setLogs(prevLogs => [newLog, ...prevLogs.slice(0, maxLogs - 1)]);
    }, 2000);

    return () => clearInterval(interval);
  }, [realTimeUpdates, migrationId, maxLogs]);

  // 過濾和搜尋日誌
  useEffect(() => {
    let filtered = logs;

    // 應用篩選器
    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }
    
    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }
    
    if (filters.source) {
      filtered = filtered.filter(log => log.source === filters.source);
    }
    
    if (filters.timeRange) {
      const now = new Date();
      let cutoff;
      
      switch (filters.timeRange) {
        case '1h':
          cutoff = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = null;
      }
      
      if (cutoff) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= cutoff);
      }
    }

    // 應用搜尋
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        log.id.toLowerCase().includes(query) ||
        (log.stackTrace && log.stackTrace.toLowerCase().includes(query))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filters, searchQuery]);

  // 自動滾動到底部
  useEffect(() => {
    if (displaySettings.autoScroll && isAtBottom && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, displaySettings.autoScroll, isAtBottom]);

  // 處理滾動
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(isNearBottom);
  }, []);

  // 格式化時間戳
  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }, []);

  // 高亮搜尋關鍵字
  const highlightSearchQuery = useCallback((text) => {
    if (!searchQuery || !displaySettings.highlightSearch) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [searchQuery, displaySettings.highlightSearch]);

  // 渲染日誌級別徽章
  const renderLevelBadge = (level) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${LOG_LEVEL_COLORS[level]}`}>
      {LOG_LEVEL_LABELS[level]}
    </span>
  );

  // 渲染篩選器
  const renderFilters = () => {
    if (!enableFilters) return null;

    const uniqueSources = [...new Set(logs.map(log => log.source))];

    return (
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* 日誌級別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">級別</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有級別</option>
              {Object.entries(LOG_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* 類別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有類別</option>
              {Object.values(LOG_CATEGORIES).map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 來源 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">來源</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有來源</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* 時間範圍 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">時間範圍</label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有時間</option>
              <option value="1h">最近 1 小時</option>
              <option value="24h">最近 24 小時</option>
              <option value="7d">最近 7 天</option>
            </select>
          </div>
        </div>

        {/* 搜尋框 */}
        {enableSearch && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜尋</label>
            <input
              type="text"
              placeholder="搜尋訊息、來源、類別或 ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 顯示設定 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={displaySettings.autoScroll}
                onChange={(e) => setDisplaySettings(prev => ({ ...prev, autoScroll: e.target.checked }))}
                className="mr-2"
              />
              自動滾動
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={displaySettings.wordWrap}
                onChange={(e) => setDisplaySettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                className="mr-2"
              />
              自動換行
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={displaySettings.highlightSearch}
                onChange={(e) => setDisplaySettings(prev => ({ ...prev, highlightSearch: e.target.checked }))}
                className="mr-2"
              />
              高亮搜尋
            </label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({ level: '', category: '', timeRange: '', source: '' });
              setSearchQuery('');
            }}
          >
            清除篩選
          </Button>
        </div>
      </Card>
    );
  };

  // 渲染日誌條目
  const renderLogEntry = (log, index) => (
    <motion.div
      key={log.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`border-l-4 pl-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
        log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.CRITICAL 
          ? 'border-red-500' 
          : log.level === LOG_LEVELS.WARN 
          ? 'border-yellow-500'
          : 'border-gray-300'
      }`}
      onClick={() => {
        setSelectedLog(log);
        setShowDetails(true);
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 標頭資訊 */}
          <div className="flex items-center space-x-3 mb-1">
            {displaySettings.showTimestamp && (
              <span className="text-xs text-gray-500 font-mono">
                {formatTimestamp(log.timestamp)}
              </span>
            )}
            {displaySettings.showLevel && renderLevelBadge(log.level)}
            {displaySettings.showCategory && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {log.category.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {displaySettings.showSource && (
              <span className="text-xs text-blue-600">
                {log.source}
              </span>
            )}
          </div>
          
          {/* 訊息內容 */}
          <div className={`text-sm text-gray-900 ${
            displaySettings.wordWrap ? 'break-words' : 'truncate'
          }`}>
            {highlightSearchQuery(log.message)}
          </div>
          
          {/* 額外資訊 */}
          {log.contextData && (
            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
              {log.contextData.threadId && (
                <span>Thread: {log.contextData.threadId}</span>
              )}
              {log.contextData.sessionId && (
                <span>Session: {log.contextData.sessionId}</span>
              )}
              {log.migrationId && (
                <span>Migration: {log.migrationId}</span>
              )}
            </div>
          )}
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex items-center space-x-2 ml-4">
          {log.stackTrace && (
            <div className="w-2 h-2 bg-red-500 rounded-full" title="包含堆疊追蹤" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLog(log);
              setShowDetails(true);
            }}
          >
            詳情
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // 渲染詳情模態框
  const renderDetailsModal = () => (
    <Modal
      isOpen={showDetails}
      onClose={() => setShowDetails(false)}
      title={`日誌詳情 - ${selectedLog?.id}`}
      size="large"
    >
      {selectedLog && (
        <div className="space-y-4">
          {/* 基本資訊 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">基本資訊</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">時間戳:</span>
                <div className="text-gray-900 font-mono">
                  {formatTimestamp(selectedLog.timestamp)}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">級別:</span>
                <div className="mt-1">{renderLevelBadge(selectedLog.level)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">類別:</span>
                <div className="text-gray-900">
                  {selectedLog.category.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">來源:</span>
                <div className="text-gray-900">{selectedLog.source}</div>
              </div>
            </div>
          </Card>

          {/* 訊息內容 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">訊息內容</h4>
            <div className="bg-gray-50 p-3 rounded border text-sm font-mono break-words">
              {selectedLog.message}
            </div>
          </Card>

          {/* 上下文數據 */}
          {selectedLog.contextData && Object.keys(selectedLog.contextData).length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">上下文數據</h4>
              <div className="bg-gray-50 p-3 rounded border">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(selectedLog.contextData, null, 2)}
                </pre>
              </div>
            </Card>
          )}

          {/* 堆疊追蹤 */}
          {selectedLog.stackTrace && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">堆疊追蹤</h4>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <pre className="text-xs text-red-700 font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.stackTrace}
                </pre>
              </div>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入日誌...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="text-red-500 mb-4">
          <div className="text-4xl mb-2">❌</div>
          <h3 className="text-lg font-medium">載入失敗</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
        <Button onClick={loadLogs}>
          重試
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 標題和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">日誌查看器</h2>
          <p className="text-sm text-gray-600 mt-1">
            {migrationId ? `遷移 ${migrationId} 的日誌` : '所有遷移日誌'} 
            ({filteredLogs.length.toLocaleString()} / {logs.length.toLocaleString()})
            {realTimeUpdates && (
              <span className="ml-2 inline-flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                即時更新
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* 實現匯出功能 */}}
            >
              匯出日誌
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 篩選器 */}
      {renderFilters()}

      {/* 日誌容器 */}
      <Card className="overflow-hidden">
        <div
          ref={logContainerRef}
          className="h-96 overflow-y-auto border-t"
          onScroll={handleScroll}
        >
          <div className="p-4 space-y-1">
            <AnimatePresence>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => renderLogEntry(log, index))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-medium mb-2">沒有找到日誌</h3>
                  <p className="text-sm">
                    {searchQuery || Object.values(filters).some(f => f) ? 
                      '請調整搜尋或篩選條件' : 
                      '還沒有任何日誌記錄'
                    }
                  </p>
                </div>
              )}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </Card>

      {/* 詳情模態框 */}
      {renderDetailsModal()}
    </div>
  );
};

export default LogViewer;