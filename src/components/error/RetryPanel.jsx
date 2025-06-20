import React, { useState, useCallback } from 'react';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Square, 
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Form from '../ui/Form';
import Modal from '../ui/Modal';
import { useError } from '../../contexts/ErrorContext';
import { RetryConfigs, globalRetryManager } from '../../utils/retryManager';

const RetryPanel = ({ 
  errors = [], 
  onRetryComplete,
  onRetryStart,
  showAdvancedOptions = false,
  className = '' 
}) => {
  const { retryError, state } = useError();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState({});
  const [selectedErrors, setSelectedErrors] = useState(new Set());
  const [retryConfig, setRetryConfig] = useState('network');
  const [customConfig, setCustomConfig] = useState({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [batchRetryStatus, setBatchRetryStatus] = useState(null);

  // 獲取可重試的錯誤
  const retryableErrors = errors.filter(error => 
    error.classification?.retryable !== false && 
    error.status === 'active'
  );

  // 處理單個錯誤重試
  const handleSingleRetry = useCallback(async (error) => {
    if (!error.id) return;

    setIsRetrying(true);
    setRetryProgress(prev => ({
      ...prev,
      [error.id]: { status: 'starting', attempt: 0 }
    }));

    try {
      if (onRetryStart) {
        onRetryStart(error);
      }

      const success = await retryError(error.id, () => {
        // 這裡應該調用實際的重試操作
        // 由於我們沒有具體的重試邏輯，我們模擬一個
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            // 50% 成功率用於演示
            if (Math.random() > 0.5) {
              resolve();
            } else {
              reject(new Error('重試失敗'));
            }
          }, 2000);
        });
      });

      setRetryProgress(prev => ({
        ...prev,
        [error.id]: { 
          status: success ? 'success' : 'failed', 
          attempt: (prev[error.id]?.attempt || 0) + 1 
        }
      }));

      if (onRetryComplete) {
        onRetryComplete(error, success);
      }

    } catch (retryError) {
      setRetryProgress(prev => ({
        ...prev,
        [error.id]: { 
          status: 'failed', 
          attempt: (prev[error.id]?.attempt || 0) + 1,
          error: retryError.message
        }
      }));

      if (onRetryComplete) {
        onRetryComplete(error, false, retryError);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [retryError, onRetryStart, onRetryComplete]);

  // 處理批量重試
  const handleBatchRetry = useCallback(async () => {
    if (selectedErrors.size === 0) return;

    const errorsToRetry = errors.filter(error => selectedErrors.has(error.id));
    setIsRetrying(true);
    setBatchRetryStatus({
      total: errorsToRetry.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
      current: null
    });

    for (const error of errorsToRetry) {
      setBatchRetryStatus(prev => ({
        ...prev,
        current: error
      }));

      try {
        await handleSingleRetry(error);
        setBatchRetryStatus(prev => ({
          ...prev,
          completed: prev.completed + 1,
          succeeded: prev.succeeded + 1
        }));
      } catch {
        setBatchRetryStatus(prev => ({
          ...prev,
          completed: prev.completed + 1,
          failed: prev.failed + 1
        }));
      }

      // 短暫延遲避免過於頻繁的請求
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setBatchRetryStatus(prev => ({
      ...prev,
      current: null
    }));

    setIsRetrying(false);
    setSelectedErrors(new Set());
  }, [selectedErrors, errors, handleSingleRetry]);

  // 處理全部重試
  const handleRetryAll = useCallback(async () => {
    const allRetryableIds = new Set(retryableErrors.map(e => e.id));
    setSelectedErrors(allRetryableIds);
    
    // 使用 setTimeout 確保狀態更新後再執行批量重試
    setTimeout(() => {
      handleBatchRetry();
    }, 0);
  }, [retryableErrors, handleBatchRetry]);

  // 處理錯誤選擇
  const handleErrorSelection = (errorId, selected) => {
    setSelectedErrors(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(errorId);
      } else {
        newSet.delete(errorId);
      }
      return newSet;
    });
  };

  // 處理全選
  const handleSelectAll = () => {
    if (selectedErrors.size === retryableErrors.length) {
      setSelectedErrors(new Set());
    } else {
      setSelectedErrors(new Set(retryableErrors.map(e => e.id)));
    }
  };

  // 獲取重試圖標
  const getRetryIcon = (status) => {
    switch (status) {
      case 'starting':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  // 渲染批量重試狀態
  const renderBatchStatus = () => {
    if (!batchRetryStatus) return null;

    const { total, completed, succeeded, failed, current } = batchRetryStatus;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <Card className="mb-4">
        <Card.Content className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">批量重試進度</span>
            <span className="text-xs text-gray-500">
              {completed} / {total}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-600">
            <span>成功: {succeeded}</span>
            <span>失敗: {failed}</span>
          </div>
          
          {current && (
            <div className="mt-2 text-xs text-gray-500">
              當前重試: {current.error?.message || '未知錯誤'}
            </div>
          )}
        </Card.Content>
      </Card>
    );
  };

  // 渲染重試配置模態框
  const renderConfigModal = () => (
    <Modal
      isOpen={showConfigModal}
      onClose={() => setShowConfigModal(false)}
      title="重試設定"
    >
      <div className="space-y-4">
        <div>
          <Form.Label>預設配置</Form.Label>
          <select
            value={retryConfig}
            onChange={(e) => setRetryConfig(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="network">網路請求</option>
            <option value="api">API 呼叫</option>
            <option value="file">檔案操作</option>
            <option value="fast">快速重試</option>
            <option value="aggressive">積極重試</option>
            <option value="custom">自定義</option>
          </select>
        </div>

        {retryConfig === 'custom' && (
          <>
            <Form.Input
              label="最大重試次數"
              type="number"
              value={customConfig.maxAttempts}
              onChange={(e) => setCustomConfig(prev => ({
                ...prev,
                maxAttempts: parseInt(e.target.value)
              }))}
              min="1"
              max="10"
            />
            
            <Form.Input
              label="基礎延遲 (ms)"
              type="number"
              value={customConfig.baseDelay}
              onChange={(e) => setCustomConfig(prev => ({
                ...prev,
                baseDelay: parseInt(e.target.value)
              }))}
              min="100"
              max="10000"
            />
            
            <Form.Input
              label="最大延遲 (ms)"
              type="number"
              value={customConfig.maxDelay}
              onChange={(e) => setCustomConfig(prev => ({
                ...prev,
                maxDelay: parseInt(e.target.value)
              }))}
              min="1000"
              max="60000"
            />
            
            <Form.Input
              label="退避倍數"
              type="number"
              step="0.1"
              value={customConfig.backoffMultiplier}
              onChange={(e) => setCustomConfig(prev => ({
                ...prev,
                backoffMultiplier: parseFloat(e.target.value)
              }))}
              min="1"
              max="5"
            />
          </>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(false)}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowConfigModal(false)}
          >
            確定
          </Button>
        </div>
      </div>
    </Modal>
  );

  if (retryableErrors.length === 0) {
    return (
      <Card className={className}>
        <Card.Content className="p-6 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>沒有可重試的錯誤</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className={className}>
      {renderBatchStatus()}
      
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>錯誤重試面板</Card.Title>
            <div className="flex items-center space-x-2">
              {showAdvancedOptions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  設定
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isRetrying}
              >
                {selectedErrors.size === retryableErrors.length ? '取消全選' : '全選'}
              </Button>
              
              <Button
                variant="primary"
                size="sm"
                onClick={selectedErrors.size > 1 ? handleBatchRetry : handleRetryAll}
                disabled={isRetrying || (selectedErrors.size === 0 && retryableErrors.length === 0)}
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {selectedErrors.size > 1 ? `重試選中 (${selectedErrors.size})` : '重試全部'}
              </Button>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-0">
          <div className="divide-y divide-gray-200">
            {retryableErrors.map(error => {
              const progress = retryProgress[error.id];
              const isSelected = selectedErrors.has(error.id);
              
              return (
                <div
                  key={error.id}
                  className={`p-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleErrorSelection(error.id, e.target.checked)}
                      disabled={isRetrying}
                      className="rounded"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {error.error?.message || '未知錯誤'}
                        </span>
                        {progress && getRetryIcon(progress.status)}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {error.context?.component} • {error.context?.operation}
                        {error.retryCount > 0 && (
                          <span className="ml-2">• 已重試 {error.retryCount} 次</span>
                        )}
                      </div>
                      
                      {progress && progress.status === 'failed' && progress.error && (
                        <div className="text-xs text-red-600 mt-1">
                          重試失敗: {progress.error}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {progress && progress.attempt > 0 && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {progress.attempt} 次
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSingleRetry(error)}
                        disabled={isRetrying}
                      >
                        {progress?.status === 'starting' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Content>
      </Card>

      {renderConfigModal()}
    </div>
  );
};

export default RetryPanel;