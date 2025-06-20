import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Activity,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Form from '../ui/Form';
import { useError } from '../../contexts/ErrorContext';
import { globalBatchErrorHandler } from '../../utils/batchErrorHandler';

const ErrorAnalytics = ({ className = '' }) => {
  const { state } = useError();
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);

  // 時間範圍選項
  const timeRangeOptions = [
    { value: '1d', label: '過去24小時' },
    { value: '7d', label: '過去7天' },
    { value: '30d', label: '過去30天' },
    { value: '90d', label: '過去90天' }
  ];

  // 圖表顏色
  const COLORS = {
    HIGH: '#dc2626',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    CRITICAL: '#991b1b'
  };

  // 計算分析數據
  const computedAnalytics = useMemo(() => {
    const errors = state.errors || [];
    const cutoffTime = new Date();
    
    // 計算時間範圍
    switch (timeRange) {
      case '1d':
        cutoffTime.setDate(cutoffTime.getDate() - 1);
        break;
      case '7d':
        cutoffTime.setDate(cutoffTime.getDate() - 7);
        break;
      case '30d':
        cutoffTime.setDate(cutoffTime.getDate() - 30);
        break;
      case '90d':
        cutoffTime.setDate(cutoffTime.getDate() - 90);
        break;
    }

    // 過濾時間範圍內的錯誤
    const filteredErrors = errors.filter(error => {
      const errorTime = new Date(error.context?.timestamp || error.timestamp);
      return errorTime >= cutoffTime;
    });

    // 按類別過濾
    const categoryFilteredErrors = selectedCategory === 'all' 
      ? filteredErrors 
      : filteredErrors.filter(error => error.category === selectedCategory);

    return {
      totalErrors: categoryFilteredErrors.length,
      resolvedErrors: categoryFilteredErrors.filter(e => e.status === 'resolved').length,
      activeErrors: categoryFilteredErrors.filter(e => e.status === 'active').length,
      retriedErrors: categoryFilteredErrors.filter(e => e.retryCount > 0).length,
      errors: categoryFilteredErrors
    };
  }, [state.errors, timeRange, selectedCategory]);

  // 生成趨勢數據
  const trendData = useMemo(() => {
    const { errors } = computedAnalytics;
    const days = timeRange === '1d' ? 24 : (timeRange === '7d' ? 7 : (timeRange === '30d' ? 30 : 90));
    const interval = timeRange === '1d' ? 'hour' : 'day';
    
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (interval === 'hour') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }

      const dayErrors = errors.filter(error => {
        const errorDate = new Date(error.context?.timestamp || error.timestamp);
        if (interval === 'hour') {
          return errorDate.getHours() === date.getHours() && 
                 errorDate.toDateString() === date.toDateString();
        } else {
          return errorDate.toDateString() === date.toDateString();
        }
      });

      data.push({
        date: interval === 'hour' ? date.getHours() + ':00' : date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        total: dayErrors.length,
        resolved: dayErrors.filter(e => e.status === 'resolved').length,
        active: dayErrors.filter(e => e.status === 'active').length
      });
    }

    return data;
  }, [computedAnalytics, timeRange]);

  // 按嚴重程度分組
  const severityData = useMemo(() => {
    const { errors } = computedAnalytics;
    const severityCount = {};
    
    errors.forEach(error => {
      const severity = error.classification?.severity || error.severity || 'MEDIUM';
      severityCount[severity] = (severityCount[severity] || 0) + 1;
    });

    return Object.entries(severityCount).map(([severity, count]) => ({
      name: severity,
      value: count,
      color: COLORS[severity] || COLORS.MEDIUM
    }));
  }, [computedAnalytics]);

  // 按類別分組
  const categoryData = useMemo(() => {
    const { errors } = computedAnalytics;
    const categoryCount = {};
    
    errors.forEach(error => {
      const category = error.classification?.category || error.category || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 只顯示前10個
  }, [computedAnalytics]);

  // 組件錯誤統計
  const componentData = useMemo(() => {
    const { errors } = computedAnalytics;
    const componentCount = {};
    
    errors.forEach(error => {
      const component = error.context?.component || 'Unknown';
      componentCount[component] = (componentCount[component] || 0) + 1;
    });

    return Object.entries(componentCount)
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [computedAnalytics]);

  // 重試成功率
  const retrySuccessRate = useMemo(() => {
    const { retriedErrors } = computedAnalytics;
    if (retriedErrors === 0) return 0;
    
    const { resolvedErrors } = computedAnalytics;
    const retriedResolvedErrors = computedAnalytics.errors.filter(
      e => e.retryCount > 0 && e.status === 'resolved'
    ).length;
    
    return Math.round((retriedResolvedErrors / retriedErrors) * 100);
  }, [computedAnalytics]);

  // 錯誤解決率
  const resolutionRate = useMemo(() => {
    const { totalErrors, resolvedErrors } = computedAnalytics;
    return totalErrors === 0 ? 0 : Math.round((resolvedErrors / totalErrors) * 100);
  }, [computedAnalytics]);

  // 獲取批次分析數據
  useEffect(() => {
    const batchStats = globalBatchErrorHandler.getBatchStats();
    const analysisReport = globalBatchErrorHandler.getAnalysisReport();
    setAnalyticsData({ batchStats, analysisReport });
  }, [timeRange]);

  // 導出報告
  const handleExportReport = () => {
    const report = {
      timeRange,
      selectedCategory,
      summary: {
        totalErrors: computedAnalytics.totalErrors,
        resolvedErrors: computedAnalytics.resolvedErrors,
        activeErrors: computedAnalytics.activeErrors,
        resolutionRate,
        retrySuccessRate
      },
      trends: trendData,
      byCategory: categoryData,
      byComponent: componentData,
      bySeverity: severityData,
      batchAnalysis: analyticsData,
      recommendations: analyticsData?.analysisReport?.recommendations || [],
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>錯誤分析報告</Card.Title>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">所有類別</option>
                  <option value="NetworkError">網路錯誤</option>
                  <option value="ApiError">API 錯誤</option>
                  <option value="AuthenticationError">認證錯誤</option>
                  <option value="FileError">檔案錯誤</option>
                  <option value="ValidationError">驗證錯誤</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
              >
                <Download className="w-4 h-4 mr-2" />
                導出報告
              </Button>
            </div>
          </div>
        </Card.Header>
      </Card>

      {/* 關鍵指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">總錯誤數</p>
                <p className="text-2xl font-bold text-gray-900">{computedAnalytics.totalErrors}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">活動錯誤</p>
                <p className="text-2xl font-bold text-red-600">{computedAnalytics.activeErrors}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">解決率</p>
                <p className="text-2xl font-bold text-green-600">{resolutionRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">重試成功率</p>
                <p className="text-2xl font-bold text-blue-600">{retrySuccessRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* 錯誤趨勢圖 */}
      <Card>
        <Card.Header>
          <Card.Title>錯誤趨勢</Card.Title>
        </Card.Header>
        <Card.Content>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="總計" />
              <Line type="monotone" dataKey="active" stroke="#dc2626" name="活動" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" name="已解決" />
            </LineChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 按嚴重程度分佈 */}
        <Card>
          <Card.Header>
            <Card.Title>錯誤嚴重程度分佈</Card.Title>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* 按類別分佈 */}
        <Card>
          <Card.Header>
            <Card.Title>錯誤類別分佈</Card.Title>
          </Card.Header>
          <Card.Content>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
      </div>

      {/* 組件錯誤統計 */}
      <Card>
        <Card.Header>
          <Card.Title>組件錯誤統計</Card.Title>
        </Card.Header>
        <Card.Content>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={componentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="component" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      {/* 改進建議 */}
      {analyticsData?.analysisReport?.recommendations && analyticsData.analysisReport.recommendations.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>改進建議</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {analyticsData.analysisReport.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border-l-4 ${
                    recommendation.priority === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                    recommendation.priority === 'HIGH' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      recommendation.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'HIGH' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {recommendation.priority}
                    </span>
                    <span className="text-xs text-gray-500">{recommendation.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{recommendation.message}</p>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default ErrorAnalytics;