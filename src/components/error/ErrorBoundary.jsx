import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useError } from '../../contexts/ErrorContext';
import { BaseError, ErrorFactory } from '../../utils/errors';

// 錯誤後備 UI 組件
const ErrorFallback = ({ error, resetErrorBoundary, hasError }) => {
  const { addError, reportError } = useError();

  const handleReportError = async () => {
    try {
      await reportError(error, {
        component: 'ErrorBoundary',
        operation: 'Manual Report',
        userAction: 'Report Error'
      });
      
      // 顯示成功消息
      console.log('Error reported successfully');
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  const handleRetry = () => {
    // 清除錯誤狀態並重試
    resetErrorBoundary();
  };

  const handleGoHome = () => {
    // 導航到首頁
    window.location.href = '/';
  };

  // 根據錯誤類型顯示不同的 UI
  const getErrorInfo = () => {
    if (error instanceof BaseError) {
      return {
        title: error.constructor.name,
        message: error.getUserMessage ? error.getUserMessage() : error.message,
        suggestion: error.getSuggestion ? error.getSuggestion() : '請嘗試刷新頁面或聯繫技術支援。',
        retryable: error.retryable,
        userFriendly: error.userFriendly
      };
    }

    // 對於原生 JavaScript 錯誤
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return {
        title: '應用程式錯誤',
        message: '應用程式遇到了意外錯誤。',
        suggestion: '請刷新頁面重試，如果問題持續存在，請聯繫技術支援。',
        retryable: true,
        userFriendly: true
      };
    }

    return {
      title: '未知錯誤',
      message: error.message || '發生了未知錯誤。',
      suggestion: '請嘗試刷新頁面或聯繫技術支援。',
      retryable: true,
      userFriendly: false
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-lg w-full" shadow="lg">
        <Card.Content className="text-center p-8">
          {/* 錯誤圖標 */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-4">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          {/* 錯誤標題 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>

          {/* 錯誤消息 */}
          <p className="text-gray-600 mb-4">
            {errorInfo.message}
          </p>

          {/* 建議 */}
          <p className="text-sm text-gray-500 mb-6">
            {errorInfo.suggestion}
          </p>

          {/* 錯誤詳情（僅開發模式） */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
                顯示錯誤詳情
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-32">
                {error.stack || error.toString()}
              </pre>
            </details>
          )}

          {/* 操作按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {errorInfo.retryable && (
              <Button
                variant="primary"
                onClick={handleRetry}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重試
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首頁
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleReportError}
              size="sm"
            >
              <Bug className="w-4 h-4 mr-2" />
              回報問題
            </Button>
          </div>

          {/* 聯繫資訊 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              如果問題持續發生，請聯繫{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                技術支援
              </a>
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

// 簡化的錯誤後備 UI（用於小組件）
const SimpleErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
    <div className="flex items-center">
      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800">
          載入失敗
        </h3>
        <p className="text-xs text-red-600 mt-1">
          {error.message || '組件載入時發生錯誤'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetErrorBoundary}
        className="text-red-600 hover:text-red-800"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// 主要錯誤邊界組件
export const ErrorBoundary = ({ 
  children, 
  fallback: FallbackComponent = ErrorFallback,
  onError,
  isolate = false
}) => {
  const { addError } = useError();

  const handleError = (error, errorInfo) => {
    // 創建增強的錯誤對象
    const enhancedError = ErrorFactory.createFromNetworkError(error, {
      component: errorInfo.componentStack,
      errorBoundary: true,
      errorInfo
    });

    // 添加到錯誤上下文
    addError(enhancedError, {
      component: 'ErrorBoundary',
      operation: 'Catch Error',
      errorInfo
    });

    // 調用外部錯誤處理器
    if (onError) {
      onError(enhancedError, errorInfo);
    }

    // 在開發模式下記錄錯誤
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleError}
      isolate={isolate}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// 高階組件版本
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// 特殊用途的錯誤邊界
export const ComponentErrorBoundary = ({ children, componentName }) => (
  <ErrorBoundary
    fallback={SimpleErrorFallback}
    onError={(error, errorInfo) => {
      console.warn(`Component "${componentName}" crashed:`, error);
    }}
    isolate={true}
  >
    {children}
  </ErrorBoundary>
);

export const RouteErrorBoundary = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // 可以在這裡添加路由特定的錯誤處理邏輯
      console.error('Route error:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const AsyncErrorBoundary = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // 處理異步操作錯誤
      console.error('Async operation error:', error);
    }}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;