// 隱私保護分析儀表板組件
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  privacyAnalyticsManager, 
  ANALYTICS_EVENTS, 
  AGGREGATION_LEVELS 
} from '../../utils/analytics/privacyAnalytics.js';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';

export const AnalyticsDashboard = ({ 
  userRole = 'user', // user, admin, analyst
  className = '' 
}) => {
  const [statistics, setStatistics] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(ANALYTICS_EVENTS.PAGE_VIEW);
  const [aggregationLevel, setAggregationLevel] = useState(AGGREGATION_LEVELS.DAILY);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 載入分析統計
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // 當參數變化時重新載入報告
  useEffect(() => {
    if (selectedMetric && aggregationLevel) {
      loadReport();
    }
  }, [selectedMetric, aggregationLevel, dateRange, loadReport]);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = privacyAnalyticsManager.getAnalyticsStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load analytics statistics:', error);
    }
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const report = privacyAnalyticsManager.generateAggregatedReport(
        selectedMetric,
        aggregationLevel,
        dateRange
      );
      setReportData(report);
    } catch (error) {
      console.error('Failed to load analytics report:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, aggregationLevel, dateRange]);

  const exportData = useCallback(async (format = 'json') => {
    try {
      const exportedData = privacyAnalyticsManager.exportAnalyticsData({
        eventTypes: [selectedMetric],
        dateRange,
        format
      });

      // 創建下載
      const blob = new Blob([exportedData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${selectedMetric}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
    }
  }, [selectedMetric, dateRange]);

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

  // 渲染圖表（簡化版）
  const renderChart = () => {
    if (!reportData || !reportData.report) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          {loading ? '載入中...' : '無數據'}
        </div>
      );
    }

    const maxValue = Math.max(...reportData.report.map(item => item.count));
    
    return (
      <div className="h-64 flex items-end space-x-2 p-4">
        {reportData.report.map((item, index) => (
          <motion.div
            key={item.period}
            initial={{ height: 0 }}
            animate={{ height: `${(item.count / maxValue) * 100}%` }}
            transition={{ delay: index * 0.1 }}
            className="bg-blue-500 rounded-t flex-1 min-h-[4px] relative group"
          >
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <div>{item.period}</div>
              <div>數量: {item.count}</div>
              <div>會話: {item.uniqueSessions}</div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // 渲染指標選擇器
  const renderMetricSelector = () => {
    const availableMetrics = Object.entries(ANALYTICS_EVENTS).map(([key, value]) => ({
      key,
      value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }));

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇指標
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableMetrics.map(metric => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            聚合級別
          </label>
          <select
            value={aggregationLevel}
            onChange={(e) => setAggregationLevel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={AGGREGATION_LEVELS.HOURLY}>每小時</option>
            <option value={AGGREGATION_LEVELS.DAILY}>每日</option>
            <option value={AGGREGATION_LEVELS.WEEKLY}>每週</option>
            <option value={AGGREGATION_LEVELS.MONTHLY}>每月</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              開始日期
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              結束日期
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染最近活動
  const renderRecentActivity = () => {
    if (!statistics?.topEventTypes) return null;

    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          最近24小時活動
        </h3>
        <div className="space-y-3">
          {statistics.topEventTypes.map((item, index) => (
            <div key={item.eventType} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-green-500' :
                  index === 1 ? 'bg-blue-500' :
                  index === 2 ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <span className="text-sm text-gray-700">
                  {item.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // 渲染隱私聲明
  const renderPrivacyNotice = () => (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start space-x-3">
        <div className="text-blue-500 text-lg">🔒</div>
        <div>
          <h4 className="font-medium text-blue-900">隱私保護</h4>
          <p className="text-sm text-blue-800 mt-1">
            所有顯示的數據都已經過匿名化處理，不包含任何可識別個人身份的資訊。
            我們遵循最嚴格的隱私保護標準。
          </p>
        </div>
      </div>
    </Card>
  );

  if (!statistics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-gray-500">載入分析數據中...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 隱私聲明 */}
      {renderPrivacyNotice()}

      {/* 總覽統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderStatCard(
          '總事件數',
          statistics.totalEvents?.toLocaleString() || '0',
          '所有時間',
          '📊'
        )}
        {renderStatCard(
          '事件類型',
          statistics.totalEventTypes || '0',
          '正在追蹤',
          '📈',
          'green'
        )}
        {renderStatCard(
          '最活躍事件',
          statistics.topEventTypes[0]?.eventType.split('_')[0] || 'N/A',
          `${statistics.topEventTypes[0]?.count || 0} 次`,
          '🔥',
          'yellow'
        )}
        {renderStatCard(
          '數據狀態',
          statistics.isInitialized ? '正常' : '未初始化',
          '系統狀態',
          '✅',
          statistics.isInitialized ? 'green' : 'red'
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 控制面板 */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              分析設定
            </h3>
            {renderMetricSelector()}
            
            <div className="mt-6 space-y-3">
              <Button
                onClick={() => loadReport()}
                loading={loading}
                className="w-full"
              >
                重新載入數據
              </Button>
              
              {userRole === 'admin' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportData('json')}
                  >
                    導出 JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportData('csv')}
                  >
                    導出 CSV
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {renderRecentActivity()}
        </div>

        {/* 主要圖表 */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedMetric.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              {reportData && (
                <div className="text-sm text-gray-500">
                  總計: {reportData.totalEvents} 個事件
                </div>
              )}
            </div>
            
            {renderChart()}
            
            {reportData && reportData.report && (
              <div className="mt-4 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>{reportData.report[0]?.period}</span>
                  <span>{reportData.report[reportData.report.length - 1]?.period}</span>
                </div>
              </div>
            )}
          </Card>

          {/* 詳細指標 */}
          {reportData && reportData.report && (
            <Card className="p-6 mt-6">
              <h4 className="font-medium text-gray-900 mb-4">詳細指標</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        時間期間
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        事件數量
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        唯一會話
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        平均值
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.report.slice(0, 10).map((item, index) => (
                      <tr key={item.period} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.period}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.count}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.uniqueSessions}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.uniqueSessions > 0 ? (item.count / item.uniqueSessions).toFixed(1) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {reportData.report.length > 10 && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                  顯示前 10 個結果，共 {reportData.report.length} 個
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;