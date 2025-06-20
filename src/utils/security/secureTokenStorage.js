// 安全 Token 存儲機制
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';
import CryptoJS from 'crypto-js';

class SecureTokenStorage {
  constructor() {
    this.config = getSecurityConfig();
    this.encryptionKey = this.generateEncryptionKey();
    this.tokenCache = new Map();
    this.cookieStorage = new CookieStorage(this.config.cookies);
    this.secureStorage = new SecureLocalStorage(this.encryptionKey);
  }

  // 生成加密密鑰
  generateEncryptionKey() {
    // 使用多個來源生成穩定的加密密鑰
    const sources = [
      navigator.userAgent,
      window.location.hostname,
      localStorage.getItem('device_id') || this.generateDeviceId()
    ];
    
    return CryptoJS.SHA256(sources.join('|')).toString();
  }

  // 生成設備 ID
  generateDeviceId() {
    const deviceId = 'device_' + CryptoJS.lib.WordArray.random(16).toString();
    localStorage.setItem('device_id', deviceId);
    return deviceId;
  }

  // 存儲 Token
  async setToken(platform, tokenData, options = {}) {
    try {
      const tokenInfo = {
        platform,
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt || this.calculateExpiry(tokenData.expiresIn),
        scope: tokenData.scope,
        tokenType: tokenData.tokenType || 'Bearer',
        createdAt: new Date().toISOString(),
        rotationCount: 0,
        ...options
      };

      // 驗證 Token 格式
      this.validateTokenFormat(tokenInfo);

      // 選擇存儲方法
      const storageMethod = this.selectStorageMethod(tokenInfo);
      
      // 存儲到主要位置
      await this.storeTokenSecurely(platform, tokenInfo, storageMethod);
      
      // 更新緩存
      this.tokenCache.set(platform, tokenInfo);
      
      // 記錄安全事件
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_CREATE,
        {
          platform,
          storageMethod,
          expiresAt: tokenInfo.expiresAt,
          hasRefreshToken: !!tokenInfo.refreshToken
        },
        RISK_LEVELS.LOW
      );

      return true;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'token_storage_failed',
          platform,
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 獲取 Token
  async getToken(platform, options = {}) {
    try {
      // 檢查緩存
      if (this.tokenCache.has(platform) && !options.bypassCache) {
        const cachedToken = this.tokenCache.get(platform);
        if (this.isTokenValid(cachedToken)) {
          return cachedToken;
        }
      }

      // 從存儲中讀取
      const tokenInfo = await this.retrieveTokenSecurely(platform);
      
      if (!tokenInfo) {
        return null;
      }

      // 驗證 Token
      if (!this.isTokenValid(tokenInfo)) {
        // 嘗試刷新 Token
        if (tokenInfo.refreshToken) {
          const refreshedToken = await this.refreshToken(platform, tokenInfo);
          if (refreshedToken) {
            return refreshedToken;
          }
        }
        
        // Token 無效且無法刷新
        await this.removeToken(platform);
        return null;
      }

      // 更新緩存
      this.tokenCache.set(platform, tokenInfo);
      
      return tokenInfo;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'token_retrieval_failed',
          platform,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      return null;
    }
  }

  // 刷新 Token
  async refreshToken(platform, currentTokenInfo) {
    try {
      if (!currentTokenInfo.refreshToken) {
        throw new Error('No refresh token available');
      }

      // 調用平台特定的刷新邏輯
      const refreshedTokenData = await this.callPlatformRefresh(platform, currentTokenInfo.refreshToken);
      
      // 更新 Token 信息
      const updatedTokenInfo = {
        ...currentTokenInfo,
        token: refreshedTokenData.accessToken,
        refreshToken: refreshedTokenData.refreshToken || currentTokenInfo.refreshToken,
        expiresAt: refreshedTokenData.expiresAt || this.calculateExpiry(refreshedTokenData.expiresIn),
        rotationCount: currentTokenInfo.rotationCount + 1,
        lastRefreshed: new Date().toISOString()
      };

      // 存儲更新的 Token
      await this.setToken(platform, updatedTokenData, {
        rotationCount: updatedTokenInfo.rotationCount,
        lastRefreshed: updatedTokenInfo.lastRefreshed
      });

      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_CREATE,
        {
          action: 'token_refreshed',
          platform,
          rotationCount: updatedTokenInfo.rotationCount
        },
        RISK_LEVELS.LOW
      );

      return updatedTokenInfo;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_DESTROY,
        {
          action: 'token_refresh_failed',
          platform,
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 移除 Token
  async removeToken(platform) {
    try {
      // 從所有存儲位置移除
      await this.cookieStorage.remove(platform);
      await this.secureStorage.remove(platform);
      
      // 清除緩存
      this.tokenCache.delete(platform);
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_DESTROY,
        {
          platform,
          action: 'token_removed'
        },
        RISK_LEVELS.LOW
      );

      return true;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'token_removal_failed',
          platform,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 清除所有 Token
  async clearAllTokens() {
    try {
      const platforms = Array.from(this.tokenCache.keys());
      
      for (const platform of platforms) {
        await this.removeToken(platform);
      }
      
      // 清除其他可能的存儲
      await this.cookieStorage.clear();
      await this.secureStorage.clear();
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_DESTROY,
        {
          action: 'all_tokens_cleared',
          platformCount: platforms.length
        },
        RISK_LEVELS.MEDIUM
      );

      return true;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'clear_all_tokens_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 選擇存儲方法
  selectStorageMethod(tokenInfo) {
    // 根據安全配置和瀏覽器環境選擇最安全的存儲方法
    if (this.config.cookies.httpOnly && this.isSecureContext()) {
      return 'httponly_cookie';
    } else if (this.isSecureContext()) {
      return 'secure_cookie';
    } else {
      return 'encrypted_storage';
    }
  }

  // 安全存儲 Token
  async storeTokenSecurely(platform, tokenInfo, method) {
    switch (method) {
      case 'httponly_cookie':
        // HttpOnly cookies 需要服務器端設定
        await this.requestServerSideCookieStorage(platform, tokenInfo);
        break;
        
      case 'secure_cookie':
        await this.cookieStorage.set(platform, tokenInfo);
        break;
        
      case 'encrypted_storage':
        await this.secureStorage.set(platform, tokenInfo);
        break;
        
      default:
        throw new Error(`Unsupported storage method: ${method}`);
    }
  }

  // 安全檢索 Token
  async retrieveTokenSecurely(platform) {
    // 嘗試多種存儲方法
    const methods = ['httponly_cookie', 'secure_cookie', 'encrypted_storage'];
    
    for (const method of methods) {
      try {
        let tokenInfo;
        
        switch (method) {
          case 'httponly_cookie':
            tokenInfo = await this.requestServerSideTokenRetrieval(platform);
            break;
            
          case 'secure_cookie':
            tokenInfo = await this.cookieStorage.get(platform);
            break;
            
          case 'encrypted_storage':
            tokenInfo = await this.secureStorage.get(platform);
            break;
        }
        
        if (tokenInfo) {
          return tokenInfo;
        }
      } catch (error) {
        // 繼續嘗試下一種方法
        console.warn(`Failed to retrieve token using ${method}:`, error);
      }
    }
    
    return null;
  }

  // 請求服務器端 Cookie 存儲
  async requestServerSideCookieStorage(platform, tokenInfo) {
    try {
      const response = await fetch('/api/auth/store-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          platform,
          tokenData: {
            token: tokenInfo.token,
            expiresAt: tokenInfo.expiresAt
            // 注意：不發送 refreshToken 到客戶端
          }
        }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`Server-side storage failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to store token on server: ${error.message}`);
    }
  }

  // 請求服務器端 Token 檢索
  async requestServerSideTokenRetrieval(platform) {
    try {
      const response = await fetch(`/api/auth/get-token/${platform}`, {
        method: 'GET',
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to retrieve token from server:', error);
      return null;
    }
  }

  // 調用平台特定的刷新邏輯
  async callPlatformRefresh(platform, refreshToken) {
    const refreshEndpoints = {
      google: '/api/auth/refresh/google',
      facebook: '/api/auth/refresh/facebook',
      instagram: '/api/auth/refresh/instagram',
      flickr: '/api/auth/refresh/flickr'
    };
    
    const endpoint = refreshEndpoints[platform];
    if (!endpoint) {
      throw new Error(`Refresh not supported for platform: ${platform}`);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    
    return await response.json();
  }

  // 驗證 Token 格式
  validateTokenFormat(tokenInfo) {
    if (!tokenInfo.token) {
      throw new Error('Token is required');
    }
    
    if (!tokenInfo.platform) {
      throw new Error('Platform is required');
    }
    
    if (tokenInfo.expiresAt && new Date(tokenInfo.expiresAt) <= new Date()) {
      throw new Error('Token is already expired');
    }
  }

  // 檢查 Token 是否有效
  isTokenValid(tokenInfo) {
    if (!tokenInfo || !tokenInfo.token) {
      return false;
    }
    
    if (tokenInfo.expiresAt) {
      const now = new Date();
      const expiry = new Date(tokenInfo.expiresAt);
      
      // 提前5分鐘認為 Token 過期
      const buffer = 5 * 60 * 1000;
      return expiry.getTime() > now.getTime() + buffer;
    }
    
    return true;
  }

  // 計算過期時間
  calculateExpiry(expiresIn) {
    if (!expiresIn) return null;
    
    const now = new Date();
    return new Date(now.getTime() + (expiresIn * 1000)).toISOString();
  }

  // 檢查是否為安全上下文
  isSecureContext() {
    return typeof window !== 'undefined' && 
           (window.isSecureContext || window.location.protocol === 'https:');
  }

  // 獲取存儲統計
  getStorageStatistics() {
    return {
      cacheSize: this.tokenCache.size,
      platforms: Array.from(this.tokenCache.keys()),
      secureContext: this.isSecureContext(),
      supportedMethods: this.getSupportedStorageMethods()
    };
  }

  // 獲取支援的存儲方法
  getSupportedStorageMethods() {
    const methods = [];
    
    if (this.isSecureContext()) {
      methods.push('secure_cookie', 'httponly_cookie');
    }
    
    methods.push('encrypted_storage');
    
    return methods;
  }
}

// Cookie 存儲類別
class CookieStorage {
  constructor(config) {
    this.config = config;
  }

  async set(platform, tokenInfo) {
    const cookieName = `token_${platform}`;
    const cookieValue = this.encryptTokenData(tokenInfo);
    
    const cookieOptions = [
      `${cookieName}=${cookieValue}`,
      `Max-Age=${Math.floor((new Date(tokenInfo.expiresAt) - new Date()) / 1000)}`,
      `Path=${this.config.path}`,
      `SameSite=${this.config.sameSite}`
    ];
    
    if (this.config.secure) {
      cookieOptions.push('Secure');
    }
    
    if (this.config.domain) {
      cookieOptions.push(`Domain=${this.config.domain}`);
    }
    
    document.cookie = cookieOptions.join('; ');
  }

  async get(platform) {
    const cookieName = `token_${platform}`;
    const cookies = document.cookie.split(';');
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === cookieName) {
        return this.decryptTokenData(value);
      }
    }
    
    return null;
  }

  async remove(platform) {
    const cookieName = `token_${platform}`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.config.path};`;
  }

  async clear() {
    const cookies = document.cookie.split(';');
    
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=');
      if (name.startsWith('token_')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.config.path};`;
      }
    }
  }

  encryptTokenData(tokenInfo) {
    const dataStr = JSON.stringify(tokenInfo);
    return CryptoJS.AES.encrypt(dataStr, 'cookie-encryption-key').toString();
  }

  decryptTokenData(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, 'cookie-encryption-key');
      const dataStr = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(dataStr);
    } catch (error) {
      throw new Error('Failed to decrypt token data');
    }
  }
}

