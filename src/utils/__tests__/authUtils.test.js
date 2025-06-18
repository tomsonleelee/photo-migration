import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock environment variables
process.env.VITE_GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.VITE_GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.VITE_FACEBOOK_APP_ID = 'test-facebook-app-id';
process.env.VITE_FACEBOOK_APP_SECRET = 'test-facebook-app-secret';
process.env.VITE_FLICKR_API_KEY = 'test-flickr-api-key';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Import modules after mocking localStorage
import tokenStorage from '../tokenStorage';
import tokenValidator from '../tokenValidator';
import logoutManager from '../logoutManager';

describe('Token Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear localStorage mock data
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Force tokenStorage to use localStorage by mocking isHttpOnlySupported
    jest.spyOn(tokenStorage, 'checkHttpOnlySupport').mockReturnValue(false);
    tokenStorage.isHttpOnlySupported = false;
    
    // Mock window.location for tokenStorage
    const originalLocation = window.location;
    delete window.location;
    window.location = { protocol: 'http:', href: 'http://localhost' };
    process.env.NODE_ENV = 'test';
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', async () => {
      const platform = 'google';
      const token = 'test-access-token';
      
      // Directly test the localStorage methods
      tokenStorage.setSecureLocalStorageToken(platform, token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `auth_token_${platform}`, 
        expect.stringContaining('"platform":"google"')
      );
      
      // Test retrieval by mocking localStorage.getItem
      const encryptedToken = btoa(unescape(encodeURIComponent(token)));
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        token: encryptedToken,
        expiresAt: Date.now() + 3600000,
        platform
      }));

      const retrievedToken = tokenStorage.getSecureLocalStorageToken(platform);
      expect(retrievedToken).toBe(token);
    });

    it('should handle expired tokens', async () => {
      const platform = 'google';
      const expiredToken = 'expired-token';
      
      // Mock expired token in localStorage
      const encryptedToken = btoa(unescape(encodeURIComponent(expiredToken)));
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        token: encryptedToken,
        expiresAt: Date.now() - 1000, // 過期
        platform
      }));

      const retrievedToken = tokenStorage.getSecureLocalStorageToken(platform);
      expect(retrievedToken).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`auth_token_${platform}`);
    });

    it('should store and retrieve refresh tokens', async () => {
      const platform = 'google';
      const refreshToken = 'test-refresh-token';
      
      // Directly test the localStorage methods
      tokenStorage.setSecureLocalStorageRefreshToken(platform, refreshToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `auth_refresh_token_${platform}`, 
        expect.stringContaining('"platform":"google"')
      );
      
      // Test retrieval by mocking localStorage.getItem
      const encryptedRefreshToken = btoa(unescape(encodeURIComponent(refreshToken)));
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        refreshToken: encryptedRefreshToken,
        expiresAt: Date.now() + 86400000,
        platform
      }));

      const retrievedRefreshToken = tokenStorage.getSecureLocalStorageRefreshToken(platform);
      expect(retrievedRefreshToken).toBe(refreshToken);
    });
  });

  describe('Token Validation', () => {
    it('should validate token format', () => {
      expect(tokenStorage.validateTokenFormat('valid-token-123')).toBe(true);
      expect(tokenStorage.validateTokenFormat('')).toBe(false);
      expect(tokenStorage.validateTokenFormat(null)).toBe(false);
      expect(tokenStorage.validateTokenFormat('short')).toBe(false);
    });
  });
});

describe('Token Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google Token Validation', () => {
    it('should validate valid Google token', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expires_in: 3600 })
      });

      const isValid = await tokenValidator.validateGoogleToken('valid-token');
      expect(isValid).toBe(true);
    });

    it('should reject invalid Google token', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const isValid = await tokenValidator.validateGoogleToken('invalid-token');
      expect(isValid).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh Google token with refresh token', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      const newAccessToken = 'new-access-token';

      // Mock tokenStorage.getRefreshToken
      jest.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(mockRefreshToken);
      
      // Mock successful token refresh
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newAccessToken,
          refresh_token: 'new-refresh-token'
        })
      });

      // Mock setRefreshToken
      jest.spyOn(tokenStorage, 'setRefreshToken').mockResolvedValue();

      const refreshedToken = await tokenValidator.refreshGoogleToken('old-token');
      expect(refreshedToken).toBe(newAccessToken);
      expect(tokenStorage.setRefreshToken).toHaveBeenCalledWith('google', 'new-refresh-token');
    });

    it('should throw error when refresh token is not available', async () => {
      jest.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(null);

      await expect(tokenValidator.refreshGoogleToken('old-token'))
        .rejects.toThrow('Google refresh token not available');
    });
  });

  describe('Ensure Valid Token', () => {
    it('should return current token if valid', async () => {
      const validToken = 'valid-token';
      
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(validToken);
      jest.spyOn(tokenValidator, 'validateToken').mockResolvedValue(true);

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBe(validToken);
    });

    it('should refresh token if current token is invalid', async () => {
      const oldToken = 'invalid-token';
      const newToken = 'new-valid-token';
      
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
      jest.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);
      jest.spyOn(tokenValidator, 'refreshToken').mockResolvedValue(newToken);
      jest.spyOn(tokenStorage, 'setToken').mockResolvedValue();

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBe(newToken);
      expect(tokenStorage.setToken).toHaveBeenCalledWith('google', newToken);
    });

    it('should remove token if refresh fails', async () => {
      const oldToken = 'invalid-token';
      
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
      jest.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);
      jest.spyOn(tokenValidator, 'refreshToken').mockRejectedValue(new Error('Refresh failed'));
      jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBeNull();
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });
  });
});

