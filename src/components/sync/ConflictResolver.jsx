// 衝突解決器組件 - 處理數據同步衝突的用戶界面
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import { CONFLICT_TYPES, RESOLUTION_STRATEGIES } from '../../services/sync/SyncManager.js';

export const ConflictResolver = ({
  syncManager,
  className = '',
  onConflictResolved,
  autoRefresh = true
}) => {
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolution, setResolution] = useState({
    strategy: RESOLUTION_STRATEGIES.MANUAL,
    selectedItem: null,
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  // 載入待解決衝突
  const loadConflicts = useCallback(() => {
    if (!syncManager) return;
    
    const pendingConflicts = syncManager.getPendingConflicts();
    setConflicts(pendingConflicts);
  }, [syncManager]);

  // 自動刷新
  useEffect(() => {
    loadConflicts();
    
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadConflicts, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadConflicts, autoRefresh]);

  // 同步管理器事件監聽
  useEffect(() => {
    if (!syncManager) return;
    
    const handleConflictRequiresResolution = () => {
      loadConflicts();
    };
    
    const handleConflictResolved = () => {
      loadConflicts();
      setShowResolutionModal(false);
      setSelectedConflict(null);
    };
    
    syncManager.on('conflict-requires-resolution', handleConflictRequiresResolution);
    syncManager.on('conflict-resolved-manually', handleConflictResolved);
    
    return () => {
      syncManager.off('conflict-requires-resolution', handleConflictRequiresResolution);
      syncManager.off('conflict-resolved-manually', handleConflictResolved);
    };
  }, [syncManager, loadConflicts]);

  // 開始解決衝突
  const handleStartResolution = useCallback((conflict) => {
    setSelectedConflict(conflict);
    setResolution({
      strategy: RESOLUTION_STRATEGIES.MANUAL,
      selectedItem: conflict.conflict.items[0],
      reason: ''
    });
    setShowResolutionModal(true);
  }, []);

  // 應用解決方案
  const handleApplyResolution = useCallback(async () => {
    if (!selectedConflict || !syncManager) return;
    
    try {
      setLoading(true);
      
      await syncManager.resolveConflictManually(
        selectedConflict.conflict.id,
        resolution
      );
      
      if (onConflictResolved) {
        onConflictResolved(selectedConflict.conflict.id, resolution);
      }
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert(`解決衝突失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedConflict, syncManager, resolution, onConflictResolved]);

  // 使用自動策略
  const handleAutoResolve = useCallback(async (conflictId, strategy) => {
    if (!syncManager) return;
    
    try {
      const conflict = conflicts.find(c => c.conflict.id === conflictId);
      if (!conflict) return;
      
      // 基於策略選擇項目
      let selectedItem;
      let reason;
      
      switch (strategy) {
        case RESOLUTION_STRATEGIES.LATEST_TIMESTAMP:
          selectedItem = conflict.conflict.items.sort((a, b) => 
            new Date(b.lastModified || b.createdAt) - new Date(a.lastModified || a.createdAt)
          )[0];
          reason = '選擇最新的項目';
          break;
          
        case RESOLUTION_STRATEGIES.LARGEST_SIZE:
          selectedItem = conflict.conflict.items.sort((a, b) => 
            (b.size || 0) - (a.size || 0)
          )[0];
          reason = '選擇最大的項目';
          break;
          
        default:
          selectedItem = conflict.conflict.items[0];
          reason = '使用默認選擇';
      }
      
      await syncManager.resolveConflictManually(conflictId, {
        strategy,
        selectedItem,
        reason
      });
      
      if (onConflictResolved) {
        onConflictResolved(conflictId, { strategy, selectedItem, reason });
      }
      
    } catch (error) {
      console.error('Auto resolve failed:', error);
      alert(`自動解決失敗: ${error.message}`);
    }
  }, [syncManager, conflicts, onConflictResolved]);

  // 渲染衝突類型徽章
  const renderConflictTypeBadge = (type) => {
    const typeConfig = {
      [CONFLICT_TYPES.METADATA_CONFLICT]: { color: 'bg-blue-100 text-blue-800', text: '元數據衝突' },
      [CONFLICT_TYPES.CONTENT_CONFLICT]: { color: 'bg-red-100 text-red-800', text: '內容衝突' },
      [CONFLICT_TYPES.TIMESTAMP_CONFLICT]: { color: 'bg-yellow-100 text-yellow-800', text: '時間戳衝突' },
      [CONFLICT_TYPES.DUPLICATE_CONTENT]: { color: 'bg-purple-100 text-purple-800', text: '重複內容' },
      [CONFLICT_TYPES.VERSION_CONFLICT]: { color: 'bg-orange-100 text-orange-800', text: '版本衝突' }
    };

    const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', text: type };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // 渲染嚴重性指示器
  const renderSeverityIndicator = (severity) => {
    const color = severity >= 8 ? 'bg-red-500' :
                 severity >= 5 ? 'bg-orange-500' :
                 severity >= 3 ? 'bg-yellow-500' : 'bg-green-500';

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-gray-600">嚴重性: {severity}/10</span>
      </div>
    );
  };

  // 渲染項目預覽
  const renderItemPreview = (item, isSelected = false) => (
    <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{item.filename || 'Unknown'}</h4>
          <p className="text-sm text-gray-600">來源: {item.source}</p>
        </div>
        {isSelected && (
          <div className="text-blue-500">
            ✓
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="font-medium">大小:</span> {item.size ? `${(item.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}
        </div>
        <div>
          <span className="font-medium">修改時間:</span> {new Date(item.lastModified || item.createdAt).toLocaleDateString()}
        </div>
        {item.width && item.height && (
          <div>
            <span className="font-medium">尺寸:</span> {item.width} × {item.height}
          </div>
        )}
        <div>
          <span className="font-medium">格式:</span> {item.format || 'Unknown'}
        </div>
      </div>
      
      {item.metadata && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-gray-500">查看元數據</summary>
          <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
            <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  );

  // 渲染衝突列表
  const renderConflictList = () => (
    <div className="space-y-4">
      <AnimatePresence>
        {conflicts.map((conflictData, index) => (
          <motion.div
            key={conflictData.conflict.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    衝突 #{conflictData.conflict.id.slice(0, 8)}
                  </h3>
                  <div className="flex items-center space-x-3 mb-2">
                    {conflictData.conflict.types.map(type => 
                      renderConflictTypeBadge(type)
                    )}
                  </div>
                  {renderSeverityIndicator(conflictData.conflict.severity)}
                </div>
                
                <div className="text-sm text-gray-500">
                  檢測時間: {new Date(conflictData.conflict.detectedAt).toLocaleString()}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  涉及 {conflictData.conflict.items.length} 個項目:
                </p>
                <div className="flex flex-wrap gap-2">
                  {conflictData.conflict.items.map((item, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {item.source}: {item.filename || 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleAutoResolve(
                      conflictData.conflict.id, 
                      RESOLUTION_STRATEGIES.LATEST_TIMESTAMP
                    )}
                  >
                    選擇最新
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAutoResolve(
                      conflictData.conflict.id, 
                      RESOLUTION_STRATEGIES.LARGEST_SIZE
                    )}
                  >
                    選擇最大
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartResolution(conflictData)}
                >
                  手動解決
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {conflicts.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium mb-2">沒有待解決的衝突</h3>
            <p className="text-sm">所有同步衝突都已解決</p>
          </div>
        </Card>
      )}
    </div>
  );

  // 渲染解決方案模態框
  const renderResolutionModal = () => (
    <Modal
      isOpen={showResolutionModal}
      onClose={() => setShowResolutionModal(false)}
      title="手動解決衝突"
      size="large"
    >
      {selectedConflict && (
        <div className="space-y-6">
          {/* 衝突信息 */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">衝突詳情</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">衝突 ID:</span>
                <div className="text-gray-900">{selectedConflict.conflict.id}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">檢測時間:</span>
                <div className="text-gray-900">
                  {new Date(selectedConflict.conflict.detectedAt).toLocaleString()}
                </div>
              </div>
              <div className="col-span-2">
                <span className="font-medium text-gray-700">衝突類型:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedConflict.conflict.types.map(type => 
                    renderConflictTypeBadge(type)
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 項目選擇 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">選擇要保留的項目:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedConflict.conflict.items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => setResolution(prev => ({
                    ...prev,
                    selectedItem: item
                  }))}
                >
                  {renderItemPreview(item, resolution.selectedItem === item)}
                </div>
              ))}
            </div>
          </div>

          {/* 解決原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              解決原因 (可選)
            </label>
            <textarea
              value={resolution.reason}
              onChange={(e) => setResolution(prev => ({
                ...prev,
                reason: e.target.value
              }))}
              placeholder="說明為什麼選擇這個項目..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowResolutionModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleApplyResolution}
              loading={loading}
              disabled={!resolution.selectedItem}
            >
              應用解決方案
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">衝突解決器</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {conflicts.length} 個待解決衝突
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConflicts}
          >
            刷新
          </Button>
        </div>
      </div>

      {renderConflictList()}
      {renderResolutionModal()}
    </div>
  );
};

export default ConflictResolver;