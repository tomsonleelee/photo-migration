import React, { createContext, useContext, useReducer, useEffect } from 'react';
import tokenStorage from '../utils/tokenStorage';
import tokenValidator from '../utils/tokenValidator';
import logoutManager from '../utils/logoutManager';
import authFlowManager from '../utils/authFlowManager';

// 認證狀態的初始值
const initialState = {
  isAuthenticated: false,
  user: null,
  platforms: {
    google: { isConnected: false, token: null, user: null },
    facebook: { isConnected: false, token: null, user: null },
    instagram: { isConnected: false, token: null, user: null },
    flickr: { isConnected: false, token: null, user: null },
    fiveHundredPx: { isConnected: false, token: null, user: null }
  },
  loading: false,
  error: null
};

// 認證動作類型
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  PLATFORM_CONNECT: 'PLATFORM_CONNECT',
  PLATFORM_DISCONNECT: 'PLATFORM_DISCONNECT',
  UPDATE_USER: 'UPDATE_USER'
};

// 認證狀態reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        loading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        platforms: {
          google: { isConnected: false, token: null, user: null },
          facebook: { isConnected: false, token: null, user: null },
          instagram: { isConnected: false, token: null, user: null },
          flickr: { isConnected: false, token: null, user: null },
          fiveHundredPx: { isConnected: false, token: null, user: null }
        }
      };
    
    case AUTH_ACTIONS.PLATFORM_CONNECT:
      return {
        ...state,
        platforms: {
          ...state.platforms,
          [action.payload.platform]: {
            isConnected: true,
            token: action.payload.token,
            user: action.payload.user
          }
        }
      };
    
    case AUTH_ACTIONS.PLATFORM_DISCONNECT:
      return {
        ...state,
        platforms: {
          ...state.platforms,
          [action.payload.platform]: {
            isConnected: false,
            token: null,
            user: null
          }
        }
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    default:
      return state;
  }
}

// 創建Context
const AuthContext = createContext();

