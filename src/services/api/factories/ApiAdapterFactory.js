import { Platform, ApiError } from '../types.js';
// Import all platform adapters
import { GooglePhotosAdapter } from '../adapters/GooglePhotosAdapter.js';
import { FacebookAdapter } from '../adapters/FacebookAdapter.js';
import { InstagramAdapter } from '../adapters/InstagramAdapter.js';
import { FlickrAdapter } from '../adapters/FlickrAdapter.js';
import { FiveHundredPxAdapter } from '../adapters/FiveHundredPxAdapter.js';

/**
 * Factory for creating API adapters based on platform
 */
export class ApiAdapterFactory {
  static _adapters = new Map();
  static _authManager = null;
  static _rateLimiter = null;

  /**
   * Set the global authentication manager
   * @param {Object} authManager - Authentication manager instance
   */
  static setAuthManager(authManager) {
    this._authManager = authManager;
  }

  /**
   * Set the global rate limiter
   * @param {Object} rateLimiter - Rate limiter instance
   */
  static setRateLimiter(rateLimiter) {
    this._rateLimiter = rateLimiter;
  }

  /**
   * Create an API adapter for the specified platform
   * @param {string} platform - Platform identifier
   * @param {Object} options - Additional options
   * @returns {PhotoApiAdapter} Platform-specific adapter
   */
  static createAdapter(platform, options = {}) {
    // Check if adapter is already cached
    const cacheKey = `${platform}_${JSON.stringify(options)}`;
    if (this._adapters.has(cacheKey)) {
      return this._adapters.get(cacheKey);
    }

    let adapter;
    const authManager = options.authManager || this._authManager;
    const rateLimiter = options.rateLimiter || this._rateLimiter;

    switch (platform) {
      case Platform.GOOGLE_PHOTOS:
        adapter = new GooglePhotosAdapter(authManager, rateLimiter, options);
        break;
      
      case Platform.FACEBOOK:
        adapter = new FacebookAdapter(authManager, rateLimiter, options);
        break;
      
      case Platform.INSTAGRAM:
        adapter = new InstagramAdapter(authManager, rateLimiter, options);
        break;
      
      case Platform.FLICKR:
        adapter = new FlickrAdapter(authManager, rateLimiter, options);
        break;
      
      case Platform.FIVE_HUNDRED_PX:
        adapter = new FiveHundredPxAdapter(authManager, rateLimiter, options);
        break;
      
      default:
        // Fallback to mock adapter for unsupported platforms in development
        if (process.env.NODE_ENV === 'development') {
          adapter = this._createMockAdapter(platform, authManager, rateLimiter);
        } else {
          throw new ApiError(`Unsupported platform: ${platform}`, 400);
        }
    }

    // Cache the adapter
    this._adapters.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Get all supported platforms
   * @returns {string[]} Array of supported platform identifiers
   */
  static getSupportedPlatforms() {
    return Object.values(Platform);
  }

  /**
   * Check if a platform is supported
   * @param {string} platform - Platform identifier
   * @returns {boolean} Support status
   */
  static isPlatformSupported(platform) {
    return Object.values(Platform).includes(platform);
  }

  /**
   * Create adapters for multiple platforms
   * @param {string[]} platforms - Array of platform identifiers
   * @param {Object} options - Additional options
   * @returns {Map<string, PhotoApiAdapter>} Map of platform to adapter
   */
  static createMultipleAdapters(platforms, options = {}) {
    const adapters = new Map();
    
    for (const platform of platforms) {
      try {
        const adapter = this.createAdapter(platform, options);
        adapters.set(platform, adapter);
      } catch (error) {
        console.error(`Failed to create adapter for ${platform}:`, error);
        // Continue with other platforms
      }
    }
    
    return adapters;
  }

  /**
   * Clear the adapter cache
   */
  static clearCache() {
    this._adapters.clear();
  }

  /**
   * Get the current cache size
   * @returns {number} Number of cached adapters
   */
  static getCacheSize() {
    return this._adapters.size;
  }

  /**
   * Create a mock adapter for development/testing (temporary)
   * @param {string} platform - Platform identifier
   * @param {Object} authManager - Authentication manager
   * @param {Object} rateLimiter - Rate limiter
   * @returns {Object} Mock adapter
   * @private
   */
  static _createMockAdapter(platform, authManager, rateLimiter) {
    return {
      platform,
      authManager,
      rateLimiter,
      
      async fetchPhotos(params) {
        console.log(`[Mock] Fetching photos from ${platform}`, params);
        return {
          data: [],
          nextPageToken: null,
          hasNextPage: false,
          totalCount: 0
        };
      },
      
      async fetchPhoto(photoId) {
        console.log(`[Mock] Fetching photo ${photoId} from ${platform}`);
        return null;
      },
      
      async uploadPhoto(photoData) {
        console.log(`[Mock] Uploading photo to ${platform}`, photoData);
        return {
          success: false,
          error: 'Mock adapter - upload not implemented'
        };
      },
      
      async deletePhoto(photoId) {
        console.log(`[Mock] Deleting photo ${photoId} from ${platform}`);
        return false;
      },
      
      async fetchAlbums(params) {
        console.log(`[Mock] Fetching albums from ${platform}`, params);
        return {
          data: [],
          nextPageToken: null,
          hasNextPage: false
        };
      },
      
      async createAlbum(albumData) {
        console.log(`[Mock] Creating album in ${platform}`, albumData);
        return null;
      },
      
      async getUserProfile() {
        console.log(`[Mock] Getting user profile from ${platform}`);
        return {
          id: 'mock_user_id',
          name: 'Mock User',
          email: 'mock@example.com',
          platform
        };
      },
      
      async getApiLimits() {
        console.log(`[Mock] Getting API limits for ${platform}`);
        return {
          limit: 1000,
          remaining: 950,
          resetTime: new Date(Date.now() + 3600000) // 1 hour from now
        };
      },
      
      async testConnection() {
        console.log(`[Mock] Testing connection to ${platform}`);
        return true;
      },
      
      async isAuthenticated() {
        return authManager ? await authManager.isAuthenticated(platform) : false;
      },
      
      async refreshToken() {
        if (!authManager) {
          throw new Error('AuthManager not available for token refresh');
        }
        return await authManager.refreshToken(platform);
      },
      
      logActivity(operation, metadata = {}) {
        console.log(`[Mock] ${platform} activity:`, operation, metadata);
      }
    };
  }
} 