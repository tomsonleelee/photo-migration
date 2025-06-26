// 遷移歷史組件 - 查看和分析過往遷移記錄
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

// 遷移狀態
const MIGRATION_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// 狀態顏色
const STATUS_COLORS = {
  [MIGRATION_STATUS.COMPLETED]: 'text-green-600 bg-green-100',
  [MIGRATION_STATUS.FAILED]: 'text-red-600 bg-red-100',
  [MIGRATION_STATUS.IN_PROGRESS]: 'text-blue-600 bg-blue-100',
  [MIGRATION_STATUS.CANCELLED]: 'text-gray-600 bg-gray-100',
  [MIGRATION_STATUS.PAUSED]: 'text-yellow-600 bg-yellow-100'
};

const STATUS_LABELS = {
  [MIGRATION_STATUS.COMPLETED]: '已完成',
  [MIGRATION_STATUS.FAILED]: '失敗',
  [MIGRATION_STATUS.IN_PROGRESS]: '進行中',
  [MIGRATION_STATUS.CANCELLED]: '已取消',
  [MIGRATION_STATUS.PAUSED]: '已暫停'
};

export const MigrationHistory = ({
  className = '',
  itemsPerPage = 10,
  onMigrationSelect,
  enableFilters = true,
  enableExport = true
}) => {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMigration, setSelectedMigration] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // 分頁和篩選狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    status: '',
    platform: '',
    dateRange: '',
    searchQuery: ''
  });

  // 載入遷移歷史
  const loadMigrationHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 模擬 API 呼叫載入遷移歷史
      const mockMigrations = await generateMockMigrationHistory();
      setMigrations(mockMigrations);
      
    } catch (error) {
      console.error('Failed to load migration history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 生成模擬遷移歷史
  const generateMockMigrationHistory = async () => {
    const platforms = ['Google Photos', 'Flickr', 'Instagram', 'Facebook', '500px'];
    const statuses = Object.values(MIGRATION_STATUS);
    const migrations = [];
    
    for (let i = 0; i < 50; i++) {
      const startTime = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const duration = Math.random() * 3600000 + 300000; // 5分鐘到1小時
      const endTime = new Date(startTime.getTime() + duration);
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const filesTotal = Math.floor(Math.random() * 2000) + 100;
      const filesProcessed = status === MIGRATION_STATUS.COMPLETED ? 
        filesTotal : Math.floor(Math.random() * filesTotal);
      
      migrations.push({
        id: `migration_${i + 1}`,
        platform,
        status,
        startTime: startTime.toISOString(),
        endTime: status === MIGRATION_STATUS.IN_PROGRESS ? null : endTime.toISOString(),
        duration: status === MIGRATION_STATUS.IN_PROGRESS ? null : duration,
        filesTotal,
        filesProcessed,
        filesSkipped: Math.floor(Math.random() * 50),
        filesFailed: status === MIGRATION_STATUS.COMPLETED ? 
          Math.floor(Math.random() * 10) : Math.floor(Math.random() * 100),
        bytesTransferred: Math.floor(Math.random() * 10000000000) + 1000000000,
        successRate: filesProcessed / filesTotal,
        errorCount: Math.floor(Math.random() * 20),
        warnings: Math.floor(Math.random() * 30),
        albumsProcessed: Math.floor(Math.random() * 50) + 1,
        userId: `user_${Math.floor(Math.random() * 100) + 1}`,
        configuration: {
          includeAlbums: Math.random() > 0.5,
          includeSharedPhotos: Math.random() > 0.5,
          qualityPreference: ['original', 'high', 'medium'][Math.floor(Math.random() * 3)],
          duplicateHandling: ['skip', 'rename', 'overwrite'][Math.floor(Math.random() * 3)]
        },
        errors: generateMockErrors(Math.floor(Math.random() * 10)),
        performance: {
          averageSpeed: Math.random() * 10 + 1, // MB/s
          peakSpeed: Math.random() * 20 + 5,
          averageLatency: Math.random() * 1000 + 100,
          retryCount: Math.floor(Math.random() * 10)
        }
      });
    }
    
    return migrations.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  };

  // 生成模擬錯誤
  const generateMockErrors = (count) => {
    const errorTypes = [
      'Network timeout',
      'Authentication failed', 
      'File not found',
      'Permission denied',
      'Quota exceeded',
      'Invalid file format'
    ];
    
    const errors = [];
    for (let i = 0; i < count; i++) {
      errors.push({
        type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        message: `Error message ${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        file: `photo_${Math.floor(Math.random() * 1000)}.jpg`,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      });
    }
    return errors;
  };

  // 初始載入
  useEffect(() => {
    loadMigrationHistory();
  }, [loadMigrationHistory]);

  // 篩選和排序的遷移列表
  const filteredAndSortedMigrations = useMemo(() => {
    let filtered = migrations;

    // 應用篩選
    if (filters.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }
    
    if (filters.platform) {
      filtered = filtered.filter(m => m.platform === filters.platform);
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.id.toLowerCase().includes(query) ||
        m.platform.toLowerCase().includes(query) ||
        m.userId.toLowerCase().includes(query)
      );
    }
    
    if (filters.dateRange) {
      const now = new Date();
      let cutoff;
      
      switch (filters.dateRange) {
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = null;
      }
      
      if (cutoff) {
        filtered = filtered.filter(m => new Date(m.startTime) >= cutoff);
      }
    }

    // 應用排序
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'startTime' || sortBy === 'endTime') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [migrations, filters, sortBy, sortOrder]);

  // 分頁數據
  const paginatedMigrations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedMigrations.slice(startIndex, endIndex);
  }, [filteredAndSortedMigrations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedMigrations.length / itemsPerPage);

  // 格式化數值
  const formatValue = useCallback((value, type = 'number') => {
    if (value == null) return 'N/A';
    
    switch (type) {
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      
      case 'duration':
        if (!value) return 'N/A';
        const hours = Math.floor(value / 3600000);
        const minutes = Math.floor((value % 3600000) / 60000);
        const seconds = Math.floor((value % 60000) / 1000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
      
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      
      case 'speed':
        return `${value.toFixed(1)} MB/s`;
      
      default:
        return typeof value === 'number' ? value.toLocaleString() : value;
    }
  }, []);

  // 處理排序
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 查看詳情
  const handleViewDetails = (migration) => {
    setSelectedMigration(migration);
    setShowDetails(true);
    if (onMigrationSelect) {
      onMigrationSelect(migration);
    }
  };

  // 渲染狀態徽章
  const renderStatusBadge = (status) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );

  // 渲染篩選器
  const renderFilters = () => {
    if (!enableFilters) return null;

    const platforms = [...new Set(migrations.map(m => m.platform))];

    return (
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜尋 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜尋</label>
            <input
              type="text"
              placeholder="搜尋 ID、平台或用戶..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 狀態篩選 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有狀態</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* 平台篩選 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有平台</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          {/* 時間範圍 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">時間範圍</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有時間</option>
              <option value="24h">最近 24 小時</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </div>
        </div>

        {/* 清除篩選器 */}
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ status: '', platform: '', dateRange: '', searchQuery: '' })}
          >
            清除篩選
          </Button>
        </div>
      </Card>
    );
  };

  // 渲染遷移列表
  const renderMigrationList = () => (
    <div className="space-y-4">
      {paginatedMigrations.map((migration, index) => (
        <motion.div
          key={migration.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(migration)}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {migration.platform} 遷移
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>ID: {migration.id}</span>
                  <span>用戶: {migration.userId}</span>
                  <span>開始時間: {new Date(migration.startTime).toLocaleString('zh-TW')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {renderStatusBadge(migration.status)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(migration);
                  }}
                >
                  查看詳情
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">處理檔案:</span>
                <div className="text-gray-900">
                  {migration.filesProcessed.toLocaleString()} / {migration.filesTotal.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">成功率:</span>
                <div className="text-gray-900">{formatValue(migration.successRate, 'percentage')}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">傳輸數據:</span>
                <div className="text-gray-900">{formatValue(migration.bytesTransferred, 'bytes')}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">耗時:</span>
                <div className="text-gray-900">{formatValue(migration.duration, 'duration')}</div>
              </div>
            </div>

            {/* 進度條 */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>進度</span>
                <span>{formatValue(migration.successRate, 'percentage')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    migration.status === MIGRATION_STATUS.COMPLETED ? 'bg-green-500' :
                    migration.status === MIGRATION_STATUS.FAILED ? 'bg-red-500' :
                    migration.status === MIGRATION_STATUS.IN_PROGRESS ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${migration.successRate * 100}%` }}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // 渲染分頁
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          顯示 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedMigrations.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedMigrations.length)} 
          ，共 {filteredAndSortedMigrations.length} 筆記錄
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            上一頁
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            下一頁
          </Button>
        </div>
      </div>
    );
  };

  // 渲染詳情模態框
  const renderDetailsModal = () => (
    <Modal
      isOpen={showDetails}
      onClose={() => setShowDetails(false)}
      title={`遷移詳情 - ${selectedMigration?.id}`}
      size="large"
    >
      {selectedMigration && (
        <div className="space-y-6">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">基本資訊</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">遷移 ID:</span>
                  <span className="text-gray-900">{selectedMigration.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平台:</span>
                  <span className="text-gray-900">{selectedMigration.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">狀態:</span>
                  {renderStatusBadge(selectedMigration.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">用戶 ID:</span>
                  <span className="text-gray-900">{selectedMigration.userId}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">時間資訊</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">開始時間:</span>
                  <span className="text-gray-900">
                    {new Date(selectedMigration.startTime).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">結束時間:</span>
                  <span className="text-gray-900">
                    {selectedMigration.endTime ? 
                      new Date(selectedMigration.endTime).toLocaleString('zh-TW') : 
                      'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">耗時:</span>
                  <span className="text-gray-900">
                    {formatValue(selectedMigration.duration, 'duration')}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* 處理統計 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">處理統計</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedMigration.filesTotal.toLocaleString()}
                </div>
                <div className="text-gray-600">總檔案數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {selectedMigration.filesProcessed.toLocaleString()}
                </div>
                <div className="text-gray-600">已處理</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {selectedMigration.filesFailed.toLocaleString()}
                </div>
                <div className="text-gray-600">失敗</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {selectedMigration.filesSkipped.toLocaleString()}
                </div>
                <div className="text-gray-600">跳過</div>
              </div>
            </div>
          </Card>

          {/* 性能指標 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">性能指標</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">平均速度:</span>
                <div className="font-medium text-gray-900">
                  {formatValue(selectedMigration.performance.averageSpeed, 'speed')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">峰值速度:</span>
                <div className="font-medium text-gray-900">
                  {formatValue(selectedMigration.performance.peakSpeed, 'speed')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">平均延遲:</span>
                <div className="font-medium text-gray-900">
                  {selectedMigration.performance.averageLatency.toFixed(0)}ms
                </div>
              </div>
              <div>
                <span className="text-gray-600">重試次數:</span>
                <div className="font-medium text-gray-900">
                  {selectedMigration.performance.retryCount}
                </div>
              </div>
            </div>
          </Card>

          {/* 錯誤日誌 */}
          {selectedMigration.errors && selectedMigration.errors.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">錯誤日誌</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedMigration.errors.map((error, index) => (
                  <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-red-800">{error.type}</span>
                      <span className="text-xs text-red-600">
                        {new Date(error.timestamp).toLocaleString('zh-TW')}
                      </span>
                    </div>
                    <div className="text-red-700 mt-1">{error.message}</div>
                    {error.file && (
                      <div className="text-xs text-red-600 mt-1">檔案: {error.file}</div>
                    )}
                  </div>
                ))}
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
          <p className="text-gray-600">載入遷移歷史...</p>
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
        <Button onClick={loadMigrationHistory}>
          重試
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 標題和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">遷移歷史</h2>
          <p className="text-gray-600 mt-1">查看和分析過往遷移記錄</p>
        </div>
        <div className="flex items-center space-x-3">
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* 實現匯出功能 */}}
            >
              匯出歷史
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadMigrationHistory}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 篩選器 */}
      {renderFilters()}

      {/* 遷移列表 */}
      <AnimatePresence>
        {filteredAndSortedMigrations.length > 0 ? (
          <div>
            {renderMigrationList()}
            {renderPagination()}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">沒有找到遷移記錄</h3>
              <p className="text-sm">
                {Object.values(filters).some(f => f) ? 
                  '請調整篩選條件或清除篩選器' : 
                  '還沒有任何遷移記錄'
                }
              </p>
            </div>
          </Card>
        )}
      </AnimatePresence>

      {/* 詳情模態框 */}
      {renderDetailsModal()}
    </div>
  );
};

export default MigrationHistory;