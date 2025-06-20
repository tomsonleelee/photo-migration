// 安全的token儲存工具
class TokenStorage {
  constructor() {
    this.isHttpOnlySupported = this.checkHttpOnlySupport();
  }

  // 檢查是否支援HttpOnly cookies（需要後端支援）
  checkHttpOnlySupport() {
    // 在實際應用中，這應該通過API檢查後端是否支援HttpOnly cookies
    // 這裡我們假設如果是生產環境且使用HTTPS，則支援HttpOnly
    return window.location.protocol === 'https:' && (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  }

  // 設置token
  async setToken(platform, token, expiresIn = 3600) {
    try {
      if (this.isHttpOnlySupported) {
        // 使用HttpOnly cookies（需要後端API支援）
        await this.setHttpOnlyToken(platform, token, expiresIn);
      } else {
        // 使用安全的localStorage作為備用方案
        this.setSecureLocalStorageToken(platform, token, expiresIn);
      }
    } catch (error) {
      console.error(`Failed to store token for ${platform}:`, error);
      // 如果HttpOnly失敗，回退到localStorage
      this.setSecureLocalStorageToken(platform, token, expiresIn);
    }
  }

  // 獲取token
  async getToken(platform) {
    try {
      if (this.isHttpOnlySupported) {
        return await this.getHttpOnlyToken(platform);
      } else {
        return this.getSecureLocalStorageToken(platform);
      }
    } catch (error) {
      console.error(`Failed to retrieve token for ${platform}:`, error);
      return null;
    }
  }

  // 刪除token
  async removeToken(platform) {
    try {
      if (this.isHttpOnlySupported) {
        await this.removeHttpOnlyToken(platform);
      } else {
        this.removeSecureLocalStorageToken(platform);
      }
    } catch (error) {
      console.error(`Failed to remove token for ${platform}:`, error);
    }
  }

  // 清除所有token
  async clearAllTokens() {
    const platforms = ['google', 'facebook', 'instagram', 'flickr', 'fiveHundredPx'];
    
    await Promise.all([
      ...platforms.map(platform => this.removeToken(platform)),
      ...platforms.map(platform => this.removeRefreshToken(platform))
    ]);
  }

  // HttpOnly cookie方法（需要後端API支援）
  async setHttpOnlyToken(platform, token, expiresIn) {
    const response = await fetch('/api/auth/set-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 重要：包含cookies
      body: JSON.stringify({
        platform,
        token,
        expiresIn
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to set HttpOnly token');
    }
  }

  async getHttpOnlyToken(platform) {
    const response = await fetch(`/api/auth/get-token/${platform}`, {
      method: 'GET',
      credentials: 'include', // 重要：包含cookies
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Token不存在
      }
      throw new Error('Failed to get HttpOnly token');
    }

    const data = await response.json();
    return data.token;
  }

  async removeHttpOnlyToken(platform) {
    const response = await fetch(`/api/auth/remove-token/${platform}`, {
      method: 'DELETE',
      credentials: 'include', // 重要：包含cookies
    });

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to remove HttpOnly token');
    }
  }

  // 安全的localStorage方法（加密儲存）
  setSecureLocalStorageToken(platform, token, expiresIn) {
    const tokenData = {
      token: this.encryptToken(token),
      expiresAt: Date.now() + (expiresIn * 1000),
      platform
    };

    localStorage.setItem(`auth_token_${platform}`, JSON.stringify(tokenData));
  }

  getSecureLocalStorageToken(platform) {
    const stored = localStorage.getItem(`auth_token_${platform}`);
    
    if (!stored) {
      return null;
    }

    try {
      const tokenData = JSON.parse(stored);
      
      // 檢查是否過期
      if (Date.now() > tokenData.expiresAt) {
        this.removeSecureLocalStorageToken(platform);
        return null;
      }

      return this.decryptToken(tokenData.token);
    } catch (error) {
      console.error(`Failed to parse stored token for ${platform}:`, error);
      this.removeSecureLocalStorageToken(platform);
      return null;
    }
  }

  removeSecureLocalStorageToken(platform) {
    localStorage.removeItem(`auth_token_${platform}`);
  }

  // 簡單的token加密（在實際應用中應使用更強的加密）
  encryptToken(token) {
    // 這是一個簡單的Base64編碼，實際應用中應使用AES等強加密
    // 注意：這不是真正的安全加密，只是混淆
    try {
      return btoa(unescape(encodeURIComponent(token)));
    } catch (error) {
      console.error('Token encryption failed:', error);
      return token; // 如果加密失敗，返回原始token
    }
  }

  decryptToken(encryptedToken) {
    // 對應的解密
    try {
      return decodeURIComponent(escape(atob(encryptedToken)));
    } catch (error) {
      console.error('Token decryption failed:', error);
      return encryptedToken; // 如果解密失敗，返回原始值
    }
  }

  // 檢查token是否存在
  async hasToken(platform) {
    const token = await this.getToken(platform);
    return !!token;
  }

  // 獲取所有已儲存的平台
  async getStoredPlatforms() {
    const platforms = ['google', 'facebook', 'instagram', 'flickr', 'fiveHundredPx'];
    const storedPlatforms = [];

    for (const platform of platforms) {
      if (await this.hasToken(platform)) {
        storedPlatforms.push(platform);
      }
    }

    return storedPlatforms;
  }

  // 驗證token格式
  validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // 基本的token格式驗證
    // 大多數OAuth token都是字母數字字符
    const tokenRegex = /^[A-Za-z0-9._-]+$/;
    return tokenRegex.test(token) && token.length > 10;
  }

  // Refresh Token 管理方法
  
  // 設置refresh token
  async setRefreshToken(platform, refreshToken, expiresIn = 86400) { // 默認24小時
    try {
      if (this.isHttpOnlySupported) {
        await this.setHttpOnlyRefreshToken(platform, refreshToken, expiresIn);
      } else {
        this.setSecureLocalStorageRefreshToken(platform, refreshToken, expiresIn);
      }
    } catch (error) {
      console.error(`Failed to store refresh token for ${platform}:`, error);
      this.setSecureLocalStorageRefreshToken(platform, refreshToken, expiresIn);
    }
  }

  // 獲取refresh token
  async getRefreshToken(platform) {
    try {
      if (this.isHttpOnlySupported) {
        return await this.getHttpOnlyRefreshToken(platform);
      } else {
        return this.getSecureLocalStorageRefreshToken(platform);
      }
    } catch (error) {
      console.error(`Failed to retrieve refresh token for ${platform}:`, error);
      return null;
    }
  }

  // 刪除refresh token
  async removeRefreshToken(platform) {
    try {
      if (this.isHttpOnlySupported) {
        await this.removeHttpOnlyRefreshToken(platform);
      } else {
        this.removeSecureLocalStorageRefreshToken(platform);
      }
    } catch (error) {
      console.error(`Failed to remove refresh token for ${platform}:`, error);
    }
  }

  // HttpOnly refresh token方法
  async setHttpOnlyRefreshToken(platform, refreshToken, expiresIn) {
    const response = await fetch('/api/auth/set-refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        platform,
        refreshToken,
        expiresIn
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to set HttpOnly refresh token');
    }
  }

  async getHttpOnlyRefreshToken(platform) {
    const response = await fetch(`/api/auth/get-refresh-token/${platform}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get HttpOnly refresh token');
    }

    const data = await response.json();
    return data.refreshToken;
  }

  async removeHttpOnlyRefreshToken(platform) {
    const response = await fetch(`/api/auth/remove-refresh-token/${platform}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to remove HttpOnly refresh token');
    }
  }

  // 安全的localStorage refresh token方法
  setSecureLocalStorageRefreshToken(platform, refreshToken, expiresIn) {
    const tokenData = {
      refreshToken: this.encryptToken(refreshToken),
      expiresAt: Date.now() + (expiresIn * 1000),
      platform
    };

    localStorage.setItem(`auth_refresh_token_${platform}`, JSON.stringify(tokenData));
  }

  getSecureLocalStorageRefreshToken(platform) {
    const stored = localStorage.getItem(`auth_refresh_token_${platform}`);
    
    if (!stored) {
      return null;
    }

    try {
      const tokenData = JSON.parse(stored);
      
      // 檢查是否過期
      if (Date.now() > tokenData.expiresAt) {
        this.removeSecureLocalStorageRefreshToken(platform);
        return null;
      }

      return this.decryptToken(tokenData.refreshToken);
    } catch (error) {
      console.error(`Failed to parse stored refresh token for ${platform}:`, error);
      this.removeSecureLocalStorageRefreshToken(platform);
      return null;
    }
  }

  removeSecureLocalStorageRefreshToken(platform) {
    localStorage.removeItem(`auth_refresh_token_${platform}`);
  }
}

// 創建單例實例
const tokenStorage = new TokenStorage();

export default tokenStorage; 