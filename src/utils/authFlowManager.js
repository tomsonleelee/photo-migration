import tokenStorage from './tokenStorage';
import tokenValidator from './tokenValidator';
import logoutManager from './logoutManager';

// 認證流程管理器 - 統一管理整個認證流程
class AuthFlowManager {
  constructor() {
    this.authStates = {
      IDLE: 'idle',
      AUTHENTICATING: 'authenticating',
      AUTHENTICATED: 'authenticated',
      REFRESHING: 'refreshing',
      LOGOUT: 'logout',
      ERROR: 'error'
    };

    this.currentState = this.authStates.IDLE;
    this.listeners = new Set();
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
  }

  // 添加狀態監聽器
  addStateListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 通知狀態變更
  notifyStateChange(newState, data = {}) {
    this.currentState = newState;
    this.listeners.forEach(listener => {
      try {
        listener(newState, data);
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }

  // 開始認證流程
  async startAuthFlow(platform, authData) {
    try {
      this.notifyStateChange(this.authStates.AUTHENTICATING, { platform });

      // 驗證認證資料
      if (!this.validateAuthData(platform, authData)) {
        throw new Error(`Invalid auth data for ${platform}`);
      }

      // 儲存tokens
      await this.storeAuthTokens(platform, authData);

      // 驗證token有效性
      const isValid = await tokenValidator.validateToken(platform, authData.token);
      if (!isValid) {
        throw new Error(`Token validation failed for ${platform}`);
      }

      // 重置重試計數
      this.retryAttempts.delete(platform);

      this.notifyStateChange(this.authStates.AUTHENTICATED, {
        platform,
        user: authData.user,
        success: true
      });

      return {
        success: true,
        platform,
        user: authData.user
      };
    } catch (error) {
      console.error(`Auth flow failed for ${platform}:`, error);
      
      this.notifyStateChange(this.authStates.ERROR, {
        platform,
        error: error.message
      });

      throw error;
    }
  }

  // 驗證認證資料
  validateAuthData(platform, authData) {
    if (!authData || typeof authData !== 'object') {
      return false;
    }

    // 檢查必要欄位
    const requiredFields = ['token', 'user'];
    for (const field of requiredFields) {
      if (!authData[field]) {
        console.error(`Missing required field: ${field} for platform: ${platform}`);
        return false;
      }
    }

    // 檢查token格式
    if (!tokenStorage.validateTokenFormat(authData.token)) {
      console.error(`Invalid token format for platform: ${platform}`);
      return false;
    }

    // 檢查用戶資料
    if (!authData.user.id || !authData.user.name) {
      console.error(`Invalid user data for platform: ${platform}`);
      return false;
    }

    return true;
  }

  // 儲存認證tokens
  async storeAuthTokens(platform, authData) {
    try {
      // 儲存access token
      await tokenStorage.setToken(platform, authData.token, authData.expiresIn);

      // 如果有refresh token，也要儲存
      if (authData.refreshToken) {
        await tokenStorage.setRefreshToken(platform, authData.refreshToken);
      }

      console.log(`Tokens stored successfully for ${platform}`);
    } catch (error) {
      console.error(`Failed to store tokens for ${platform}:`, error);
      throw error;
    }
  }

  // 刷新token流程
  async refreshTokenFlow(platform) {
    try {
      const retryCount = this.retryAttempts.get(platform) || 0;
      
      if (retryCount >= this.maxRetryAttempts) {
        throw new Error(`Max retry attempts reached for ${platform}`);
      }

      this.notifyStateChange(this.authStates.REFRESHING, { platform });

      // 嘗試刷新token
      const newToken = await tokenValidator.ensureValidToken(platform);
      
      if (!newToken) {
        // 刷新失敗，增加重試計數
        this.retryAttempts.set(platform, retryCount + 1);
        throw new Error(`Token refresh failed for ${platform}`);
      }

      // 重置重試計數
      this.retryAttempts.delete(platform);

      this.notifyStateChange(this.authStates.AUTHENTICATED, {
        platform,
        refreshed: true
      });

      return newToken;
    } catch (error) {
      console.error(`Token refresh flow failed for ${platform}:`, error);
      
      this.notifyStateChange(this.authStates.ERROR, {
        platform,
        error: error.message,
        requiresReauth: true
      });

      throw error;
    }
  }

  // 登出流程
  async logoutFlow(platform = null) {
    try {
      this.notifyStateChange(this.authStates.LOGOUT, { platform });

      let result;
      if (platform) {
        // 單平台登出
        result = await logoutManager.logoutPlatform(platform);
      } else {
        // 全平台登出
        result = await logoutManager.logoutAll();
      }

      // 清除重試計數
      if (platform) {
        this.retryAttempts.delete(platform);
      } else {
        this.retryAttempts.clear();
      }

      this.notifyStateChange(this.authStates.IDLE, {
        platform,
        loggedOut: true
      });

      return result;
    } catch (error) {
      console.error('Logout flow failed:', error);
      
      this.notifyStateChange(this.authStates.ERROR, {
        platform,
        error: error.message
      });

      throw error;
    }
  }

  // 檢查認證狀態
  async checkAuthStatus() {
    try {
      const platforms = await tokenStorage.getStoredPlatforms();
      const results = {};

      for (const platform of platforms) {
        try {
          const validToken = await tokenValidator.ensureValidToken(platform);
          results[platform] = {
            isAuthenticated: !!validToken,
            needsRefresh: false
          };
        } catch (error) {
          results[platform] = {
            isAuthenticated: false,
            needsRefresh: true,
            error: error.message
          };
        }
      }

      return results;
    } catch (error) {
      console.error('Auth status check failed:', error);
      return {};
    }
  }

  // 自動恢復認證狀態
  async restoreAuthState() {
    try {
      console.log('Restoring authentication state...');
      
      const authStatus = await this.checkAuthStatus();
      const restoredPlatforms = [];

      for (const [platform, status] of Object.entries(authStatus)) {
        if (status.isAuthenticated) {
          restoredPlatforms.push(platform);
        } else if (status.needsRefresh) {
          try {
            await this.refreshTokenFlow(platform);
            restoredPlatforms.push(platform);
          } catch (error) {
            console.warn(`Failed to restore auth for ${platform}:`, error);
          }
        }
      }

      console.log('Auth state restored for platforms:', restoredPlatforms);
      return restoredPlatforms;
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      return [];
    }
  }

  // 獲取認證摘要
  async getAuthSummary() {
    try {
      const platforms = await tokenStorage.getStoredPlatforms();
      const hasActiveSessions = await logoutManager.hasActiveSessions();
      const authStatus = await this.checkAuthStatus();

      return {
        connectedPlatforms: platforms,
        hasActiveSessions,
        authStatus,
        currentState: this.currentState,
        retryAttempts: Object.fromEntries(this.retryAttempts)
      };
    } catch (error) {
      console.error('Failed to get auth summary:', error);
      return {
        connectedPlatforms: [],
        hasActiveSessions: false,
        authStatus: {},
        currentState: this.currentState,
        retryAttempts: {},
        error: error.message
      };
    }
  }

  // 清理認證狀態
  async cleanup() {
    try {
      this.listeners.clear();
      this.retryAttempts.clear();
      this.currentState = this.authStates.IDLE;
      
      console.log('Auth flow manager cleaned up');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // 獲取當前狀態
  getCurrentState() {
    return this.currentState;
  }

  // 檢查是否正在進行認證相關操作
  isBusy() {
    return [
      this.authStates.AUTHENTICATING,
      this.authStates.REFRESHING,
      this.authStates.LOGOUT
    ].includes(this.currentState);
  }
}

// 創建單例實例
const authFlowManager = new AuthFlowManager();

export default authFlowManager; 