// 安全本地存儲類別
class SecureLocalStorage {
  constructor(encryptionKey) {
    this.encryptionKey = encryptionKey;
    this.keyPrefix = 'secure_token_';
  }

  async set(platform, tokenInfo) {
    const key = this.keyPrefix + platform;
    const encryptedData = this.encrypt(JSON.stringify(tokenInfo));
    localStorage.setItem(key, encryptedData);
  }

  async get(platform) {
    const key = this.keyPrefix + platform;
    const encryptedData = localStorage.getItem(key);
    
    if (!encryptedData) {
      return null;
    }
    
    try {
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      // 數據損壞，移除
      localStorage.removeItem(key);
      return null;
    }
  }

  async remove(platform) {
    const key = this.keyPrefix + platform;
    localStorage.removeItem(key);
  }

  async clear() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.keyPrefix)) {
        localStorage.removeItem(key);
      }
    }
  }

  encrypt(data) {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  decrypt(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

// 全局安全 Token 存儲實例
export const secureTokenStorage = new SecureTokenStorage();

// 導出便利函數
export const setSecureToken = (platform, tokenData, options) => 
  secureTokenStorage.setToken(platform, tokenData, options);

export const getSecureToken = (platform, options) => 
  secureTokenStorage.getToken(platform, options);

export const removeSecureToken = (platform) => 
  secureTokenStorage.removeToken(platform);

export const clearAllSecureTokens = () => 
  secureTokenStorage.clearAllTokens();

export default SecureTokenStorage;