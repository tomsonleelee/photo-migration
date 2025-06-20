import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useError } from '../../contexts/ErrorContext';

// 錯誤消息組件
const ErrorMessage = ({ 
  error, 
  context = {}, 
  variant = 'default', 
  showActions = true,
  showDetails = false,
  onRetry,
  onDismiss,
  className = '' 
}) => {
  const { retryError, dismissError } = useError();

  // 獲取錯誤圖標
  const getErrorIcon = (type, severity) => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
      case 'error':
        if (severity === 'HIGH') {
          return <XCircle className={`${iconClass} text-red-600`} />;
        }
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-blue-500`} />;
    }
  };

  // 獲取錯誤類型和嚴重程度
  const getErrorType = () => {
    if (error?.classification) {
      return {
        type: 'error',
        severity: error.classification.severity || 'MEDIUM'
      };
    }
    
    // 基於錯誤名稱推斷類型
    if (error?.name?.includes('Success')) return { type: 'success', severity: 'LOW' };
    if (error?.name?.includes('Warning')) return { type: 'warning', severity: 'MEDIUM' };
    if (error?.name?.includes('Info')) return { type: 'info', severity: 'LOW' };
    
    return { type: 'error', severity: 'MEDIUM' };
  };

  // 獲取用戶友好的錯誤消息
  const getUserMessage = () => {
    if (error?.getUserMessage && typeof error.getUserMessage === 'function') {
      return error.getUserMessage();
    }
    
    if (error?.userMessage) {
      return error.userMessage;
    }
    
    return error?.message || '發生了未知錯誤';
  };

  // 獲取建議
  const getSuggestion = () => {
    if (error?.getSuggestion && typeof error.getSuggestion === 'function') {
      return error.getSuggestion();
    }
    
    if (error?.suggestion) {
      return error.suggestion;
    }
    
    // 基於錯誤類型提供默認建議
    if (error?.name?.includes('Network')) {
      return '請檢查您的網路連線，或稍後再試。';
    }
    
    if (error?.name?.includes('Auth')) {
      return '請重新登入您的帳戶。';
    }
    
    if (error?.name?.includes('Permission')) {
      return '請聯繫管理員獲取必要的權限。';
    }
    
    if (error?.name?.includes('Validation')) {
      return '請檢查並修正輸入的資料。';
    }
    
    return '請稍後重試，如果問題持續存在，請聯繫技術支援。';
  };

  // 獲取樣式類別
  const getVariantClasses = (type, severity) => {
    const base = "border rounded-lg";
    
    switch (variant) {
      case 'minimal':
        return `${base} border-l-4 bg-gray-50 border-l-gray-400 p-3`;
      case 'outlined':
        switch (type) {
          case 'success':
            return `${base} border-green-200 bg-green-50 text-green-800`;
          case 'warning':
            return `${base} border-yellow-200 bg-yellow-50 text-yellow-800`;
          case 'error':
            return severity === 'HIGH' 
              ? `${base} border-red-300 bg-red-100 text-red-900`
              : `${base} border-red-200 bg-red-50 text-red-800`;
          case 'info':
          default:
            return `${base} border-blue-200 bg-blue-50 text-blue-800`;
        }
      case 'filled':
        switch (type) {
          case 'success':
            return `${base} bg-green-500 text-white`;
          case 'warning':
            return `${base} bg-yellow-500 text-white`;
          case 'error':
            return severity === 'HIGH' 
              ? `${base} bg-red-600 text-white`
              : `${base} bg-red-500 text-white`;
          case 'info':
          default:
            return `${base} bg-blue-500 text-white`;
        }
      default:
        switch (type) {
          case 'success':
            return `${base} border-green-200 bg-green-50`;
          case 'warning':
            return `${base} border-yellow-200 bg-yellow-50`;
          case 'error':
            return severity === 'HIGH' 
              ? `${base} border-red-300 bg-red-100`
              : `${base} border-red-200 bg-red-50`;
          case 'info':
          default:
            return `${base} border-blue-200 bg-blue-50`;
        }
    }
  };

  // 處理重試
  const handleRetry = async () => {
    if (onRetry) {
      await onRetry();
    } else if (error?.id && retryError) {
      await retryError(error.id);
    }
  };

  // 處理關閉
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else if (error?.id && dismissError) {
      dismissError(error.id);
    }
  };

  // 渲染技術支援連結
  const renderSupportLink = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.open('mailto:support@example.com', '_blank')}
      className="text-xs"
    >
      <MessageCircle className="w-3 h-3 mr-1" />
      聯繫技術支援
    </Button>
  );

  // 渲染幫助連結
  const renderHelpLink = () => {
    const helpUrl = getHelpUrl(error);
    if (!helpUrl) return null;
    
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(helpUrl, '_blank')}
        className="text-xs"
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        獲取幫助
      </Button>
    );
  };

  // 獲取幫助連結
  const getHelpUrl = (error) => {
    if (error?.name?.includes('Network')) {
      return 'https://help.example.com/network-issues';
    }
    if (error?.name?.includes('Auth')) {
      return 'https://help.example.com/authentication';
    }
    if (error?.name?.includes('Migration')) {
      return 'https://help.example.com/migration-guide';
    }
    return null;
  };

  const { type, severity } = getErrorType();
  const userMessage = getUserMessage();
  const suggestion = getSuggestion();
  const canRetry = error?.retryable !== false && (error?.classification?.retryable !== false);

  if (variant === 'toast') {
    return (
      <div className={`flex items-start space-x-3 p-4 ${getVariantClasses(type, severity)} ${className}`}>
        {getErrorIcon(type, severity)}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{userMessage}</div>
          {suggestion && (
            <div className="text-xs mt-1 opacity-75">{suggestion}</div>
          )}
        </div>
        {showActions && (
          <div className="flex items-center space-x-1">
            {canRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs"
            >
              ×
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <Card.Content className={`p-4 ${getVariantClasses(type, severity)}`}>
        <div className="flex items-start space-x-3">
          {getErrorIcon(type, severity)}
          
          <div className="flex-1 min-w-0">
            {/* 主要錯誤消息 */}
            <div className="text-sm font-medium mb-1">
              {userMessage}
            </div>
            
            {/* 建議 */}
            {suggestion && (
              <div className="text-xs text-gray-600 mb-2">
                {suggestion}
              </div>
            )}
            
            {/* 詳細信息（可選） */}
            {showDetails && error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  顯示技術詳情
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                  <div><strong>錯誤類型:</strong> {error.name}</div>
                  <div><strong>錯誤代碼:</strong> {error.code}</div>
                  {error.timestamp && (
                    <div><strong>時間:</strong> {new Date(error.timestamp).toLocaleString()}</div>
                  )}
                  {context.component && (
                    <div><strong>組件:</strong> {context.component}</div>
                  )}
                  {context.operation && (
                    <div><strong>操作:</strong> {context.operation}</div>
                  )}
                </div>
              </details>
            )}
            
            {/* 操作按鈕 */}
            {showActions && (
              <div className="flex items-center space-x-2 mt-3">
                {canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    重試
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                >
                  關閉
                </Button>
                
                {renderHelpLink()}
                {renderSupportLink()}
              </div>
            )}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

// 錯誤消息列表組件
export const ErrorMessageList = ({ 
  errors = [], 
  maxVisible = 3, 
  variant = 'default',
  showActions = true,
  onRetry,
  onDismiss 
}) => {
  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleErrors.map((error, index) => (
        <ErrorMessage
          key={error.id || index}
          error={error}
          variant={variant}
          showActions={showActions}
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      ))}
      
      {hiddenCount > 0 && (
        <div className="text-xs text-gray-500 text-center py-2">
          還有 {hiddenCount} 個錯誤未顯示...
        </div>
      )}
    </div>
  );
};

// 全局錯誤提示組件
export const GlobalErrorBanner = () => {
  const { state, clearGlobalError } = useError();
  
  if (!state.globalError) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <ErrorMessage
        error={state.globalError}
        variant="filled"
        showActions={true}
        onDismiss={clearGlobalError}
        className="rounded-none border-0"
      />
    </div>
  );
};

export default ErrorMessage;