import tokenStorage from './tokenStorage';

// 登出管理器 - 處理所有平台的登出流程
class LogoutManager {
  constructor() {
    this.logoutHandlers = {
      google: this.logoutGoogle.bind(this),
      facebook: this.logoutFacebook.bind(this),
      instagram: this.logoutInstagram.bind(this),
      flickr: this.logoutFlickr.bind(this),
      '500px': this.logout500px.bind(this)
    };
  }

  // Google登出
  async logoutGoogle(token) {
    try {
      // 撤銷Google token
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        console.warn('Google token revocation failed, but continuing logout');
      }

      // 如果有Google Sign-In實例，也要登出
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.disableAutoSelect();
        } catch (error) {
          console.warn('Google auto-select disable failed:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Google logout error:', error);
      return false;
    }
  }

  // Facebook登出
  async logoutFacebook(token) {
    try {
      // 如果Facebook SDK已載入，使用SDK登出
      if (window.FB) {
        return new Promise((resolve) => {
          window.FB.logout((response) => {
            console.log('Facebook logout response:', response);
            resolve(true);
          });
        });
      } else {
        // 手動撤銷token
        const response = await fetch(`https://graph.facebook.com/me/permissions?access_token=${token}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          console.warn('Facebook token revocation failed, but continuing logout');
        }
      }

      return true;
    } catch (error) {
      console.error('Facebook logout error:', error);
      return false;
    }
  }

  // Instagram登出
  async logoutInstagram(_token) {
    try {
      // Instagram沒有直接的撤銷API，但我們可以嘗試刪除權限
      // 注意：這需要用戶手動到Instagram設置中撤銷應用權限
      console.log('Instagram logout: Token will be removed locally. User should manually revoke app permissions in Instagram settings.');
      return true;
    } catch (error) {
      console.error('Instagram logout error:', error);
      return false;
    }
  }

  // Flickr登出
  async logoutFlickr(_token) {
    try {
      // Flickr沒有標準的撤銷API，但我們可以嘗試
      console.log('Flickr logout: Token will be removed locally. User should manually revoke app permissions in Flickr settings.');
      return true;
    } catch (error) {
      console.error('Flickr logout error:', error);
      return false;
    }
  }

  // 500px登出
  async logout500px(_token) {
    try {
      // 500px API不再可用，只需本地清理
      console.log('500px logout: Token removed locally (API no longer available).');
      return true;
    } catch (error) {
      console.error('500px logout error:', error);
      return false;
    }
  }

  // 單個平台登出
  async logoutPlatform(platform) {
    try {
      console.log(`Starting logout for platform: ${platform}`);

      // 獲取當前token
      const token = await tokenStorage.getToken(platform);
      
      if (!token) {
        console.log(`No token found for ${platform}, skipping platform-specific logout`);
        return true;
      }

      // 執行平台特定的登出流程
      const handler = this.logoutHandlers[platform];
      if (handler) {
        const success = await handler(token);
        if (!success) {
          console.warn(`Platform-specific logout failed for ${platform}, but continuing with local cleanup`);
        }
      } else {
        console.warn(`No logout handler found for platform: ${platform}`);
      }

      // 清除本地token
      await tokenStorage.removeToken(platform);
      
      console.log(`Logout completed for platform: ${platform}`);
      return true;
    } catch (error) {
      console.error(`Logout failed for platform ${platform}:`, error);
      
      // 即使平台特定登出失敗，也要清除本地token
      try {
        await tokenStorage.removeToken(platform);
      } catch (cleanupError) {
        console.error(`Failed to cleanup token for ${platform}:`, cleanupError);
      }
      
      return false;
    }
  }

  // 全部平台登出
  async logoutAll() {
    try {
      console.log('Starting logout for all platforms');

      const platforms = await tokenStorage.getStoredPlatforms();
      const results = {};

      // 並行處理所有平台的登出
      const logoutPromises = platforms.map(async (platform) => {
        const success = await this.logoutPlatform(platform);
        results[platform] = success;
        return { platform, success };
      });

      await Promise.all(logoutPromises);

      // 清除所有本地儲存
      await tokenStorage.clearAllTokens();
      localStorage.removeItem('authState');

      // 清除其他可能的認證相關資料
      const authKeys = ['authToken', 'userData', 'refreshToken'];
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      console.log('Global logout completed', results);
      return results;
    } catch (error) {
      console.error('Global logout failed:', error);
      
      // 強制清除所有本地資料
      try {
        await tokenStorage.clearAllTokens();
        localStorage.clear();
        sessionStorage.clear();
      } catch (cleanupError) {
        console.error('Emergency cleanup failed:', cleanupError);
      }
      
      throw error;
    }
  }

  // 檢查是否有活躍的登入會話
  async hasActiveSessions() {
    try {
      const platforms = await tokenStorage.getStoredPlatforms();
      return platforms.length > 0;
    } catch (error) {
      console.error('Failed to check active sessions:', error);
      return false;
    }
  }

  // 獲取登出狀態報告
  async getLogoutStatus() {
    try {
      const platforms = await tokenStorage.getStoredPlatforms();
      const authState = localStorage.getItem('authState');
      
      return {
        hasStoredTokens: platforms.length > 0,
        storedPlatforms: platforms,
        hasAuthState: !!authState,
        localStorageKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('token') || key.includes('user')
        )
      };
    } catch (error) {
      console.error('Failed to get logout status:', error);
      return {
        hasStoredTokens: false,
        storedPlatforms: [],
        hasAuthState: false,
        localStorageKeys: [],
        error: error.message
      };
    }
  }
}

// 創建單例實例
const logoutManager = new LogoutManager();

export default logoutManager; 