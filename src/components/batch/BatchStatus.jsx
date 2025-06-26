// 批次狀態監控組件
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import { BATCH_STATUS, TASK_STATUS, BATCH_PRIORITY } from '../../services/batch/BatchProcessor.js';

export const BatchStatus = ({ 
  batchProcessor,
  className = '',
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  // 載入批次數據
  const loadBatches = useCallback(async () => {
    if (!batchProcessor) return;
    
    try {
      setLoading(true);
      const allBatches = batchProcessor.getAllBatches();
      const stats = batchProcessor.getStatistics();
      
      // 應用過濾器
      let filteredBatches = allBatches;
      if (filter !== 'all') {
        filteredBatches = allBatches.filter(batch => batch.status === filter);
      }
      
      // 應用排序
      filteredBatches.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
      
      setBatches(filteredBatches);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setLoading(false);
    }
  }, [batchProcessor, filter, sortBy, sortOrder]);

  // 自動刷新
  useEffect(() => {
    loadBatches();
    
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadBatches, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadBatches, autoRefresh, refreshInterval]);

  // 批次處理器事件監聽
  useEffect(() => {
    if (!batchProcessor) return;
    
    const handleBatchUpdate = () => {
      loadBatches();
    };
    
    batchProcessor.on('batch-created', handleBatchUpdate);
    batchProcessor.on('batch-started', handleBatchUpdate);
    batchProcessor.on('batch-completed', handleBatchUpdate);
    batchProcessor.on('batch-failed', handleBatchUpdate);
    batchProcessor.on('batch-cancelled', handleBatchUpdate);
    batchProcessor.on('batch-progress', handleBatchUpdate);
    
    return () => {
      batchProcessor.off('batch-created', handleBatchUpdate);
      batchProcessor.off('batch-started', handleBatchUpdate);
      batchProcessor.off('batch-completed', handleBatchUpdate);
      batchProcessor.off('batch-failed', handleBatchUpdate);
      batchProcessor.off('batch-cancelled', handleBatchUpdate);
      batchProcessor.off('batch-progress', handleBatchUpdate);
    };
  }, [batchProcessor, loadBatches]);

  // 批次操作
  const handleBatchAction = useCallback(async (batchId, action) => {
    if (!batchProcessor) return;
    
    try {
      switch (action) {
        case 'start':
          await batchProcessor.startBatch(batchId);
          break;
        case 'pause':
          await batchProcessor.pauseBatch(batchId);
          break;
        case 'resume':
          await batchProcessor.resumeBatch(batchId);
          break;
        case 'cancel':
          await batchProcessor.cancelBatch(batchId);
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
      
      loadBatches();
    } catch (error) {
      console.error(`Failed to ${action} batch:`, error);
      alert(`無法${action === 'start' ? '啟動' : action === 'pause' ? '暫停' : action === 'resume' ? '恢復' : '取消'}批次: ${error.message}`);
    }
  }, [batchProcessor, loadBatches]);

  // 查看批次詳情
  const handleViewDetails = useCallback((batch) => {
    setSelectedBatch(batch);
    setShowBatchDetails(true);
  }, []);

  // 渲染狀態徽章
  const renderStatusBadge = (status) => {
    const statusConfig = {
      [BATCH_STATUS.PENDING]: { color: 'bg-gray-100 text-gray-800', icon: '⏳', text: '待處理' },
      [BATCH_STATUS.RUNNING]: { color: 'bg-blue-100 text-blue-800', icon: '🔄', text: '運行中' },
      [BATCH_STATUS.PAUSED]: { color: 'bg-yellow-100 text-yellow-800', icon: '⏸️', text: '已暫停' },
      [BATCH_STATUS.COMPLETED]: { color: 'bg-green-100 text-green-800', icon: '✅', text: '已完成' },
      [BATCH_STATUS.FAILED]: { color: 'bg-red-100 text-red-800', icon: '❌', text: '失敗' },
      [BATCH_STATUS.CANCELLED]: { color: 'bg-gray-100 text-gray-800', icon: '⏹️', text: '已取消' }
    };

    const config = statusConfig[status] || statusConfig[BATCH_STATUS.PENDING];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // 渲染優先級徽章
  const renderPriorityBadge = (priority) => {
    const priorityConfig = {
      [BATCH_PRIORITY.LOW]: { color: 'bg-gray-100 text-gray-800', text: '低' },
      [BATCH_PRIORITY.NORMAL]: { color: 'bg-blue-100 text-blue-800', text: '普通' },
      [BATCH_PRIORITY.HIGH]: { color: 'bg-orange-100 text-orange-800', text: '高' },
      [BATCH_PRIORITY.URGENT]: { color: 'bg-red-100 text-red-800', text: '緊急' }
    };

    const config = priorityConfig[priority] || priorityConfig[BATCH_PRIORITY.NORMAL];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // 渲染進度條
  const renderProgressBar = (progress, status) => {
    const progressColor = status === BATCH_STATUS.FAILED ? 'bg-red-500' : 
                         status === BATCH_STATUS.COMPLETED ? 'bg-green-500' : 'bg-blue-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${progressColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  };

  // 渲染批次操作按鈕
  const renderActionButtons = (batch) => {
    const { id, status } = batch;

    return (
      <div className="flex space-x-2">
        {status === BATCH_STATUS.PENDING && (
          <Button
            size="sm"
            onClick={() => handleBatchAction(id, 'start')}
          >
            啟動
          </Button>
        )}
        
        {status === BATCH_STATUS.RUNNING && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(id, 'pause')}
            >
              暫停
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(id, 'cancel')}
            >
              取消
            </Button>
          </>
        )}
        
        {status === BATCH_STATUS.PAUSED && (
          <>
            <Button
              size="sm"
              onClick={() => handleBatchAction(id, 'resume')}
            >
              恢復
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchAction(id, 'cancel')}
            >
              取消
            </Button>
          </>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewDetails(batch)}
        >
          詳情
        </Button>
      </div>
    );
  };

  // 渲染統計卡片
  const renderStatisticsCards = () => {
    if (!statistics) return null;

    const cards = [
      {
        title: '總批次數',
        value: statistics.totalBatches,
        subtitle: '歷史總數',
        icon: '📊',
        color: 'blue'
      },
      {
        title: '活動批次',
        value: statistics.activeBatches,
        subtitle: '正在運行',
        icon: '🔄',
        color: 'green'
      },
      {
        title: '已完成',
        value: statistics.completedBatches,
        subtitle: '成功完成',
        icon: '✅',
        color: 'green'
      },
      {
        title: '失敗批次',
        value: statistics.failedBatches,
        subtitle: '處理失敗',
        icon: '❌',
        color: 'red'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {cards.map((card, index) => (
          <Card key={index} className={`p-6 border-l-4 border-${card.color}-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.subtitle}</p>
              </div>
              <div className={`text-3xl text-${card.color}-500`}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // 渲染過濾器和排序控制
  const renderControls = () => (
    <Card className="p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              狀態過濾
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部狀態</option>
              <option value={BATCH_STATUS.PENDING}>待處理</option>
              <option value={BATCH_STATUS.RUNNING}>運行中</option>
              <option value={BATCH_STATUS.PAUSED}>已暫停</option>
              <option value={BATCH_STATUS.COMPLETED}>已完成</option>
              <option value={BATCH_STATUS.FAILED}>失敗</option>
              <option value={BATCH_STATUS.CANCELLED}>已取消</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序方式
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">創建時間</option>
              <option value="name">名稱</option>
              <option value="priority">優先級</option>
              <option value="progress">進度</option>
              <option value="status">狀態</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序順序
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBatches}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>
    </Card>
  );

  // 渲染批次列表
  const renderBatchList = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">批次列表</h3>
        <div className="text-sm text-gray-500">
          顯示 {batches.length} 個批次
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">載入中...</div>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          沒有找到批次
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {batches.map((batch, index) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{batch.name}</h4>
                      {renderStatusBadge(batch.status)}
                      {renderPriorityBadge(batch.priority)}
                    </div>
                    
                    {batch.description && (
                      <p className="text-sm text-gray-600 mb-3">{batch.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">總任務:</span> {batch.totalTasks}
                      </div>
                      <div>
                        <span className="font-medium">已完成:</span> {batch.completedTasks}
                      </div>
                      <div>
                        <span className="font-medium">失敗:</span> {batch.failedTasks}
                      </div>
                      <div>
                        <span className="font-medium">進度:</span> {Math.round(batch.progress)}%
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      {renderProgressBar(batch.progress, batch.status)}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      創建時間: {new Date(batch.createdAt).toLocaleString()}
                      {batch.startedAt && ` | 開始時間: ${new Date(batch.startedAt).toLocaleString()}`}
                      {batch.completedAt && ` | 完成時間: ${new Date(batch.completedAt).toLocaleString()}`}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    {renderActionButtons(batch)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );

  // 渲染批次詳情模態框
  const renderBatchDetailsModal = () => (
    <Modal
      isOpen={showBatchDetails}
      onClose={() => setShowBatchDetails(false)}
      title="批次詳情"
      size="large"
    >
      {selectedBatch && (
        <div className="space-y-6">
          {/* 基本信息 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-4">基本信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">批次 ID:</span>
                <div className="text-gray-900">{selectedBatch.id}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">名稱:</span>
                <div className="text-gray-900">{selectedBatch.name}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">狀態:</span>
                <div>{renderStatusBadge(selectedBatch.status)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">優先級:</span>
                <div>{renderPriorityBadge(selectedBatch.priority)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">創建時間:</span>
                <div className="text-gray-900">
                  {new Date(selectedBatch.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">最後更新:</span>
                <div className="text-gray-900">
                  {new Date(selectedBatch.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          {/* 進度統計 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-4">進度統計</h4>
            <div className="mb-4">
              {renderProgressBar(selectedBatch.progress, selectedBatch.status)}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{selectedBatch.totalTasks}</div>
                <div className="text-sm text-blue-800">總任務</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">{selectedBatch.completedTasks}</div>
                <div className="text-sm text-green-800">已完成</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">{selectedBatch.failedTasks}</div>
                <div className="text-sm text-red-800">失敗</div>
              </div>
            </div>
          </Card>

          {/* 文件統計 */}
          {selectedBatch.statistics && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">文件統計</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">總文件數:</span>
                  <div className="text-gray-900">{selectedBatch.statistics.totalFiles?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">已處理:</span>
                  <div className="text-gray-900">{selectedBatch.statistics.processedFiles?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">總大小:</span>
                  <div className="text-gray-900">
                    {selectedBatch.statistics.totalSize ? 
                      `${(selectedBatch.statistics.totalSize / (1024 * 1024)).toFixed(1)} MB` : 
                      '0 MB'
                    }
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">已處理大小:</span>
                  <div className="text-gray-900">
                    {selectedBatch.statistics.processedSize ? 
                      `${(selectedBatch.statistics.processedSize / (1024 * 1024)).toFixed(1)} MB` : 
                      '0 MB'
                    }
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 錯誤和警告 */}
          {selectedBatch.statistics?.errors?.length > 0 && (
            <Card className="p-4 bg-red-50 border-red-200">
              <h4 className="font-medium text-red-900 mb-4">錯誤記錄</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedBatch.statistics.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    <span className="font-medium">{error.timestamp}:</span> {error.error}
                  </div>
                ))}
                {selectedBatch.statistics.errors.length > 10 && (
                  <div className="text-sm text-red-600">
                    還有 {selectedBatch.statistics.errors.length - 10} 個錯誤...
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3">
            {renderActionButtons(selectedBatch)}
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {renderStatisticsCards()}
      {renderControls()}
      {renderBatchList()}
      {renderBatchDetailsModal()}
    </div>
  );
};

export default BatchStatus;