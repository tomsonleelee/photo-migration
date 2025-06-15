import { ApiAdapterFactory } from '../factories/ApiAdapterFactory.js';
import { Platform, ApiError, createFetchParams } from '../types.js';

/**
 * Photo Repository - Provides unified access to photos across different platforms
 */
export class PhotoRepository {
  constructor(platform, options = {}) {
    if (!ApiAdapterFactory.isPlatformSupported(platform)) {
      throw new ApiError(`Unsupported platform: ${platform}`, 400);
    }
    
    this.platform = platform;
    this.adapter = ApiAdapterFactory.createAdapter(platform, options);
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Fetch photos with caching
   * @param {Object} params - Fetch parameters
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}, useCache = true) {
    const fetchParams = createFetchParams(params);
    const cacheKey = `photos_${JSON.stringify(fetchParams)}`;
    
    // Check cache first
    if (useCache && this._isCacheValid(cacheKey)) {
      this.adapter.logActivity('fetchPhotos', { source: 'cache', params: fetchParams });
      return this.cache.get(cacheKey).data;
    }
    
    try {
      const result = await this.adapter.fetchPhotos(fetchParams);
      
      // Cache the result
      if (useCache) {
        this._setCacheItem(cacheKey, result);
      }
      
      this.adapter.logActivity('fetchPhotos', { 
        source: 'api', 
        params: fetchParams, 
        count: result.data?.length || 0 
      });
      
      return result;
    } catch (error) {
      this.adapter.logActivity('fetchPhotos', { 
        source: 'api', 
        params: fetchParams, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fetch a specific photo by ID
   * @param {string} photoId - Photo ID
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} Normalized photo object
   */
  async fetchPhoto(photoId, useCache = true) {
    const cacheKey = `photo_${photoId}`;
    
    if (useCache && this._isCacheValid(cacheKey)) {
      this.adapter.logActivity('fetchPhoto', { source: 'cache', photoId });
      return this.cache.get(cacheKey).data;
    }
    
    try {
      const result = await this.adapter.fetchPhoto(photoId);
      
      if (useCache && result) {
        this._setCacheItem(cacheKey, result);
      }
      
      this.adapter.logActivity('fetchPhoto', { source: 'api', photoId, found: !!result });
      return result;
    } catch (error) {
      this.adapter.logActivity('fetchPhoto', { source: 'api', photoId, error: error.message });
      throw error;
    }
  }

  /**
   * Upload a photo to the platform
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    try {
      const result = await this.adapter.uploadPhoto(photoData);
      
      // Invalidate photos cache since we added a new photo
      this._invalidatePhotosCache();
      
      this.adapter.logActivity('uploadPhoto', { 
        success: result.success, 
        photoId: result.photoId 
      });
      
      return result;
    } catch (error) {
      this.adapter.logActivity('uploadPhoto', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a photo from the platform
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    try {
      const result = await this.adapter.deletePhoto(photoId);
      
      // Remove from cache
      this._removeCacheItem(`photo_${photoId}`);
      this._invalidatePhotosCache();
      
      this.adapter.logActivity('deletePhoto', { photoId, success: result });
      return result;
    } catch (error) {
      this.adapter.logActivity('deletePhoto', { photoId, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch albums from the platform
   * @param {Object} params - Fetch parameters
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params = {}, useCache = true) {
    const cacheKey = `albums_${JSON.stringify(params)}`;
    
    if (useCache && this._isCacheValid(cacheKey)) {
      this.adapter.logActivity('fetchAlbums', { source: 'cache', params });
      return this.cache.get(cacheKey).data;
    }
    
    try {
      const result = await this.adapter.fetchAlbums(params);
      
      if (useCache) {
        this._setCacheItem(cacheKey, result);
      }
      
      this.adapter.logActivity('fetchAlbums', { 
        source: 'api', 
        params, 
        count: result.data?.length || 0 
      });
      
      return result;
    } catch (error) {
      this.adapter.logActivity('fetchAlbums', { source: 'api', params, error: error.message });
      throw error;
    }
  }

  /**
   * Create a new album
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    try {
      const result = await this.adapter.createAlbum(albumData);
      
      // Invalidate albums cache
      this._invalidateAlbumsCache();
      
      this.adapter.logActivity('createAlbum', { 
        title: albumData.title, 
        success: !!result 
      });
      
      return result;
    } catch (error) {
      this.adapter.logActivity('createAlbum', { 
        title: albumData.title, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get user profile information
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(useCache = true) {
    const cacheKey = 'user_profile';
    
    if (useCache && this._isCacheValid(cacheKey)) {
      this.adapter.logActivity('getUserProfile', { source: 'cache' });
      return this.cache.get(cacheKey).data;
    }
    
    try {
      const result = await this.adapter.getUserProfile();
      
      if (useCache && result) {
        this._setCacheItem(cacheKey, result, 15 * 60 * 1000); // 15 minute cache for profile
      }
      
      this.adapter.logActivity('getUserProfile', { source: 'api', userId: result?.id });
      return result;
    } catch (error) {
      this.adapter.logActivity('getUserProfile', { source: 'api', error: error.message });
      throw error;
    }
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    try {
      const result = await this.adapter.getApiLimits();
      this.adapter.logActivity('getApiLimits', { 
        limit: result.limit, 
        remaining: result.remaining 
      });
      return result;
    } catch (error) {
      this.adapter.logActivity('getApiLimits', { error: error.message });
      throw error;
    }
  }

  /**
   * Test connection to the platform
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const result = await this.adapter.testConnection();
      this.adapter.logActivity('testConnection', { success: result });
      return result;
    } catch (error) {
      this.adapter.logActivity('testConnection', { error: error.message });
      return false;
    }
  }

  /**
   * Check if the repository is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    return await this.adapter.isAuthenticated();
  }

  /**
   * Refresh the authentication token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    const result = await this.adapter.refreshToken();
    this.adapter.logActivity('refreshToken', { success: !!result });
    return result;
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    this.adapter.logActivity('clearCache', { action: 'all_cache_cleared' });
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      items: []
    };
    
    for (const [key, value] of this.cache.entries()) {
      stats.items.push({
        key,
        expires: new Date(value.expires),
        isValid: this._isCacheValid(key)
      });
    }
    
    return stats;
  }

  /**
   * Check if a cache item is valid
   * @param {string} key - Cache key
   * @returns {boolean} Validity status
   * @private
   */
  _isCacheValid(key) {
    const item = this.cache.get(key);
    return item && item.expires > Date.now();
  }

  /**
   * Set a cache item
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @private
   */
  _setCacheItem(key, data, ttl = this.cacheTTL) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  /**
   * Remove a cache item
   * @param {string} key - Cache key
   * @private
   */
  _removeCacheItem(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate photos cache
   * @private
   */
  _invalidatePhotosCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('photos_')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate albums cache
   * @private
   */
  _invalidateAlbumsCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('albums_')) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Multi-Platform Photo Repository - Manages multiple repositories
 */
export class MultiPlatformPhotoRepository {
  constructor(platforms, options = {}) {
    this.repositories = new Map();
    this.options = options;
    
    for (const platform of platforms) {
      this.repositories.set(platform, new PhotoRepository(platform, options));
    }
  }

  /**
   * Get repository for a specific platform
   * @param {string} platform - Platform identifier
   * @returns {PhotoRepository} Platform repository
   */
  getRepository(platform) {
    const repo = this.repositories.get(platform);
    if (!repo) {
      throw new ApiError(`No repository found for platform: ${platform}`, 404);
    }
    return repo;
  }

  /**
   * Fetch photos from all platforms
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Map>} Map of platform to photos
   */
  async fetchPhotosFromAllPlatforms(params = {}) {
    const results = new Map();
    const promises = [];
    
    for (const [platform, repository] of this.repositories) {
      promises.push(
        repository.fetchPhotos(params)
          .then(result => results.set(platform, result))
          .catch(error => results.set(platform, { error: error.message }))
      );
    }
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Test connections to all platforms
   * @returns {Promise<Map>} Map of platform to connection status
   */
  async testAllConnections() {
    const results = new Map();
    const promises = [];
    
    for (const [platform, repository] of this.repositories) {
      promises.push(
        repository.testConnection()
          .then(result => results.set(platform, result))
          .catch(() => results.set(platform, false))
      );
    }
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Clear cache for all repositories
   */
  clearAllCaches() {
    for (const repository of this.repositories.values()) {
      repository.clearCache();
    }
  }

  /**
   * Get supported platforms
   * @returns {string[]} Array of platform identifiers
   */
  getSupportedPlatforms() {
    return Array.from(this.repositories.keys());
  }
} 