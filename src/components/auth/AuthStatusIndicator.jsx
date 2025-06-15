import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authFlowManager from '../../utils/authFlowManager';
import logoutManager from '../../utils/logoutManager';

const AuthStatusIndicator = ({ 
  className = '',
  showDetails = false,
  onLogout = null 
}) => {
  const { platforms, loading, logout } = useAuth();
  const [authState, setAuthState] = useState('idle');
  const [authSummary, setAuthSummary] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 監聽認證流程狀態
  useEffect(() => {
    const unsubscribe = authFlowManager.addStateListener((state, data) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  // 獲取認證摘要
  useEffect(() => {
    const fetchAuthSummary = async () => {
      try {
        const summary = await authFlowManager.getAuthSummary();
        setAuthSummary(summary);
      } catch (error) {
        console.error('Failed to fetch auth summary:', error);
      }
    };

    fetchAuthSummary();
    
    // 定期更新摘要
    const interval = setInterval(fetchAuthSummary, 30000); // 每30秒更新一次
    return () => clearInterval(interval);
  }, [platforms]);

  // 獲取連接的平台
  const connectedPlatforms = Object.entries(platforms)
    .filter(([_, data]) => data.isConnected)
    .map(([platform, data]) => ({ platform, ...data }));

  // 處理登出
  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 處理單平台斷開
  const handleDisconnectPlatform = async (platform) => {
    try {
      await authFlowManager.logoutFlow(platform);
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
    }
  };

  // 獲取狀態顏色
  const getStatusColor = (state) => {
    switch (state) {
      case 'authenticated':
        return 'text-green-600 bg-green-100';
      case 'authenticating':
      case 'refreshing':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'logout':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // 獲取狀態文字
  const getStatusText = (state) => {
    switch (state) {
      case 'authenticated':
        return '已認證';
      case 'authenticating':
        return '認證中';
      case 'refreshing':
        return '更新中';
      case 'error':
        return '錯誤';
      case 'logout':
        return '登出中';
      default:
        return '閒置';
    }
  };

  // 獲取平台顯示名稱
  const getPlatformDisplayName = (platform) => {
    const names = {
      google: 'Google Photos',
      facebook: 'Facebook',
      instagram: 'Instagram',
      flickr: 'Flickr',
      '500px': '500px'
    };
    return names[platform] || platform;
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">載入中...</span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 主要狀態指示器 */}
      <div className="flex items-center space-x-3">
        {/* 狀態標籤 */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(authState)}`}>
          {getStatusText(authState)}
        </div>

        {/* 連接的平台數量 */}
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-600">
            {connectedPlatforms.length} 個平台已連接
          </span>
          
          {connectedPlatforms.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isExpanded ? '收起' : '詳情'}
            </button>
          )}
        </div>

        {/* 登出按鈕 */}
        {connectedPlatforms.length > 0 && (
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
            disabled={authFlowManager.isBusy()}
          >
            全部登出
          </button>
        )}
      </div>

      {/* 詳細資訊 */}
      {isExpanded && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">已連接的平台：</h4>
          
          <div className="space-y-2">
            {connectedPlatforms.map(({ platform, user }) => (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">
                    {getPlatformDisplayName(platform)}
                  </span>
                  {user && (
                    <span className="text-xs text-gray-500">
                      ({user.name || user.email})
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleDisconnectPlatform(platform)}
                  className="text-xs text-red-600 hover:text-red-800"
                  disabled={authFlowManager.isBusy()}
                >
                  斷開
                </button>
              </div>
            ))}
          </div>

          {/* 認證摘要（如果啟用詳細模式） */}
          {showDetails && authSummary && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="text-xs font-medium text-gray-700 mb-1">系統狀態：</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <div>當前狀態: {authSummary.currentState}</div>
                <div>活躍會話: {authSummary.hasActiveSessions ? '是' : '否'}</div>
                {Object.keys(authSummary.retryAttempts).length > 0 && (
                  <div>重試次數: {JSON.stringify(authSummary.retryAttempts)}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthStatusIndicator; 