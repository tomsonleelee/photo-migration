import tokenStorage from './tokenStorage';

// Token驗證和刷新工具
class TokenValidator {
  constructor() {
    this.refreshPromises = new Map(); // 防止重複刷新
  }

  // 驗證token是否有效
  async validateToken(platform, token) {
    if (!token || !tokenStorage.validateTokenFormat(token)) {
      return false;
    }

    try {
      switch (platform) {
        case 'google':
          return await this.validateGoogleToken(token);
        case 'facebook':
          return await this.validateFacebookToken(token);
        case 'instagram':
          return await this.validateInstagramToken(token);
        case 'flickr':
          return await this.validateFlickrToken(token);
        default:
          console.warn(`Token validation not implemented for platform: ${platform}`);
          return true; // 假設有效，避免阻塞
      }
    } catch (error) {
      console.error(`Token validation failed for ${platform}:`, error);
      return false;
    }
  }

  // Google token驗證
  async validateGoogleToken(token) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // 檢查token是否過期
      if (data.expires_in && data.expires_in <= 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Google token validation error:', error);
      return false;
    }
  }

  // Facebook token驗證
  async validateFacebookToken(token) {
    try {
      const response = await fetch(`https://graph.facebook.com/me?access_token=${token}`);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // 如果返回錯誤，token無效
      if (data.error) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Facebook token validation error:', error);
      return false;
    }
  }

  // Instagram token驗證
  async validateInstagramToken(token) {
    try {
      const response = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // 如果返回錯誤，token無效
      if (data.error) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Instagram token validation error:', error);
      return false;
    }
  }

  // Flickr token驗證
  async validateFlickrToken(token) {
    try {
      const apiKey = import.meta.env.VITE_FLICKR_API_KEY;
      const response = await fetch(
        `https://api.flickr.com/services/rest/?method=flickr.test.login&api_key=${apiKey}&format=json&nojsoncallback=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // 檢查API回應狀態
      if (data.stat !== 'ok') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Flickr token validation error:', error);
      return false;
    }
  }

  // 刷新token
  async refreshToken(platform, currentToken) {
    // 防止重複刷新
    if (this.refreshPromises.has(platform)) {
      return await this.refreshPromises.get(platform);
    }

    const refreshPromise = this.performTokenRefresh(platform, currentToken);
    this.refreshPromises.set(platform, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      this.refreshPromises.delete(platform);
    }
  }

  // 執行token刷新
  async performTokenRefresh(platform, currentToken) {
    try {
      switch (platform) {
        case 'google':
          return await this.refreshGoogleToken(currentToken);
        case 'facebook':
          return await this.refreshFacebookToken(currentToken);
        case 'instagram':
          return await this.refreshInstagramToken(currentToken);
        case 'flickr':
          return await this.refreshFlickrToken(currentToken);
        default:
          throw new Error(`Token refresh not implemented for platform: ${platform}`);
      }
    } catch (error) {
      console.error(`Token refresh failed for ${platform}:`, error);
      throw error;
    }
  }

  // Google token刷新
  async refreshGoogleToken(currentToken) {
    try {
      // 嘗試從儲存中獲取refresh token
      const refreshToken = await tokenStorage.getRefreshToken('google');
      
      if (!refreshToken) {
        throw new Error('Google refresh token not available. User needs to re-authenticate.');
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      if (!clientId) {
        throw new Error('Google client ID not configured');
      }

      // 使用refresh token獲取新的access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret || '', // 在公開客戶端中可能為空
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google token refresh failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token received from Google');
      }

      // 如果收到新的refresh token，也要更新它
      if (data.refresh_token) {
        await tokenStorage.setRefreshToken('google', data.refresh_token);
      }

      return data.access_token;
    } catch (error) {
      console.error('Google token refresh error:', error);
      throw error;
    }
  }

  // Facebook token刷新
  async refreshFacebookToken(currentToken) {
    try {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
      const appSecret = import.meta.env.VITE_FACEBOOK_APP_SECRET;
      
      // 注意：在生產環境中，這應該在後端進行
      const response = await fetch(
        `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`
      );

      if (!response.ok) {
        throw new Error('Facebook token refresh failed');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Facebook token refresh error:', error);
      throw error;
    }
  }

  // Instagram token刷新
  async refreshInstagramToken(currentToken) {
    try {
      // Instagram長期token刷新
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
      );

      if (!response.ok) {
        throw new Error('Instagram token refresh failed');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Instagram token refresh error:', error);
      throw error;
    }
  }

  // Flickr token刷新
  async refreshFlickrToken(currentToken) {
    // Flickr token通常有較長的有效期，可能不需要頻繁刷新
    throw new Error('Flickr token refresh not typically required');
  }

  // 檢查並自動刷新token
  async ensureValidToken(platform) {
    try {
      const currentToken = await tokenStorage.getToken(platform);
      
      if (!currentToken) {
        return null; // 沒有token
      }

      // 驗證當前token
      const isValid = await this.validateToken(platform, currentToken);
      
      if (isValid) {
        return currentToken; // token有效
      }

      // 嘗試刷新token
      try {
        const newToken = await this.refreshToken(platform, currentToken);
        
        if (newToken) {
          // 儲存新token
          await tokenStorage.setToken(platform, newToken);
          return newToken;
        }
      } catch (refreshError) {
        console.warn(`Token refresh failed for ${platform}, removing invalid token:`, refreshError);
      }

      // 刷新失敗，清除無效token
      await tokenStorage.removeToken(platform);
      return null;
    } catch (error) {
      console.error(`Error ensuring valid token for ${platform}:`, error);
      return null;
    }
  }

  // 批量驗證所有平台的token
  async validateAllTokens() {
    const platforms = await tokenStorage.getStoredPlatforms();
    const results = {};

    for (const platform of platforms) {
      try {
        const validToken = await this.ensureValidToken(platform);
        results[platform] = {
          isValid: !!validToken,
          token: validToken
        };
      } catch (error) {
        results[platform] = {
          isValid: false,
          error: error.message
        };
      }
    }

    return results;
  }

  // 定期檢查token有效性
  startTokenValidationScheduler(intervalMinutes = 30) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    return setInterval(async () => {
      try {
        console.log('Running scheduled token validation...');
        await this.validateAllTokens();
      } catch (error) {
        console.error('Scheduled token validation failed:', error);
      }
    }, intervalMs);
  }

  // 停止定期檢查
  stopTokenValidationScheduler(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

// 創建單例實例
const tokenValidator = new TokenValidator();

export default tokenValidator; 