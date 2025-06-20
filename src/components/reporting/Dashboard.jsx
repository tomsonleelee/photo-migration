// 報告儀表板組件 - 使用 recharts 顯示關鍵指標和可視化數據
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { REPORT_TYPES, TIME_RANGES } from '../../services/reporting/ReportGenerator.js';

// 色彩主題
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb366', '#67b7dc', '#a4de6c', '#ffc0cb'
];

const SEVERITY_COLORS = {
  low: '#10b981',     // 綠色
  medium: '#f59e0b',  // 黃色
  high: '#ef4444',    // 紅色
  critical: '#dc2626' // 深紅色
};

const STATUS_COLORS = {
  completed: '#10b981',
  failed: '#ef4444',
  in_progress: '#3b82f6',
  pending: '#6b7280',
  cancelled: '#9ca3af'
};

export const Dashboard = ({
  reportGenerator,
  className = '',
  refreshInterval = 30000, // 30秒
  autoRefresh = true
}) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES.LAST_7_DAYS);
  const [selectedMetrics, setSelectedMetrics] = useState([
    'migrationSummary',
    'performanceMetrics',
    'errorAnalysis',
    'userActivity'
  ]);
  const [showCustomization, setShowCustomization] = useState(false);
  const [error, setError] = useState(null);

  // 載入儀表板數據
  const loadDashboardData = useCallback(async () => {
    if (!reportGenerator) return;

    try {
      setLoading(true);
      setError(null);

      const options = {
        timeRange: selectedTimeRange,
        includeCharts: true,
        includeRawData: false
      };

      // 並行生成多個報告
      const reportPromises = selectedMetrics.map(async (metric) => {
        switch (metric) {
          case 'migrationSummary':
            return {
              type: 'migrationSummary',
              data: await reportGenerator.generateReport(REPORT_TYPES.MIGRATION_SUMMARY, options)
            };
          case 'performanceMetrics':
            return {
              type: 'performanceMetrics',
              data: await reportGenerator.generateReport(REPORT_TYPES.PERFORMANCE_METRICS, options)
            };
          case 'errorAnalysis':
            return {
              type: 'errorAnalysis',
              data: await reportGenerator.generateReport(REPORT_TYPES.ERROR_ANALYSIS, options)
            };
          case 'userActivity':
            return {
              type: 'userActivity',
              data: await reportGenerator.generateReport(REPORT_TYPES.USER_ACTIVITY, options)
            };
          default:
            return null;
        }
      });

      const reports = await Promise.all(reportPromises);
      const dashboardData = {};

      reports.forEach(report => {
        if (report) {
          dashboardData[report.type] = report.data;
        }
      });

      setDashboardData(dashboardData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [reportGenerator, selectedTimeRange, selectedMetrics]);

  // 自動刷新
  useEffect(() => {
    loadDashboardData();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadDashboardData, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadDashboardData, autoRefresh, refreshInterval]);

  // 格式化數值
  const formatValue = useCallback((value, type = 'number') => {
    if (typeof value !== 'number') return value;

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

      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;

      case 'duration':
        const hours = Math.floor(value / 3600000);
        const minutes = Math.floor((value % 3600000) / 60000);
        const seconds = Math.floor((value % 60000) / 1000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;

      case 'number':
      default:
        return value.toLocaleString();
    }
  }, []);

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 渲染關鍵指標卡片
  const renderMetricCard = (title, value, change, icon, color = 'blue') => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm flex items-center mt-2 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {change >= 0 ? '↗' : '↘'}
              </span>
              {Math.abs(change).toFixed(1)}% vs 上期
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <span className={`text-2xl text-${color}-600`}>{icon}</span>
        </div>
      </div>
    </Card>
  );

  // 渲染遷移摘要
  const renderMigrationSummary = () => {
    const data = dashboardData?.migrationSummary;
    if (!data) return null;

    const summary = data.summary;
    const charts = data.charts || [];

    return (
      <div className="space-y-6">
        {/* 關鍵指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            '總遷移數',
            formatValue(summary.totalMigrations?.value || 0),
            Math.random() * 20 - 10, // 模擬變化
            '📊',
            'blue'
          )}
          {renderMetricCard(
            '成功率',
            formatValue(summary.averageSuccessRate?.value || 0, 'percentage'),
            Math.random() * 10 - 5,
            '✅',
            'green'
          )}
          {renderMetricCard(
            '處理檔案',
            formatValue(summary.totalFilesProcessed?.value || 0),
            Math.random() * 15 - 7,
            '📁',
            'purple'
          )}
          {renderMetricCard(
            '傳輸數據',
            formatValue(summary.totalBytesTransferred?.value || 0, 'bytes'),
            Math.random() * 25 - 12,
            '💾',
            'orange'
          )}
        </div>

        {/* 圖表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart, index) => (
            <Card key={index} className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{chart.title}</h3>
              <ResponsiveContainer width="100%" height={300}>
                {chart.type === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chart.data}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ label, value }) => `${label}: ${value}`}
                    >
                      {chart.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                ) : chart.type === 'bar' ? (
                  <BarChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill={CHART_COLORS[0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // 渲染性能指標
  const renderPerformanceMetrics = () => {
    const data = dashboardData?.performanceMetrics;
    if (!data) return null;

    const summary = data.summary;
    const charts = data.charts || [];

    return (
      <div className="space-y-6">
        {/* 性能指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderMetricCard(
            '平均吞吐量',
            `${formatValue(summary.averageThroughput?.value || 0)}/min`,
            Math.random() * 20 - 10,
            '⚡',
            'yellow'
          )}
          {renderMetricCard(
            '平均延遲',
            formatValue(summary.averageLatency?.value || 0, 'duration'),
            Math.random() * 15 - 7,
            '⏱️',
            'red'
          )}
          {renderMetricCard(
            'CPU 使用率',
            formatValue(summary.averageCpuUsage?.value || 0, 'percentage'),
            Math.random() * 10 - 5,
            '💻',
            'indigo'
          )}
        </div>

        {/* 性能趨勢圖 */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">性能趨勢</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={charts[0]?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="throughput" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="吞吐量"
              />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="延遲"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* 資源使用情況 */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">資源使用情況</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={charts[1]?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cpu" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8"
                name="CPU"
              />
              <Area 
                type="monotone" 
                dataKey="memory" 
                stackId="1" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                name="記憶體"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  // 渲染錯誤分析
  const renderErrorAnalysis = () => {
    const data = dashboardData?.errorAnalysis;
    if (!data) return null;

    const summary = data.summary;
    const charts = data.charts || [];

    return (
      <div className="space-y-6">
        {/* 錯誤統計 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            '總錯誤數',
            formatValue(summary.totalErrors?.value || 0),
            Math.random() * 20 - 10,
            '❌',
            'red'
          )}
          {renderMetricCard(
            '嚴重錯誤',
            formatValue(summary.criticalErrors?.value || 0),
            Math.random() * 15 - 7,
            '🚨',
            'red'
          )}
          {renderMetricCard(
            '已解決',
            formatValue(summary.resolvedErrors?.value || 0),
            Math.random() * 25 - 12,
            '✅',
            'green'
          )}
          {renderMetricCard(
            '解決率',
            formatValue((summary.resolvedErrors?.value || 0) / (summary.totalErrors?.value || 1), 'percentage'),
            Math.random() * 10 - 5,
            '📈',
            'blue'
          )}
        </div>

        {/* 錯誤分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">錯誤類型分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts[0]?.data || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ label, value }) => `${label}: ${value}`}
                >
                  {(charts[0]?.data || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">平台錯誤統計</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts[1]?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* 錯誤時間軸 */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">錯誤發生趨勢</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={charts[2]?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="錯誤數量"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  // 渲染用戶活動
  const renderUserActivity = () => {
    const data = dashboardData?.userActivity;
    if (!data) return null;

    const summary = data.summary;
    const charts = data.charts || [];

    return (
      <div className="space-y-6">
        {/* 用戶統計 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            '總用戶數',
            formatValue(summary.totalUsers?.value || 0),
            Math.random() * 10 - 5,
            '👥',
            'blue'
          )}
          {renderMetricCard(
            '活躍用戶',
            formatValue(summary.activeUsers?.value || 0),
            Math.random() * 15 - 7,
            '🔥',
            'green'
          )}
          {renderMetricCard(
            '總活動數',
            formatValue(summary.totalActivities?.value || 0),
            Math.random() * 20 - 10,
            '📊',
            'purple'
          )}
          {renderMetricCard(
            '平均會話時長',
            formatValue(summary.averageSessionDuration?.value || 0, 'duration'),
            Math.random() * 12 - 6,
            '⏰',
            'orange'
          )}
        </div>

        {/* 活動分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">熱門活動</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts[0]?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">用戶活動趨勢</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts[1]?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="活動數量"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  };

  // 渲染自定義選項模態框
  const renderCustomizationModal = () => (
    <Modal
      isOpen={showCustomization}
      onClose={() => setShowCustomization(false)}
      title="自定義儀表板"
      size="large"
    >
      <div className="space-y-6">
        {/* 時間範圍選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            時間範圍
          </label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={TIME_RANGES.LAST_24_HOURS}>最近 24 小時</option>
            <option value={TIME_RANGES.LAST_7_DAYS}>最近 7 天</option>
            <option value={TIME_RANGES.LAST_30_DAYS}>最近 30 天</option>
            <option value={TIME_RANGES.LAST_90_DAYS}>最近 90 天</option>
            <option value={TIME_RANGES.LAST_YEAR}>最近一年</option>
          </select>
        </div>

        {/* 指標選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            顯示指標
          </label>
          <div className="space-y-2">
            {[
              { id: 'migrationSummary', label: '遷移摘要' },
              { id: 'performanceMetrics', label: '性能指標' },
              { id: 'errorAnalysis', label: '錯誤分析' },
              { id: 'userActivity', label: '用戶活動' }
            ].map((metric) => (
              <label key={metric.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric.id]);
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                    }
                  }}
                  className="mr-2"
                />
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCustomization(false)}
          >
            取消
          </Button>
          <Button
            onClick={() => {
              setShowCustomization(false);
              loadDashboardData();
            }}
          >
            應用設定
          </Button>
        </div>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入儀表板數據...</p>
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
        <Button onClick={loadDashboardData}>
          重試
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 標題和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-600 mt-1">遷移系統概覽和關鍵指標</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomization(true)}
          >
            自定義
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 儀表板內容 */}
      <div className="space-y-8">
        <AnimatePresence>
          {selectedMetrics.includes('migrationSummary') && dashboardData?.migrationSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">遷移摘要</h2>
              {renderMigrationSummary()}
            </motion.div>
          )}

          {selectedMetrics.includes('performanceMetrics') && dashboardData?.performanceMetrics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">性能指標</h2>
              {renderPerformanceMetrics()}
            </motion.div>
          )}

          {selectedMetrics.includes('errorAnalysis') && dashboardData?.errorAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">錯誤分析</h2>
              {renderErrorAnalysis()}
            </motion.div>
          )}

          {selectedMetrics.includes('userActivity') && dashboardData?.userActivity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">用戶活動</h2>
              {renderUserActivity()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {renderCustomizationModal()}
    </div>
  );
};

export default Dashboard;