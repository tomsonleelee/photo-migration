// 安全掃描儀表板組件
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useSecurityScanner,
  SCAN_TYPES, 
  SEVERITY_LEVELS, 
  SCAN_STATUS 
} from '../../utils/security/securityScanner.js';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';

export const SecurityScanDashboard = ({ 
  userRole = 'admin',
  className = '' 
}) => {
  const {
    statistics,
    loading,
    runScan,
    getScanResults,
    getAllResults,
    loadStatistics
  } = useSecurityScanner();

  const [selectedScan, setSelectedScan] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [filters, setFilters] = useState({
    scanType: '',
    status: '',
    severity: ''
  });

  // 載入掃描結果
  useEffect(() => {
    loadScanResults();
  }, [filters]);

  const loadScanResults = useCallback(() => {
    const results = getAllResults({
      scanType: filters.scanType || undefined,
      status: filters.status || undefined,
      limit: 20
    });
    setScanResults(results);
  }, [filters, getAllResults]);

  // 執行掃描
  const handleRunScan = useCallback(async (scanType) => {
    try {
      await runScan(scanType, { triggered: 'manual' });
      loadScanResults();
      setShowScanModal(false);
    } catch (error) {
      console.error('Failed to run scan:', error);
      alert('掃描執行失敗: ' + error.message);
    }
  }, [runScan, loadScanResults]);

  // 查看掃描詳情
  const handleViewScanDetails = useCallback((scanId) => {
    const result = getScanResults(scanId);
    setSelectedScan(result);
  }, [getScanResults]);

  // 渲染嚴重程度徽章
  const renderSeverityBadge = (severity) => {
    const colors = {
      [SEVERITY_LEVELS.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
      [SEVERITY_LEVELS.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
      [SEVERITY_LEVELS.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      [SEVERITY_LEVELS.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
      [SEVERITY_LEVELS.INFO]: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  // 渲染狀態徽章
  const renderStatusBadge = (status) => {
    const colors = {
      [SCAN_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
      [SCAN_STATUS.RUNNING]: 'bg-blue-100 text-blue-800',
      [SCAN_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
      [SCAN_STATUS.FAILED]: 'bg-red-100 text-red-800',
      [SCAN_STATUS.CANCELLED]: 'bg-yellow-100 text-yellow-800'
    };

    const icons = {
      [SCAN_STATUS.PENDING]: '⏳',
      [SCAN_STATUS.RUNNING]: '🔄',
      [SCAN_STATUS.COMPLETED]: '✅',
      [SCAN_STATUS.FAILED]: '❌',
      [SCAN_STATUS.CANCELLED]: '⏹️'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // 渲染統計卡片
  const renderStatCard = (title, value, subtitle, icon, color = 'blue') => (
    <Card className={`p-6 border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`text-3xl text-${color}-500`}>
          {icon}
        </div>
      </div>
    </Card>
  );

  // 渲染掃描類型按鈕
  const renderScanTypeButtons = () => {
    const scanTypes = [
      { type: SCAN_TYPES.DEPENDENCY, name: '依賴掃描', icon: '📦', description: '檢查依賴漏洞' },
      { type: SCAN_TYPES.CODE, name: '代碼掃描', icon: '💻', description: '靜態代碼分析' },
      { type: SCAN_TYPES.CONFIGURATION, name: '配置掃描', icon: '⚙️', description: '安全配置檢查' },
      { type: SCAN_TYPES.RUNTIME, name: '運行時掃描', icon: '🔍', description: '運行時監控' },
      { type: SCAN_TYPES.CONTENT, name: '內容掃描', icon: '📄', description: '內容安全檢查' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scanTypes.map(scanType => (
          <Card key={scanType.type} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-3xl mb-2">{scanType.icon}</div>
              <h3 className="font-medium text-gray-900 mb-1">{scanType.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{scanType.description}</p>
              <Button
                size="sm"
                onClick={() => handleRunScan(scanType.type)}
                loading={loading}
                className="w-full"
              >
                開始掃描
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // 渲染掃描結果列表
  const renderScanResultsList = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">掃描歷史</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStatistics}
        >
          刷新
        </Button>
      </div>

      {/* 過濾器 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            掃描類型
          </label>
          <select
            value={filters.scanType}
            onChange={(e) => setFilters(prev => ({ ...prev, scanType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部類型</option>
            {Object.values(SCAN_TYPES).map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            狀態
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部狀態</option>
            {Object.values(SCAN_STATUS).map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            嚴重程度
          </label>
          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部嚴重程度</option>
            {Object.values(SEVERITY_LEVELS).map(severity => (
              <option key={severity} value={severity}>
                {severity.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 掃描結果表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                掃描類型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                開始時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                持續時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                發現問題
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                風險分數
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scanResults.map((scan, index) => (
              <tr key={scan.scanId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {scan.scanType.replace('_', ' ').toUpperCase()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderStatusBadge(scan.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(scan.startTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {scan.duration ? `${Math.round(scan.duration / 1000)}s` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {scan.issuesFound || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    scan.riskScore >= 50 ? 'bg-red-100 text-red-800' :
                    scan.riskScore >= 20 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {scan.riskScore || 0}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewScanDetails(scan.scanId)}
                  >
                    查看詳情
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {scanResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            沒有找到掃描結果
          </div>
        )}
      </div>
    </Card>
  );

  // 渲染掃描詳情模態框
  const renderScanDetailsModal = () => (
    <Modal
      isOpen={!!selectedScan}
      onClose={() => setSelectedScan(null)}
      title="掃描詳情"
      size="large"
    >
      {selectedScan && (
        <div className="space-y-6">
          {/* 掃描信息 */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">掃描 ID</h4>
                <p className="text-sm text-gray-600">{selectedScan.scanId}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">掃描類型</h4>
                <p className="text-sm text-gray-600">
                  {selectedScan.scanType.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">狀態</h4>
                {renderStatusBadge(selectedScan.status)}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">持續時間</h4>
                <p className="text-sm text-gray-600">
                  {selectedScan.duration ? `${Math.round(selectedScan.duration / 1000)} 秒` : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* 掃描摘要 */}
          {selectedScan.summary && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">掃描摘要</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedScan.summary.bySeverity[SEVERITY_LEVELS.CRITICAL] || 0}
                  </div>
                  <div className="text-sm text-gray-600">嚴重</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedScan.summary.bySeverity[SEVERITY_LEVELS.HIGH] || 0}
                  </div>
                  <div className="text-sm text-gray-600">高</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {selectedScan.summary.bySeverity[SEVERITY_LEVELS.MEDIUM] || 0}
                  </div>
                  <div className="text-sm text-gray-600">中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedScan.summary.bySeverity[SEVERITY_LEVELS.LOW] || 0}
                  </div>
                  <div className="text-sm text-gray-600">低</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {selectedScan.summary.riskScore || 0}
                  </div>
                  <div className="text-sm text-gray-600">風險分數</div>
                </div>
              </div>
            </Card>
          )}

          {/* 掃描結果 */}
          {selectedScan.results && selectedScan.results.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">發現的問題</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedScan.results.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{result.title}</h5>
                      {renderSeverityBadge(result.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                    {result.recommendation && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <h6 className="font-medium text-blue-900 text-sm">建議</h6>
                        <p className="text-sm text-blue-800">{result.recommendation}</p>
                      </div>
                    )}
                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-gray-500">
                          查看詳細信息
                        </summary>
                        <div className="mt-2 text-xs text-gray-600">
                          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 錯誤信息 */}
          {selectedScan.errors && selectedScan.errors.length > 0 && (
            <Card className="p-4 bg-red-50 border-red-200">
              <h4 className="font-medium text-red-900 mb-4">掃描錯誤</h4>
              <div className="space-y-2">
                {selectedScan.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    <span className="font-medium">{error.timestamp}:</span> {error.message}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );

  if (!statistics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500">載入安全掃描數據中...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 總覽統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderStatCard(
          '總掃描次數',
          statistics.totalScans?.toLocaleString() || '0',
          '歷史掃描',
          '🔍'
        )}
        {renderStatCard(
          '活動掃描',
          statistics.activeScans || '0',
          '正在運行',
          '🔄',
          'blue'
        )}
        {renderStatCard(
          '嚴重問題',
          statistics.summary?.criticalIssues || '0',
          '需要立即處理',
          '🚨',
          'red'
        )}
        {renderStatCard(
          '定時掃描',
          statistics.scheduledScans || '0',
          '自動化掃描',
          '⏰',
          'green'
        )}
      </div>

      {/* 快速掃描 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">快速掃描</h3>
          <div className="text-sm text-gray-500">
            選擇要執行的掃描類型
          </div>
        </div>
        {renderScanTypeButtons()}
      </Card>

      {/* 掃描結果 */}
      {renderScanResultsList()}

      {/* 掃描詳情模態框 */}
      {renderScanDetailsModal()}

      {/* 最近掃描 */}
      {statistics.recentScans && statistics.recentScans.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近掃描</h3>
          <div className="space-y-3">
            {statistics.recentScans.slice(0, 5).map((scan, index) => (
              <div key={scan.scanId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    scan.status === SCAN_STATUS.COMPLETED ? 'bg-green-500' :
                    scan.status === SCAN_STATUS.RUNNING ? 'bg-blue-500' :
                    scan.status === SCAN_STATUS.FAILED ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {scan.scanType.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(scan.startTime).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {scan.issuesFound} 個問題
                  </div>
                  <div className="text-sm text-gray-600">
                    風險: {scan.riskScore}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewScanDetails(scan.scanId)}
                  >
                    查看
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SecurityScanDashboard;