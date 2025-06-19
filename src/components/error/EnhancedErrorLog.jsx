import { useState, useMemo, useCallback } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Download,
  Trash2,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  CheckCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useError } from '../../contexts/ErrorContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const EnhancedErrorLog = ({ 
  className = '',
  maxHeight = '600px',
  showStats = true,
  showControls = true,
  compactMode = false
}) => {
  const { 
    state, 
    retryError, 
    dismissError, 
    dismissErrors, 
    clearErrors, 
    getFilteredErrors 
  } = useError();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [timeRange, setTimeRange] = useState('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState([]);
  const [detailsModalError, setDetailsModalError] = useState(null);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // 錯誤過濾和排序
  const filteredErrors = useMemo(() => {
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      'all': null
    };

    const filters = {
      category: selectedCategories.length > 0 ? selectedCategories : undefined,
      severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      timeRange: timeRangeMs[timeRange],
      includeDismissed: showDismissed
    };

    let errors = getFilteredErrors(filters);

    // 搜尋過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      errors = errors.filter(error =>
        error.error.message.toLowerCase().includes(term) ||
        error.error.code.toLowerCase().includes(term) ||
        error.context.component.toLowerCase().includes(term) ||
        error.context.operation.toLowerCase().includes(term)
      );
    }

    // 排序
    errors.sort((a, b) => {
      let aValue = a[sortBy === 'timestamp' ? 'context' : sortBy];
      let bValue = b[sortBy === 'timestamp' ? 'context' : sortBy];

      if (sortBy === 'timestamp') {
        aValue = new Date(aValue.timestamp);
        bValue = new Date(bValue.timestamp);
      } else if (sortBy === 'severity') {
        const severityOrder = { info: 0, warning: 1, error: 2, critical: 3 };
        aValue = severityOrder[a.severity];
        bValue = severityOrder[b.severity];
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return errors;
  }, [
    getFilteredErrors, 
    selectedCategories, 
    selectedSeverities, 
    selectedStatuses, 
    timeRange, 
    showDismissed, 
    searchTerm,
    sortBy,
    sortOrder
  ]);

  // 錯誤統計
  const errorStats = useMemo(() => {
    const stats = {
      total: filteredErrors.length,
      byCategory: {},
      bySeverity: {},
      byStatus: {},
      retryable: 0,
      recentErrors: filteredErrors.filter(e => 
        new Date() - new Date(e.context.timestamp) < 60 * 60 * 1000
      ).length
    };

    filteredErrors.forEach(error => {
      // 分類統計
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      
      // 嚴重程度統計
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // 狀態統計
      stats.byStatus[error.status] = (stats.byStatus[error.status] || 0) + 1;
      
      // 可重試錯誤
      if (error.error.retryable) {
        stats.retryable++;
      }
    });

    return stats;
  }, [filteredErrors]);

  // 處理錯誤重試
  const handleRetryError = useCallback(async (errorId) => {
    const error = state.errors.find(e => e.id === errorId);
    if (error && error.context.retryOperation) {
      await retryError(errorId, error.context.retryOperation);
    }
  }, [state.errors, retryError]);

  // 批量操作
  const handleBulkDismiss = useCallback(() => {
    if (selectedErrors.length > 0) {
      dismissErrors(selectedErrors);
      setSelectedErrors([]);
    }
  }, [selectedErrors, dismissErrors]);

  const handleSelectAll = useCallback(() => {
    if (selectedErrors.length === filteredErrors.length) {
      setSelectedErrors([]);
    } else {
      setSelectedErrors(filteredErrors.map(e => e.id));
    }
  }, [selectedErrors, filteredErrors]);

  // 導出錯誤日誌
  const handleExportErrors = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      errors: filteredErrors.map(error => ({
        ...error,
        error: error.error.toJSON ? error.error.toJSON() : error.error
      })),
      stats: errorStats,
      filters: {
        searchTerm,
        selectedCategories,
        selectedSeverities,
        selectedStatuses,
        timeRange,
        showDismissed
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredErrors, errorStats, searchTerm, selectedCategories, selectedSeverities, selectedStatuses, timeRange, showDismissed]);

  // 複製錯誤詳情
  const copyErrorDetails = useCallback((error) => {
    const details = JSON.stringify({
      message: error.error.message,
      code: error.error.code,
      timestamp: error.context.timestamp,
      component: error.context.component,
      operation: error.context.operation,
      stack: error.error.stack
    }, null, 2);

    navigator.clipboard.writeText(details);
  }, []);

  // 嚴重程度圖標
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // 狀態圖標
  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'dismissed':
        return <EyeOff className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 標題和統計 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">錯誤日誌</h3>
          {showStats && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">
                總計: <span className="font-medium">{errorStats.total}</span>
              </span>
              <span className="text-red-600">
                可重試: <span className="font-medium">{errorStats.retryable}</span>
              </span>
              <span className="text-blue-600">
                最近1小時: <span className="font-medium">{errorStats.recentErrors}</span>
              </span>
            </div>
          )}
        </div>

        {/* 搜尋和過濾 */}
        {showControls && (
          <div className="space-y-3">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜尋錯誤訊息、代碼或組件..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 過濾器 */}
            <div className="flex flex-wrap gap-2">
              {/* 時間範圍 */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">全部時間</option>
                <option value="1h">最近1小時</option>
                <option value="6h">最近6小時</option>
                <option value="24h">最近24小時</option>
                <option value="7d">最近7天</option>
              </select>

              {/* 排序 */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="timestamp-desc">最新優先</option>
                <option value="timestamp-asc">最舊優先</option>
                <option value="severity-desc">嚴重程度</option>
                <option value="retryCount-desc">重試次數</option>
              </select>

              {/* 顯示已忽略 */}
              <label className="flex items-center space-x-1 text-sm">
                <input
                  type="checkbox"
                  checked={showDismissed}
                  onChange={(e) => setShowDismissed(e.target.checked)}
                  className="rounded"
                />
                <span>顯示已忽略</span>
              </label>
            </div>

            {/* 批量操作 */}
            {selectedErrors.length > 0 && (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                <span className="text-sm text-blue-700">
                  已選擇 {selectedErrors.length} 個錯誤
                </span>
                <Button size="sm" variant="outline" onClick={handleBulkDismiss}>
                  批量忽略
                </Button>
              </div>
            )}

            {/* 動作按鈕 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedErrors.length === filteredErrors.length ? '取消全選' : '全選'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportErrors}
                  className="flex items-center space-x-1 text-xs"
                >
                  <Download className="w-3 h-3" />
                  <span>導出</span>
                </Button>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={clearErrors}
                className="flex items-center space-x-1 text-xs text-red-600"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除全部</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 錯誤列表 */}
      <div style={{ maxHeight }} className="overflow-y-auto">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>沒有錯誤記錄</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            <AnimatePresence>
              {filteredErrors.map((error) => (
                <motion.div
                  key={error.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 hover:bg-gray-50 ${
                    error.dismissed ? 'opacity-60' : ''
                  } ${
                    selectedErrors.includes(error.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 選擇框 */}
                    <input
                      type="checkbox"
                      checked={selectedErrors.includes(error.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedErrors([...selectedErrors, error.id]);
                        } else {
                          setSelectedErrors(selectedErrors.filter(id => id !== error.id));
                        }
                      }}
                      className="mt-1"
                    />

                    {/* 嚴重程度圖標 */}
                    <div className="mt-1">
                      {getSeverityIcon(error.severity)}
                    </div>

                    {/* 錯誤內容 */}
                    <div className="flex-1 min-w-0">
                      {/* 錯誤訊息 */}
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {error.error.userMessage || error.error.message}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          {getStatusIcon(error.status)}
                          <span className="text-xs text-gray-500">
                            {error.status}
                          </span>
                        </div>
                      </div>

                      {/* 錯誤詳情 */}
                      <div className="mt-1 text-xs text-gray-600 space-y-1">
                        <div className="flex items-center space-x-4">
                          <span>代碼: {error.error.code}</span>
                          <span>組件: {error.context.component}</span>
                          <span>操作: {error.context.operation}</span>
                          {error.retryCount > 0 && (
                            <span className="text-blue-600">
                              重試: {error.retryCount} 次
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(error.context.timestamp).toLocaleString('zh-TW')}
                          </span>
                        </div>
                      </div>

                      {/* 動作按鈕 */}
                      <div className="mt-2 flex items-center space-x-2">
                        {error.error.retryable && error.status !== 'resolved' && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleRetryError(error.id)}
                            className="flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>重試</span>
                          </Button>
                        )}
                        
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDetailsModalError(error)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>詳情</span>
                        </Button>

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => copyErrorDetails(error)}
                          className="flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>複製</span>
                        </Button>

                        {!error.dismissed && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => dismissError(error.id)}
                            className="flex items-center space-x-1 text-gray-500"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>忽略</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 錯誤詳情模態框 */}
      {detailsModalError && (
        <Modal
          isOpen={true}
          onClose={() => setDetailsModalError(null)}
          title="錯誤詳情"
          size="lg"
        >
          <div className="space-y-4">
            {/* 基本資訊 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">基本資訊</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">錯誤代碼:</span>
                  <span className="ml-2 font-mono">{detailsModalError.error.code}</span>
                </div>
                <div>
                  <span className="text-gray-600">嚴重程度:</span>
                  <span className="ml-2">{detailsModalError.severity}</span>
                </div>
                <div>
                  <span className="text-gray-600">組件:</span>
                  <span className="ml-2">{detailsModalError.context.component}</span>
                </div>
                <div>
                  <span className="text-gray-600">操作:</span>
                  <span className="ml-2">{detailsModalError.context.operation}</span>
                </div>
                <div>
                  <span className="text-gray-600">時間:</span>
                  <span className="ml-2">
                    {new Date(detailsModalError.context.timestamp).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">重試次數:</span>
                  <span className="ml-2">{detailsModalError.retryCount}</span>
                </div>
              </div>
            </div>

            {/* 錯誤訊息 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">錯誤訊息</h4>
              <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                {detailsModalError.error.message}
              </p>
            </div>

            {/* 用戶訊息 */}
            {detailsModalError.error.userMessage && 
             detailsModalError.error.userMessage !== detailsModalError.error.message && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">用戶訊息</h4>
                <p className="text-sm text-gray-700 p-3 bg-blue-50 rounded">
                  {detailsModalError.error.userMessage}
                </p>
              </div>
            )}

            {/* 堆疊追蹤 */}
            {detailsModalError.error.stack && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">堆疊追蹤</h4>
                <pre className="text-xs text-gray-600 p-3 bg-gray-50 rounded overflow-auto max-h-40">
                  {detailsModalError.error.stack}
                </pre>
              </div>
            )}

            {/* 上下文資訊 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">上下文資訊</h4>
              <pre className="text-xs text-gray-600 p-3 bg-gray-50 rounded overflow-auto max-h-32">
                {JSON.stringify(detailsModalError.context, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EnhancedErrorLog;