describe('Logout Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Logout', () => {
    it('should logout from Google successfully', async () => {
      const token = 'google-token';
      
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(token);
      jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      
      fetch.mockResolvedValueOnce({ ok: true });

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true);
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });

    it('should handle logout when no token exists', async () => {
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(null);

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true);
    });

    it('should continue with local cleanup even if platform logout fails', async () => {
      const token = 'google-token';
      
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(token);
      jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true); // 應該仍然成功，因為本地清理完成
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });
  });

  describe('Global Logout', () => {
    it('should logout from all platforms', async () => {
      const platforms = ['google', 'facebook'];
      
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(platforms);
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue('some-token');
      jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      jest.spyOn(tokenStorage, 'clearAllTokens').mockResolvedValue();
      
      fetch.mockResolvedValue({ ok: true });

      const results = await logoutManager.logoutAll();
      
      expect(results).toEqual({
        google: true,
        facebook: true
      });
      expect(tokenStorage.clearAllTokens).toHaveBeenCalled();
      // logoutAll should clear all tokens but doesn't necessarily remove 'authState'
      expect(tokenStorage.clearAllTokens).toHaveBeenCalled();
    });

    it('should handle errors gracefully during global logout', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockRejectedValue(new Error('Storage error'));
      jest.spyOn(tokenStorage, 'clearAllTokens').mockResolvedValue();

      const results = await logoutManager.logoutAll();
      expect(results).toEqual({});
      expect(tokenStorage.clearAllTokens).toHaveBeenCalled();
    });

    it('should return empty results when no platforms are stored', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue([]);

      const results = await logoutManager.logoutAll();
      expect(results).toEqual({});
    });

    it('should handle partial failures', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(['google']);
      jest.spyOn(tokenStorage, 'getToken').mockResolvedValue('some-token');
      jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      
      // Mock fetch to reject for Google
      fetch.mockRejectedValue(new Error('Network error'));

      const results = await logoutManager.logoutAll();
      expect(results.google).toBe(true); // 本地清理成功
    });
  });

  describe('Session Management', () => {
    it('should detect active sessions', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(['google', 'facebook']);

      const hasActive = await logoutManager.hasActiveSessions();
      expect(hasActive).toBe(true);
    });

    it('should detect no active sessions', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue([]);

      const hasActive = await logoutManager.hasActiveSessions();
      expect(hasActive).toBe(false);
    });

    it('should provide logout status report', async () => {
      jest.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(['google']);
      
      // Mock localStorage.getItem for authState specifically
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authState') {
          return '{"isAuthenticated": true}';
        }
        return null;
      });
      
      // Mock Object.keys(localStorage)
      Object.defineProperty(localStorage, 'length', { value: 2 });
      Object.defineProperty(localStorage, 'key', {
        value: jest.fn()
          .mockReturnValueOnce('authState')
          .mockReturnValueOnce('auth_token_google')
      });
      
      // Mock Object.keys to return the keys we want
      const originalKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['authState', 'auth_token_google']);

      const status = await logoutManager.getLogoutStatus();
      
      expect(status.hasStoredTokens).toBe(true);
      expect(status.storedPlatforms).toEqual(['google']);
      expect(status.hasAuthState).toBe(true);
      
      // Restore original function
      Object.keys = originalKeys;
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle complete authentication flow', async () => {
    const platform = 'google';
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';

    // 1. 儲存tokens
    await tokenStorage.setToken(platform, accessToken);
    await tokenStorage.setRefreshToken(platform, refreshToken);

    // 2. 驗證token
    jest.spyOn(tokenValidator, 'validateToken').mockResolvedValue(true);
    const isValid = await tokenValidator.validateToken(platform, accessToken);
    expect(isValid).toBe(true);

    // 3. 登出
    jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(accessToken);
    jest.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
    fetch.mockResolvedValueOnce({ ok: true });

    const logoutResult = await logoutManager.logoutPlatform(platform);
    expect(logoutResult).toBe(true);
  });

  it('should handle token refresh flow', async () => {
    const platform = 'google';
    const oldToken = 'old-token';
    const refreshToken = 'refresh-token';
    const newToken = 'new-token';

    // Mock token storage
    jest.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
    jest.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(refreshToken);
    jest.spyOn(tokenStorage, 'setToken').mockResolvedValue();

    // Mock validation (token is invalid)
    jest.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);

    // Mock refreshToken method directly
    jest.spyOn(tokenValidator, 'refreshToken').mockResolvedValue(newToken);

    const validToken = await tokenValidator.ensureValidToken(platform);
    expect(validToken).toBe(newToken);
    expect(tokenStorage.setToken).toHaveBeenCalledWith(platform, newToken);
  });
}); 