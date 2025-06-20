import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  X, 
  Search, 
  Filter, 
  Download,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  User,
  Server,
  Wifi,
  AlertOctagon
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Form from '../ui/Form';
import Modal from '../ui/Modal';
import { useError } from '../../contexts/ErrorContext';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const ErrorLog = ({ maxHeight = '400px', showFilters = true, compact = false }) => {
  const { 
    errors, 
    activeErrors, 
    removeError, 
    clearErrors, 
    retryError, 
    markResolved,
    filterErrors,
    getStatistics
  } = useError();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const statistics = getStatistics();

  // 過濾錯誤
  const filteredErrors = useMemo(() => {
    let filtered = filterErrors({
      category: selectedCategory || undefined,
      severity: selectedSeverity || undefined,
      status: selectedStatus || undefined,
      includeDismissed: showDismissed
    });

    // 根據搜尋詞過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(error => 
        error.error.message.toLowerCase().includes(term) ||
        error.context.component?.toLowerCase().includes(term) ||
        error.context.operation?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [errors, searchTerm, selectedCategory, selectedSeverity, selectedStatus, showDismissed, filterErrors]);

  // 獲取嚴重程度圖標和顏色
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'HIGH':
        return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'LOW':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  // 獲取類別圖標
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'NetworkError':
        return <Wifi className="w-4 h-4" />;
      case 'ApiError':
        return <Server className="w-4 h-4" />;
      case 'AuthenticationError':
        return <User className="w-4 h-4" />;
      case 'TimeoutError':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // 獲取狀態顏色
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-red-600 bg-red-50';
      case 'resolved':
        return 'text-green-600 bg-green-50';
      case 'retrying':
        return 'text-yellow-600 bg-yellow-50';
      case 'dismissed':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 處理重試
  const handleRetry = async (errorId) => {
    try {
      await retryError(errorId);
    } catch (error) {
      console.error('Manual retry failed:', error);
    }
  };

  // 處理解決
  const handleResolve = (errorId) => {
    markResolved(errorId);
  };

  // 處理移除
  const handleRemove = (errorId) => {
    removeError(errorId);
  };

  // 導出錯誤日誌
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      statistics,
      errors: filteredErrors.map(error => ({
        ...error,
        error: error.error.toJSON ? error.error.toJSON() : error.error
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 顯示錯誤詳情
  const showErrorDetails = (error) => {
    setSelectedError(error);
    setShowDetails(true);
  };

  if (compact) {
    return (
      <Card className="w-full">
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title className="text-sm">錯誤日誌</Card.Title>
            <span className="text-xs text-gray-500">
              {activeErrors.length} 個活動錯誤
            </span>
          </div>
        </Card.Header>
        <Card.Content>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeErrors.slice(0, 3).map(error => (
              <div key={error.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-xs">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(error.classification.severity)}
                  <span className="truncate">{error.error.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(error.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {activeErrors.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                還有 {activeErrors.length - 3} 個錯誤...
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>錯誤日誌</Card.Title>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                導出
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearErrors()}
                disabled={filteredErrors.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除全部
              </Button>
            </div>
          </div>
          
          {/* 統計資訊 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.total}</div>
              <div className="text-xs text-gray-500">總錯誤數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.activeCount}</div>
              <div className="text-xs text-gray-500">活動錯誤</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.resolved}</div>
              <div className="text-xs text-gray-500">已解決</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.retried}</div>
              <div className="text-xs text-gray-500">重試次數</div>
            </div>
          </div>
        </Card.Header>

        {showFilters && (
          <Card.Content className="border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Form.Input
                placeholder="搜尋錯誤..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">所有類別</option>
                <option value="NetworkError">網路錯誤</option>
                <option value="ApiError">API 錯誤</option>
                <option value="AuthenticationError">認證錯誤</option>
                <option value="FileError">檔案錯誤</option>
                <option value="TimeoutError">超時錯誤</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">所有嚴重程度</option>
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">所有狀態</option>
                <option value="active">活動</option>
                <option value="resolved">已解決</option>
                <option value="retrying">重試中</option>
                <option value="dismissed">已忽略</option>
              </select>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showDismissed}
                  onChange={(e) => setShowDismissed(e.target.checked)}
                  className="mr-2"
                />
                顯示已忽略的錯誤
              </label>
            </div>
          </Card.Content>
        )}

        <Card.Content className="p-0">
          <div style={{ maxHeight }} className="overflow-y-auto">
            {filteredErrors.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>沒有找到錯誤記錄</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredErrors.map(error => (
                  <div
                    key={error.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => showErrorDetails(error)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          {getSeverityIcon(error.classification.severity)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getCategoryIcon(error.classification.category)}
                            <span className="font-medium text-gray-900 truncate">
                              {error.error.message}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(error.status)}`}>
                              {error.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            {error.context.component} • {error.context.operation}
                            {error.retryCount > 0 && (
                              <span className="ml-2">• 重試 {error.retryCount} 次</span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(error.timestamp), { 
                              addSuffix: true, 
                              locale: zhTW 
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-4">
                        {error.classification.retryable && error.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(error.id);
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {error.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(error.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(error.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* 錯誤詳情模態框 */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="錯誤詳情"
        size="lg"
      >
        {selectedError && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              {getSeverityIcon(selectedError.classification.severity)}
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedError.error.message}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedError.classification.category}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">基本資訊</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">狀態</dt>
                    <dd className={`font-medium ${getStatusColor(selectedError.status)}`}>
                      {selectedError.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">嚴重程度</dt>
                    <dd className="font-medium">{selectedError.classification.severity}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">重試次數</dt>
                    <dd className="font-medium">{selectedError.retryCount}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">時間</dt>
                    <dd className="font-medium">
                      {new Date(selectedError.timestamp).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">上下文</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">組件</dt>
                    <dd className="font-medium">{selectedError.context.component}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">操作</dt>
                    <dd className="font-medium">{selectedError.context.operation}</dd>
                  </div>
                  {selectedError.context.platform && (
                    <div>
                      <dt className="text-gray-500">平台</dt>
                      <dd className="font-medium">{selectedError.context.platform}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {selectedError.error.stack && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">堆疊追蹤</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                  {selectedError.error.stack}
                </pre>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {selectedError.classification.retryable && selectedError.status === 'active' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleRetry(selectedError.id);
                    setShowDetails(false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重試
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                  handleResolve(selectedError.id);
                  setShowDetails(false);
                }}
              >
                標記為已解決
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowDetails(false)}
              >
                關閉
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ErrorLog;