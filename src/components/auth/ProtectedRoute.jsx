import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authFlowManager from '../../utils/authFlowManager';

const ProtectedRoute = ({ 
  children, 
  requirePlatforms = [], 
  redirectTo = '/auth',
  fallback = null,
  autoRefresh = true 
}) => {
  const { isAuthenticated, platforms, loading } = useAuth();
  const location = useLocation();
  const [authState, setAuthState] = useState('checking');
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  // 監聽認證流程管理器的狀態變化
  useEffect(() => {
    const unsubscribe = authFlowManager.addStateListener((state, data) => {
      setAuthState(state);
      
      // 如果token刷新失敗，標記為已嘗試
      if (state === 'error' && data.requiresReauth) {
        setRefreshAttempted(true);
      }
    });

    return unsubscribe;
  }, []);

  // 自動嘗試刷新過期的tokens
  useEffect(() => {
    if (!autoRefresh || refreshAttempted || loading) return;

    const attemptTokenRefresh = async () => {
      try {
        // 檢查需要的平台是否有過期的tokens
        for (const platform of requirePlatforms) {
          const platformData = platforms[platform];
          if (platformData && platformData.isConnected) {
            try {
              await authFlowManager.refreshTokenFlow(platform);
            } catch (error) {
              console.warn(`Failed to refresh token for ${platform}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Token refresh attempt failed:', error);
      } finally {
        setRefreshAttempted(true);
      }
    };

    // 如果有必要的平台但未認證，嘗試刷新
    if (requirePlatforms.length > 0 && !isAuthenticated) {
      attemptTokenRefresh();
    }
  }, [requirePlatforms, platforms, isAuthenticated, autoRefresh, refreshAttempted, loading]);

  // 如果正在載入或檢查認證狀態，顯示載入畫面
  if (loading || authState === 'checking' || authState === 'refreshing') {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {authState === 'refreshing' ? '更新認證中...' : '載入中...'}
            </p>
          </div>
        </div>
      )
    );
  }

  // 檢查是否需要特定平台連接
  if (requirePlatforms.length > 0) {
    const connectedPlatforms = Object.entries(platforms)
      .filter(([_, data]) => data.isConnected)
      .map(([platform, _]) => platform);

    const hasRequiredPlatforms = requirePlatforms.every(platform => 
      connectedPlatforms.includes(platform)
    );

    if (!hasRequiredPlatforms) {
      // 重定向到認證頁面，並保存當前位置
      return (
        <Navigate 
          to={redirectTo} 
          state={{ 
            from: location,
            message: `需要連接以下平台：${requirePlatforms.join(', ')}`
          }} 
          replace 
        />
      );
    }
  }

  // 如果需要基本認證但用戶未登入
  if (!isAuthenticated && requirePlatforms.length === 0) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ 
          from: location,
          message: '請先登入以存取此頁面'
        }} 
        replace 
      />
    );
  }

  // 如果所有檢查都通過，渲染子組件
  return children;
};

// 高階組件版本，用於包裝組件
export const withAuth = (
  Component, 
  options = {}
) => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// 用於檢查特定平台權限的hook
export const useRequireAuth = (requirePlatforms = []) => {
  const { isAuthenticated, platforms } = useAuth();
  
  const connectedPlatforms = Object.entries(platforms)
    .filter(([_, data]) => data.isConnected)
    .map(([platform, _]) => platform);

  const hasRequiredPlatforms = requirePlatforms.length === 0 || 
    requirePlatforms.every(platform => connectedPlatforms.includes(platform));

  return {
    isAuthenticated,
    hasRequiredPlatforms,
    connectedPlatforms,
    missingPlatforms: requirePlatforms.filter(platform => 
      !connectedPlatforms.includes(platform)
    )
  };
};

export default ProtectedRoute; 