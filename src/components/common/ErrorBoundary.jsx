import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from '../ui/Button';

// 錯誤報告服務
class ErrorReportingService {
  static instance = null;

  constructor() {
    this.config = {
      enableConsoleLog: true,
      enableLocalStorage: true,
      enableRemoteReporting: false,
      remoteEndpoint: null,
      maxLocalErrors: 100
    };
  }

  static getInstance() {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }

  async reportError(error, errorInfo, context = {}) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: context.userId || 'anonymous',
        sessionId: this.getSessionId(),
        ...context
      },
      id: this.generateErrorId()
    };

    // 控制台記錄
    if (this.config.enableConsoleLog) {
      console.group('🔥 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', errorReport.context);
      console.groupEnd();
    }

    // 本地存儲
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage(errorReport);
    }

    // 遠程報告
    if (this.config.enableRemoteReporting && this.config.remoteEndpoint) {
      try {
        await this.sendToRemote(errorReport);
      } catch (reportingError) {
        console.error('Failed to report error to remote service:', reportingError);
      }
    }

    return errorReport.id;
  }

  saveToLocalStorage(errorReport) {
    try {
      const stored = localStorage.getItem('photo-migration-errors');
      const errors = stored ? JSON.parse(stored) : [];
      
      errors.unshift(errorReport);
      
      // 限制錯誤數量
      if (errors.length > this.config.maxLocalErrors) {
        errors.splice(this.config.maxLocalErrors);
      }
      
      localStorage.setItem('photo-migration-errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to save error to localStorage:', e);
    }
  }

  async sendToRemote(errorReport) {
    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorReport)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('photo-migration-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('photo-migration-session-id', sessionId);
    }
    return sessionId;
  }

  getStoredErrors() {
    try {
      const stored = localStorage.getItem('photo-migration-errors');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Failed to retrieve errors from localStorage:', e);
      return [];
    }
  }

  clearStoredErrors() {
    try {
      localStorage.removeItem('photo-migration-errors');
    } catch (e) {
      console.warn('Failed to clear errors from localStorage:', e);
    }
  }
}

// 預設錯誤 UI 組件
const DefaultErrorFallback = ({ 
  error, 
  errorInfo, 
  resetError, 
  onReportError,
  showDetails = false 
}) => {
  const [detailsVisible, setDetailsVisible] = React.useState(showDetails);
  const [reportSent, setReportSent] = React.useState(false);

  const handleSendReport = async () => {
    if (onReportError) {
      try {
        await onReportError(error, errorInfo);
        setReportSent(true);
      } catch (e) {
        console.error('Failed to send error report:', e);
      }
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        {/* 錯誤圖標 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* 錯誤標題 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            糟糕！發生了錯誤
          </h1>
          <p className="text-gray-600">
            應用程式遇到了無法處理的錯誤。請嘗試重新載入頁面或回到首頁。
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-sm font-medium text-red-800 mb-2">錯誤訊息：</h3>
            <p className="text-sm text-red-700 font-mono">
              {error.message || '未知錯誤'}
            </p>
          </div>
        )}

        {/* 動作按鈕 */}
        <div className="space-y-3 mb-6">
          <Button 
            onClick={resetError}
            className="w-full flex items-center justify-center space-x-2"
            variant="primary"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重試</span>
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={reloadPage}
              variant="outline"
              className="flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重新載入</span>
            </Button>

            <Button 
              onClick={goHome}
              variant="outline"
              className="flex items-center justify-center space-x-1"
            >
              <Home className="w-4 h-4" />
              <span>回到首頁</span>
            </Button>
          </div>
        </div>

        {/* 錯誤報告 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">幫助我們改善應用程式</span>
            {!reportSent ? (
              <Button
                onClick={handleSendReport}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1"
              >
                <Bug className="w-3 h-3" />
                <span>發送報告</span>
              </Button>
            ) : (
              <span className="text-sm text-green-600">✓ 報告已發送</span>
            )}
          </div>

          <button
            onClick={() => setDetailsVisible(!detailsVisible)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {detailsVisible ? '隱藏' : '顯示'}技術詳細資訊
          </button>

          {detailsVisible && (
            <div className="mt-3 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
              <div className="mb-2">
                <strong>Error:</strong> {error?.name || 'Unknown'}
              </div>
              <div className="mb-2">
                <strong>Message:</strong> {error?.message || 'No message'}
              </div>
              <div className="mb-2">
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap text-gray-600">
                  {error?.stack || 'No stack trace'}
                </pre>
              </div>
              {errorInfo && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-gray-600">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Error Boundary 主類別
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };

    this.reportingService = ErrorReportingService.getInstance();
    
    // 配置錯誤報告服務
    if (props.errorReportingConfig) {
      this.reportingService.configure(props.errorReportingConfig);
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    try {
      // 報告錯誤
      const errorId = await this.reportingService.reportError(
        error,
        errorInfo,
        {
          component: this.props.name || 'ErrorBoundary',
          userId: this.props.userId,
          ...this.props.context
        }
      );

      this.setState({ errorId });

      // 調用外部錯誤處理器
      if (this.props.onError) {
        this.props.onError(error, errorInfo, errorId);
      }

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReportError = async (error, errorInfo) => {
    return this.reportingService.reportError(
      error,
      errorInfo,
      {
        component: this.props.name || 'ErrorBoundary',
        userId: this.props.userId,
        manual: true,
        ...this.props.context
      }
    );
  };

  render() {
    if (this.state.hasError) {
      // 使用自定義錯誤組件或預設組件
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.handleReset}
          onReportError={this.handleReportError}
          {...this.props.fallbackProps}
        />
      );
    }

    return this.props.children;
  }
}

// 高階組件：為組件添加錯誤邊界
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary
      name={WrappedComponent.displayName || WrappedComponent.name}
      {...errorBoundaryProps}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
};

// Hook：在函數組件中處理錯誤
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};

// 錯誤工具函數
export const ErrorBoundaryUtils = {
  // 獲取儲存的錯誤
  getStoredErrors: () => ErrorReportingService.getInstance().getStoredErrors(),
  
  // 清除儲存的錯誤
  clearStoredErrors: () => ErrorReportingService.getInstance().clearStoredErrors(),
  
  // 配置錯誤報告
  configureErrorReporting: (config) => ErrorReportingService.getInstance().configure(config),
  
  // 手動報告錯誤
  reportError: (error, context = {}) => ErrorReportingService.getInstance().reportError(
    error,
    { componentStack: 'Manual Report' },
    context
  )
};

export default ErrorBoundary;