// AuthProvider組件
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // 定期token驗證的interval ID
  const [validationIntervalId, setValidationIntervalId] = React.useState(null);

  // 從安全儲存恢復認證狀態
  useEffect(() => {
    const restoreAuthState = async () => {
      try {
        // 獲取基本認證狀態（不包含敏感token）
        const savedAuth = localStorage.getItem('authState');
        if (savedAuth) {
          const parsedAuth = JSON.parse(savedAuth);
          if (parsedAuth.isAuthenticated) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: { user: parsedAuth.user }
            });
          }
        }

        // 恢復平台連接狀態（從安全儲存獲取token）
        const storedPlatforms = await tokenStorage.getStoredPlatforms();
        for (const platform of storedPlatforms) {
          const token = await tokenStorage.getToken(platform);
          if (token) {
            // 從localStorage獲取用戶資訊（非敏感資料）
            const userInfo = savedAuth ? 
              JSON.parse(savedAuth).platforms?.[platform]?.user : null;
            
            dispatch({
              type: AUTH_ACTIONS.PLATFORM_CONNECT,
              payload: {
                platform,
                token, // 從安全儲存獲取
                user: userInfo
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        localStorage.removeItem('authState');
        await tokenStorage.clearAllTokens();
      }
    };

    restoreAuthState();
  }, []);

  // 啟動定期token驗證
  useEffect(() => {
    const connectedPlatforms = Object.values(state.platforms).some(p => p.isConnected);
    
    if (connectedPlatforms && !validationIntervalId) {
      // 啟動定期驗證（每30分鐘）
      const intervalId = tokenValidator.startTokenValidationScheduler(30);
      setValidationIntervalId(intervalId);
    } else if (!connectedPlatforms && validationIntervalId) {
      // 停止定期驗證
      tokenValidator.stopTokenValidationScheduler(validationIntervalId);
      setValidationIntervalId(null);
    }

    // 清理函數
    return () => {
      if (validationIntervalId) {
        tokenValidator.stopTokenValidationScheduler(validationIntervalId);
      }
    };
  }, [state.platforms, validationIntervalId]);

  // 保存認證狀態（不包含敏感token）
  useEffect(() => {
    const saveAuthState = async () => {
      if (state.isAuthenticated || Object.values(state.platforms).some(p => p.isConnected)) {
        // 只保存非敏感資料到localStorage
        const safeAuthState = {
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          platforms: {}
        };

        // 為每個平台保存非敏感資料，token單獨安全儲存
        for (const [platform, data] of Object.entries(state.platforms)) {
          if (data.isConnected) {
            safeAuthState.platforms[platform] = {
              isConnected: data.isConnected,
              user: data.user // 只保存用戶資訊，不保存token
            };

            // 安全儲存token
            if (data.token) {
              await tokenStorage.setToken(platform, data.token);
            }
          }
        }

        localStorage.setItem('authState', JSON.stringify(safeAuthState));
      } else {
        localStorage.removeItem('authState');
        await tokenStorage.clearAllTokens();
      }
    };

    saveAuthState().catch(error => {
      console.error('Failed to save auth state:', error);
    });
  }, [state.isAuthenticated, state.user, state.platforms]);

  // 設置載入狀態
  const setLoading = (loading) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: loading });
  };

  // 設置錯誤
  const setError = (error) => {
    dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error });
  };

  // 清除錯誤
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // 登入成功
  const loginSuccess = (user) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
  };

  // 登出
  const logout = async () => {
    try {
      setLoading(true);
      
      // 使用認證流程管理器統一登出
      await authFlowManager.logoutFlow();
      
      // 重置狀態
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      setError('登出失敗');
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 連接平台
  const connectPlatform = async (platform, token, user, refreshToken = null) => {
    try {
      // 使用認證流程管理器處理連接
      const authData = {
        token,
        user,
        refreshToken,
        platform
      };

      await authFlowManager.startAuthFlow(platform, authData);

      // 更新本地狀態
      dispatch({
        type: AUTH_ACTIONS.PLATFORM_CONNECT,
        payload: { platform, token, user }
      });
    } catch (error) {
      console.error(`Failed to connect platform ${platform}:`, error);
      setError(`連接${platform}失敗: ${error.message}`);
      throw error;
    }
  };

  // 斷開平台連接
  const disconnectPlatform = async (platform) => {
    try {
      // 使用認證流程管理器進行平台特定的登出
      await authFlowManager.logoutFlow(platform);
      
      // 更新狀態
      dispatch({
        type: AUTH_ACTIONS.PLATFORM_DISCONNECT,
        payload: { platform }
      });
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
      setError(`斷開${platform}連接失敗`);
    }
  };

  // 更新用戶資訊
  const updateUser = (userData) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: userData });
  };

  // 檢查token是否有效（使用新的驗證器）
  const isTokenValid = async (platform, token) => {
    if (!token) return false;
    
    try {
      return await tokenValidator.validateToken(platform, token);
    } catch (error) {
      console.error(`Token validation error for ${platform}:`, error);
      return false;
    }
  };

  // 刷新token（使用新的驗證器）
  const refreshToken = async (platform) => {
    try {
      setLoading(true);
      
      const validToken = await tokenValidator.ensureValidToken(platform);
      
      if (validToken) {
        // 更新狀態中的token
        const currentPlatformData = state.platforms[platform];
        if (currentPlatformData && currentPlatformData.isConnected) {
          dispatch({
            type: AUTH_ACTIONS.PLATFORM_CONNECT,
            payload: {
              platform,
              token: validToken,
              user: currentPlatformData.user
            }
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Token refresh failed for ${platform}:`, error);
      setError(`刷新${platform}token失敗`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 獲取已連接的平台列表
  const getConnectedPlatforms = () => {
    return Object.entries(state.platforms)
      .filter(([_, data]) => data.isConnected)
      .map(([platform, _]) => platform);
  };

  // Context值
  const value = {
    // 狀態
    ...state,
    
    // 動作
    setLoading,
    setError,
    clearError,
    loginSuccess,
    logout,
    connectPlatform,
    disconnectPlatform,
    updateUser,
    isTokenValid,
    refreshToken,
    getConnectedPlatforms
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定義hook來使用AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext; 