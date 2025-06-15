import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import tokenStorage from '../tokenStorage';
import tokenValidator from '../tokenValidator';
import logoutManager from '../logoutManager';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

describe('Token Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', async () => {
      const platform = 'google';
      const token = 'test-access-token';
      
      // Mock localStorage behavior
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        token: btoa(token),
        expiresAt: Date.now() + 3600000,
        platform
      }));

      await tokenStorage.setToken(platform, token);
      const retrievedToken = await tokenStorage.getToken(platform);

      expect(retrievedToken).toBe(token);
    });

    it('should handle expired tokens', async () => {
      const platform = 'google';
      
      // Mock expired token
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        token: 'expired-token',
        expiresAt: Date.now() - 1000, // 過期
        platform
      }));

      const retrievedToken = await tokenStorage.getToken(platform);
      expect(retrievedToken).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`auth_token_${platform}`);
    });

    it('should store and retrieve refresh tokens', async () => {
      const platform = 'google';
      const refreshToken = 'test-refresh-token';
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        refreshToken: btoa(refreshToken),
        expiresAt: Date.now() + 86400000,
        platform
      }));

      await tokenStorage.setRefreshToken(platform, refreshToken);
      const retrievedRefreshToken = await tokenStorage.getRefreshToken(platform);

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
    vi.clearAllMocks();
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
      vi.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(mockRefreshToken);
      
      // Mock successful token refresh
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newAccessToken,
          refresh_token: 'new-refresh-token'
        })
      });

      // Mock setRefreshToken
      vi.spyOn(tokenStorage, 'setRefreshToken').mockResolvedValue();

      const refreshedToken = await tokenValidator.refreshGoogleToken('old-token');
      expect(refreshedToken).toBe(newAccessToken);
      expect(tokenStorage.setRefreshToken).toHaveBeenCalledWith('google', 'new-refresh-token');
    });

    it('should throw error when refresh token is not available', async () => {
      vi.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(null);

      await expect(tokenValidator.refreshGoogleToken('old-token'))
        .rejects.toThrow('Google refresh token not available');
    });
  });

  describe('Ensure Valid Token', () => {
    it('should return current token if valid', async () => {
      const validToken = 'valid-token';
      
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(validToken);
      vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(true);

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBe(validToken);
    });

    it('should refresh token if current token is invalid', async () => {
      const oldToken = 'invalid-token';
      const newToken = 'new-valid-token';
      
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
      vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);
      vi.spyOn(tokenValidator, 'refreshToken').mockResolvedValue(newToken);
      vi.spyOn(tokenStorage, 'setToken').mockResolvedValue();

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBe(newToken);
      expect(tokenStorage.setToken).toHaveBeenCalledWith('google', newToken);
    });

    it('should remove token if refresh fails', async () => {
      const oldToken = 'invalid-token';
      
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
      vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);
      vi.spyOn(tokenValidator, 'refreshToken').mockRejectedValue(new Error('Refresh failed'));
      vi.spyOn(tokenStorage, 'removeToken').mockResolvedValue();

      const result = await tokenValidator.ensureValidToken('google');
      expect(result).toBeNull();
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });
  });
});

describe('Logout Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Logout', () => {
    it('should logout from Google successfully', async () => {
      const token = 'google-token';
      
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(token);
      vi.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      
      fetch.mockResolvedValueOnce({ ok: true });

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true);
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });

    it('should handle logout when no token exists', async () => {
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(null);

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true);
    });

    it('should continue with local cleanup even if platform logout fails', async () => {
      const token = 'google-token';
      
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(token);
      vi.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await logoutManager.logoutPlatform('google');
      expect(result).toBe(true); // 應該仍然成功，因為本地清理完成
      expect(tokenStorage.removeToken).toHaveBeenCalledWith('google');
    });
  });

  describe('Global Logout', () => {
    it('should logout from all platforms', async () => {
      const platforms = ['google', 'facebook'];
      
      vi.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(platforms);
      vi.spyOn(tokenStorage, 'getToken').mockResolvedValue('some-token');
      vi.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
      vi.spyOn(tokenStorage, 'clearAllTokens').mockResolvedValue();
      
      fetch.mockResolvedValue({ ok: true });

      const results = await logoutManager.logoutAll();
      
      expect(results).toEqual({
        google: true,
        facebook: true
      });
      expect(tokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authState');
    });

    it('should perform emergency cleanup on failure', async () => {
      vi.spyOn(tokenStorage, 'getStoredPlatforms').mockRejectedValue(new Error('Storage error'));
      vi.spyOn(tokenStorage, 'clearAllTokens').mockResolvedValue();

      await expect(logoutManager.logoutAll()).rejects.toThrow('Storage error');
      expect(tokenStorage.clearAllTokens).toHaveBeenCalled();
      expect(localStorageMock.clear).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should detect active sessions', async () => {
      vi.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(['google', 'facebook']);

      const hasActive = await logoutManager.hasActiveSessions();
      expect(hasActive).toBe(true);
    });

    it('should detect no active sessions', async () => {
      vi.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue([]);

      const hasActive = await logoutManager.hasActiveSessions();
      expect(hasActive).toBe(false);
    });

    it('should provide logout status report', async () => {
      vi.spyOn(tokenStorage, 'getStoredPlatforms').mockResolvedValue(['google']);
      localStorageMock.getItem.mockReturnValue('{"isAuthenticated": true}');
      
      // Mock Object.keys(localStorage)
      Object.defineProperty(localStorage, 'length', { value: 2 });
      Object.defineProperty(localStorage, 'key', {
        value: vi.fn()
          .mockReturnValueOnce('authState')
          .mockReturnValueOnce('auth_token_google')
      });

      const status = await logoutManager.getLogoutStatus();
      
      expect(status.hasStoredTokens).toBe(true);
      expect(status.storedPlatforms).toEqual(['google']);
      expect(status.hasAuthState).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete authentication flow', async () => {
    const platform = 'google';
    const accessToken = 'access-token';
    const refreshToken = 'refresh-token';

    // 1. 儲存tokens
    await tokenStorage.setToken(platform, accessToken);
    await tokenStorage.setRefreshToken(platform, refreshToken);

    // 2. 驗證token
    vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(true);
    const isValid = await tokenValidator.validateToken(platform, accessToken);
    expect(isValid).toBe(true);

    // 3. 登出
    vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(accessToken);
    vi.spyOn(tokenStorage, 'removeToken').mockResolvedValue();
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
    vi.spyOn(tokenStorage, 'getToken').mockResolvedValue(oldToken);
    vi.spyOn(tokenStorage, 'getRefreshToken').mockResolvedValue(refreshToken);
    vi.spyOn(tokenStorage, 'setToken').mockResolvedValue();

    // Mock validation (token is invalid)
    vi.spyOn(tokenValidator, 'validateToken').mockResolvedValue(false);

    // Mock successful refresh
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: newToken })
    });

    const validToken = await tokenValidator.ensureValidToken(platform);
    expect(validToken).toBe(newToken);
    expect(tokenStorage.setToken).toHaveBeenCalledWith(platform, newToken);
  });
}); 