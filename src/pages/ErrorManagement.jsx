import { useState } from 'react';
import { AlertTriangle, BarChart3, Settings, RefreshCw } from 'lucide-react';
import { useError } from '../contexts/ErrorContext';
import EnhancedErrorLog from '../components/error/EnhancedErrorLog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ErrorManagement = () => {
  const { state, clearErrors, updateSettings, retryManager } = useError();
  const [activeTab, setActiveTab] = useState('errors');

  // 錯誤統計摘要
  const errorSummary = {
    total: state.errors.length,
    active: state.errors.filter(e => !e.dismissed && e.status === 'active').length,
    retrying: state.errors.filter(e => e.status === 'retrying').length,
    resolved: state.errors.filter(e => e.status === 'resolved').length,
    dismissed: state.dismissedErrors.length,
    critical: state.errors.filter(e => e.severity === 'critical').length,
    recent: state.errors.filter(e => 
      new Date() - new Date(e.context.timestamp) < 60 * 60 * 1000
    ).length
  };

  // 重試統計
  const retryStats = retryManager?.getStats() || {
    totalOperations: 0,
    successRate: 0,
    totalRetries: 0,
    activeRetries: []
  };

  const tabs = [
    { id: 'errors', label: '錯誤日誌', icon: AlertTriangle },
    { id: 'analytics', label: '錯誤分析', icon: BarChart3 },
    { id: 'settings', label: '設定', icon: Settings }
  ];

  const handleSettingsUpdate = (newSettings) => {
    updateSettings(newSettings);
  };

  const renderErrorAnalytics = () => (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總錯誤數</p>
              <p className="text-2xl font-bold text-gray-900">{errorSummary.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">活躍錯誤</p>
              <p className="text-2xl font-bold text-red-600">{errorSummary.active}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">重試中</p>
              <p className="text-2xl font-bold text-blue-600">{errorSummary.retrying}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">已解決</p>
              <p className="text-2xl font-bold text-green-600">{errorSummary.resolved}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 錯誤分類統計 */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">錯誤分類統計</h3>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {Object.entries(state.errorStats.errorsByCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{category}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(count / errorSummary.total * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* 重試統計 */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">重試統計</h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {retryStats.totalOperations}
              </p>
              <p className="text-sm text-gray-600">總操作數</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {(retryStats.successRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">成功率</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {retryStats.totalRetries}
              </p>
              <p className="text-sm text-gray-600">總重試次數</p>
            </div>
          </div>

          {retryStats.activeRetries.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-2">進行中的重試</h4>
              <div className="space-y-2">
                {retryStats.activeRetries.map((retry) => (
                  <div key={retry.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{retry.operation}</span>
                    <span className="text-blue-600">
                      {retry.attempts}/{retry.maxAttempts} 次
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">錯誤處理設定</h3>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">自動重試</span>
              <input
                type="checkbox"
                checked={state.settings.autoRetryEnabled}
                onChange={(e) => handleSettingsUpdate({ autoRetryEnabled: e.target.checked })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">顯示錯誤通知</span>
              <input
                type="checkbox"
                checked={state.settings.showErrorNotifications}
                onChange={(e) => handleSettingsUpdate({ showErrorNotifications: e.target.checked })}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">錯誤報告</span>
              <input
                type="checkbox"
                checked={state.settings.errorReportingEnabled}
                onChange={(e) => handleSettingsUpdate({ errorReportingEnabled: e.target.checked })}
                className="rounded"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大錯誤歷史記錄
              </label>
              <input
                type="number"
                value={state.settings.maxErrorHistory}
                onChange={(e) => handleSettingsUpdate({ maxErrorHistory: parseInt(e.target.value) })}
                min="100"
                max="10000"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">重試設定</h3>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              重試設定由系統自動管理，依據錯誤類型和嚴重程度調整重試策略。
            </p>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-1">當前重試策略</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 網路錯誤：最多3次重試，指數退避</li>
                <li>• 速率限制：依據 Retry-After 標頭</li>
                <li>• 檔案操作：最多5次重試，較長間隔</li>
                <li>• 認證錯誤：不重試，需要用戶介入</li>
              </ul>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">危險操作</h3>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={clearErrors}
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
            >
              清除所有錯誤記錄
            </Button>
            
            <p className="text-xs text-gray-500">
              此操作將永久刪除所有錯誤記錄，包括統計資料。
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">錯誤管理</h1>
          <p className="text-gray-600 mt-2">
            監控和管理系統錯誤，查看錯誤統計和重試狀態
          </p>
        </div>

        {/* 快速摘要 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{errorSummary.critical}</p>
              <p className="text-sm text-gray-600">關鍵錯誤</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{errorSummary.active}</p>
              <p className="text-sm text-gray-600">活躍錯誤</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{errorSummary.recent}</p>
              <p className="text-sm text-gray-600">最近1小時</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {errorSummary.total > 0 ? ((errorSummary.resolved / errorSummary.total) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-gray-600">解決率</p>
            </div>
          </div>
        </div>

        {/* 標籤頁導航 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'errors' && (
              <EnhancedErrorLog 
                showStats={true}
                showControls={true}
                maxHeight="70vh"
              />
            )}
            {activeTab === 'analytics' && renderErrorAnalytics()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorManagement;