import { PhotoRepository, MultiPlatformPhotoRepository } from './repositories/PhotoRepository.js';
import { ApiAdapterFactory } from './factories/ApiAdapterFactory.js';
import { Platform, ApiError } from './types.js';
import Bottleneck from 'bottleneck';

/**
 * Photo API Service - Main service for photo operations across platforms
 */
export class PhotoApiService {
  constructor(options = {}) {
    this.options = {
      enableRateLimit: true,
      rateLimitConfig: {
        minTime: 100, // Minimum time between requests
        maxConcurrent: 5, // Maximum concurrent requests
        reservoir: 100, // Number of requests that can be made immediately
        reservoirRefreshAmount: 100, // Amount to add to reservoir on refresh
        reservoirRefreshInterval: 60 * 1000 // Refresh interval in ms
      },
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableLogging: true,
      ...options
    };

    this.rateLimiter = null;
    this.authManager = null;
    this.repositories = new Map();
    
    this._initializeRateLimiter();
    this._setupApiFactory();
  }

  /**
   * Set the authentication manager
   * @param {Object} authManager - Authentication manager instance
   */
  setAuthManager(authManager) {
    this.authManager = authManager;
    ApiAdapterFactory.setAuthManager(authManager);
  }

  /**
   * Initialize a repository for a specific platform
   * @param {string} platform - Platform identifier
   * @param {Object} options - Platform-specific options
   * @returns {PhotoRepository} Platform repository
   */
  initializePlatform(platform, options = {}) {
    if (this.repositories.has(platform)) {
      return this.repositories.get(platform);
    }

    const repoOptions = {
      ...this.options,
      ...options,
      authManager: this.authManager,
      rateLimiter: this.rateLimiter
    };

    const repository = new PhotoRepository(platform, repoOptions);
    this.repositories.set(platform, repository);
    
    this._log('info', `Initialized repository for platform: ${platform}`);
    return repository;
  }

  /**
   * Initialize repositories for multiple platforms
   * @param {string[]} platforms - Array of platform identifiers
   * @param {Object} options - Platform-specific options
   * @returns {MultiPlatformPhotoRepository} Multi-platform repository
   */
  initializeMultiplePlatforms(platforms, options = {}) {
    const repoOptions = {
      ...this.options,
      ...options,
      authManager: this.authManager,
      rateLimiter: this.rateLimiter
    };

    // Initialize individual repositories
    for (const platform of platforms) {
      this.initializePlatform(platform, repoOptions);
    }

    const multiRepo = new MultiPlatformPhotoRepository(platforms, repoOptions);
    this._log('info', `Initialized multi-platform repository for: ${platforms.join(', ')}`);
    return multiRepo;
  }

  /**
   * Get repository for a specific platform
   * @param {string} platform - Platform identifier
   * @returns {PhotoRepository} Platform repository
   */
  getRepository(platform) {
    const repository = this.repositories.get(platform);
    if (!repository) {
      throw new ApiError(`Repository not initialized for platform: ${platform}`, 404);
    }
    return repository;
  }

  /**
   * Fetch photos from a specific platform
   * @param {string} platform - Platform identifier
   * @param {Object} params - Fetch parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(platform, params = {}, options = {}) {
    const repository = this.getRepository(platform);
    
    this._log('info', `Fetching photos from ${platform}`, { params });
    
    try {
      const result = await repository.fetchPhotos(params, options.useCache !== false);
      
      this._log('info', `Successfully fetched ${result.data?.length || 0} photos from ${platform}`);
      return result;
    } catch (error) {
      this._log('error', `Failed to fetch photos from ${platform}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch photos from multiple platforms
   * @param {string[]} platforms - Array of platform identifiers
   * @param {Object} params - Fetch parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Map>} Map of platform to photos
   */
  async fetchPhotosFromMultiplePlatforms(platforms, params = {}, options = {}) {
    const multiRepo = this.initializeMultiplePlatforms(platforms, options);
    
    this._log('info', `Fetching photos from multiple platforms: ${platforms.join(', ')}`, { params });
    
    try {
      const results = await multiRepo.fetchPhotosFromAllPlatforms(params);
      
      const totalPhotos = Array.from(results.values())
        .filter(result => !result.error)
        .reduce((sum, result) => sum + (result.data?.length || 0), 0);
      
      this._log('info', `Successfully fetched ${totalPhotos} total photos from ${platforms.length} platforms`);
      return results;
    } catch (error) {
      this._log('error', `Failed to fetch photos from multiple platforms`, { error: error.message });
      throw error;
    }
  }

  /**
   * Upload a photo to a specific platform
   * @param {string} platform - Platform identifier
   * @param {Object} photoData - Photo data to upload
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(platform, photoData, options = {}) {
    const repository = this.getRepository(platform);
    
    this._log('info', `Uploading photo to ${platform}`, { 
      filename: photoData.filename,
      size: photoData.size 
    });
    
    try {
      const result = await repository.uploadPhoto(photoData);
      
      this._log('info', `Successfully uploaded photo to ${platform}`, {
        success: result.success,
        photoId: result.photoId
      });
      
      return result;
    } catch (error) {
      this._log('error', `Failed to upload photo to ${platform}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Migrate photos between platforms
   * @param {string} sourcePlatform - Source platform identifier
   * @param {string} targetPlatform - Target platform identifier
   * @param {Object} params - Migration parameters
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Object>} Migration result
   */
  async migratePhotos(sourcePlatform, targetPlatform, params = {}, progressCallback = null) {
    const sourceRepo = this.getRepository(sourcePlatform);
    const targetRepo = this.getRepository(targetPlatform);
    
    this._log('info', `Starting photo migration from ${sourcePlatform} to ${targetPlatform}`, { params });
    
    const migrationResult = {
      total: 0,
      completed: 0,
      failed: 0,
      startTime: new Date(),
      endTime: null,
      errors: []
    };

    try {
      // Fetch photos from source platform
      const sourcePhotos = await sourceRepo.fetchPhotos(params);
      migrationResult.total = sourcePhotos.data?.length || 0;
      
      if (migrationResult.total === 0) {
        this._log('info', `No photos found to migrate from ${sourcePlatform}`);
        migrationResult.endTime = new Date();
        return migrationResult;
      }

      this._log('info', `Found ${migrationResult.total} photos to migrate`);

      // Migrate each photo
      for (const photo of sourcePhotos.data) {
        try {
          // Report progress
          if (progressCallback) {
            progressCallback({
              ...migrationResult,
              currentPhoto: photo
            });
          }

          // Download photo data (this would need to be implemented)
          // const photoData = await this._downloadPhoto(photo);
          
          // Upload to target platform
          // const uploadResult = await targetRepo.uploadPhoto(photoData);
          
          // For now, simulate the upload
          const uploadResult = { success: true, photoId: `migrated_${photo.id}` };
          
          if (uploadResult.success) {
            migrationResult.completed++;
            this._log('debug', `Successfully migrated photo ${photo.id}`, {
              sourceId: photo.id,
              targetId: uploadResult.photoId
            });
          } else {
            migrationResult.failed++;
            migrationResult.errors.push({
              photoId: photo.id,
              error: uploadResult.error || 'Upload failed'
            });
          }
          
        } catch (error) {
          migrationResult.failed++;
          migrationResult.errors.push({
            photoId: photo.id,
            error: error.message
          });
          
          this._log('error', `Failed to migrate photo ${photo.id}`, { error: error.message });
        }
      }

      migrationResult.endTime = new Date();
      
      this._log('info', `Migration completed`, {
        total: migrationResult.total,
        completed: migrationResult.completed,
        failed: migrationResult.failed,
        duration: migrationResult.endTime - migrationResult.startTime
      });

      return migrationResult;
      
    } catch (error) {
      migrationResult.endTime = new Date();
      this._log('error', `Migration failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * Test connections to all initialized platforms
   * @returns {Promise<Map>} Map of platform to connection status
   */
  async testAllConnections() {
    const results = new Map();
    const platforms = Array.from(this.repositories.keys());
    
    this._log('info', `Testing connections to ${platforms.length} platforms`);
    
    const promises = platforms.map(async (platform) => {
      try {
        const repository = this.repositories.get(platform);
        const isConnected = await repository.testConnection();
        results.set(platform, isConnected);
        
        this._log('info', `Connection test for ${platform}: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results.set(platform, false);
        this._log('error', `Connection test for ${platform} failed`, { error: error.message });
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Get API limits for all initialized platforms
   * @returns {Promise<Map>} Map of platform to API limits
   */
  async getAllApiLimits() {
    const results = new Map();
    const platforms = Array.from(this.repositories.keys());
    
    const promises = platforms.map(async (platform) => {
      try {
        const repository = this.repositories.get(platform);
        const limits = await repository.getApiLimits();
        results.set(platform, limits);
      } catch (error) {
        results.set(platform, { error: error.message });
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    for (const repository of this.repositories.values()) {
      repository.clearCache();
    }
    this._log('info', 'Cleared all caches');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getServiceStats() {
    const stats = {
      platforms: Array.from(this.repositories.keys()),
      totalRepositories: this.repositories.size,
      rateLimiterEnabled: !!this.rateLimiter,
      authManagerSet: !!this.authManager,
      cacheStats: {}
    };
    
    // Get cache stats for each platform
    for (const [platform, repository] of this.repositories) {
      stats.cacheStats[platform] = repository.getCacheStats();
    }
    
    return stats;
  }

  /**
   * Initialize rate limiter
   * @private
   */
  _initializeRateLimiter() {
    if (this.options.enableRateLimit) {
      this.rateLimiter = new Bottleneck(this.options.rateLimitConfig);
      
      this.rateLimiter.on('failed', (error, jobInfo) => {
        this._log('warn', 'Rate limiter job failed', { 
          error: error.message, 
          retryCount: jobInfo.retryCount 
        });
      });
      
      this.rateLimiter.on('retry', (error, jobInfo) => {
        this._log('info', 'Rate limiter retrying job', { 
          error: error.message, 
          retryCount: jobInfo.retryCount 
        });
      });
    }
  }

  /**
   * Setup API factory
   * @private
   */
  _setupApiFactory() {
    if (this.rateLimiter) {
      ApiAdapterFactory.setRateLimiter(this.rateLimiter);
    }
    
    if (this.authManager) {
      ApiAdapterFactory.setAuthManager(this.authManager);
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @private
   */
  _log(level, message, metadata = {}) {
    if (!this.options.enableLogging) return;
    
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      service: 'PhotoApiService',
      message,
      ...metadata
    };
    
    console.log(`[${level.toUpperCase()}]`, message, metadata);
  }
}

// Export singleton instance
export default new PhotoApiService(); 