/**
 * Data Transformation Service
 * Central service for all data normalization and transformation operations
 */

import { PhotoNormalizer, photoNormalizer } from './PhotoNormalizer.js';
import { AlbumNormalizer, albumNormalizer } from './AlbumNormalizer.js';
import { UserProfileNormalizer, userProfileNormalizer } from './UserProfileNormalizer.js';
import { Logger } from '../utils/index.js';
import { Platform, createApiResponse } from '../types.js';

/**
 * Data types supported by the transformation service
 */
export const DataType = {
  PHOTO: 'photo',
  ALBUM: 'album',
  USER_PROFILE: 'user_profile',
  API_RESPONSE: 'api_response'
};

/**
 * Transformation configuration options
 */
export const createTransformationConfig = ({
  enableValidation = true,
  preserveOriginalData = true,
  enableMetadataEnrichment = true,
  enableBatchOptimization = true,
  enableCaching = false,
  cacheTTL = 300000, // 5 minutes
  enableLogging = true
}) => ({
  enableValidation,
  preserveOriginalData,
  enableMetadataEnrichment,
  enableBatchOptimization,
  enableCaching,
  cacheTTL,
  enableLogging
});

export class DataTransformationService {
  constructor(config = {}) {
    this.config = {
      ...createTransformationConfig({}),
      ...config
    };
    
    this.logger = Logger.getLogger('DataTransformationService');
    
    // Initialize normalizers
    this.photoNormalizer = new PhotoNormalizer();
    this.albumNormalizer = new AlbumNormalizer();
    this.userProfileNormalizer = new UserProfileNormalizer();
    
    // Cache for transformation results (if enabled)
    this.cache = this.config.enableCaching ? new Map() : null;
    
    // Statistics tracking
    this.stats = {
      transformations: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Transform data of any supported type from any platform
   * @param {Object|Array} rawData - Raw data from platform API
   * @param {string} dataType - Type of data (photo, album, user_profile)
   * @param {string} platform - Platform identifier
   * @param {Object} options - Transformation options
   * @returns {Object|Array} Transformed data
   */
  async transform(rawData, dataType, platform, options = {}) {
    const startTime = Date.now();
    
    try {
      this.stats.transformations++;
      
      if (this.config.enableLogging) {
        this.logger.debug('Starting data transformation', {
          dataType,
          platform,
          isArray: Array.isArray(rawData),
          itemCount: Array.isArray(rawData) ? rawData.length : 1
        });
      }

      // Check cache if enabled
      if (this.config.enableCaching) {
        const cacheKey = this._generateCacheKey(rawData, dataType, platform);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
          this.stats.cacheHits++;
          if (this.config.enableLogging) {
            this.logger.debug('Cache hit for transformation', { cacheKey });
          }
          return cached.data;
        } else {
          this.stats.cacheMisses++;
        }
      }

      // Validate input data
      if (this.config.enableValidation) {
        this._validateInput(rawData, dataType, platform);
      }

      // Perform transformation
      let result;
      
      if (Array.isArray(rawData)) {
        result = await this._transformBatch(rawData, dataType, platform, options);
      } else {
        result = await this._transformSingle(rawData, dataType, platform, options);
      }

      // Add metadata enrichment
      if (this.config.enableMetadataEnrichment) {
        result = this._enrichMetadata(result, dataType, platform);
      }

      // Cache the result if enabled
      if (this.config.enableCaching) {
        const cacheKey = this._generateCacheKey(rawData, dataType, platform);
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      // Update statistics
      const processingTime = Date.now() - startTime;
      this._updateStats(processingTime);

      if (this.config.enableLogging) {
        this.logger.info('Data transformation completed', {
          dataType,
          platform,
          processingTime,
          itemCount: Array.isArray(result) ? result.length : 1
        });
      }

      return result;

    } catch (error) {
      this.stats.errors++;
      this.logger.error('Data transformation failed', {
        error: error.message,
        dataType,
        platform,
        rawData: this.config.enableLogging ? rawData : '[hidden]'
      });
      throw error;
    }
  }

  /**
   * Transform photos from any platform
   * @param {Object|Array} rawPhotos - Raw photo data
   * @param {string} platform - Platform identifier
   * @param {Object} options - Transformation options
   * @returns {Object|Array} Normalized photos
   */
  async transformPhotos(rawPhotos, platform, options = {}) {
    return this.transform(rawPhotos, DataType.PHOTO, platform, options);
  }

  /**
   * Transform albums from any platform
   * @param {Object|Array} rawAlbums - Raw album data
   * @param {string} platform - Platform identifier
   * @param {Object} options - Transformation options
   * @returns {Object|Array} Normalized albums
   */
  async transformAlbums(rawAlbums, platform, options = {}) {
    return this.transform(rawAlbums, DataType.ALBUM, platform, options);
  }

  /**
   * Transform user profiles from any platform
   * @param {Object|Array} rawProfiles - Raw user profile data
   * @param {string} platform - Platform identifier
   * @param {Object} options - Transformation options
   * @returns {Object|Array} Normalized user profiles
   */
  async transformUserProfiles(rawProfiles, platform, options = {}) {
    return this.transform(rawProfiles, DataType.USER_PROFILE, platform, options);
  }

  /**
   * Transform API response with pagination and metadata
   * @param {Object} apiResponse - Raw API response
   * @param {string} dataType - Type of data in response
   * @param {string} platform - Platform identifier
   * @param {Object} options - Transformation options
   * @returns {Object} Normalized API response
   */
  async transformApiResponse(apiResponse, dataType, platform, options = {}) {
    try {
      const transformedData = await this.transform(
        apiResponse.data || apiResponse.items || apiResponse.results || [],
        dataType,
        platform,
        options
      );

      return createApiResponse({
        data: transformedData,
        nextPageToken: apiResponse.nextPageToken || apiResponse.next_cursor || apiResponse.paging?.next,
        hasNextPage: !!(apiResponse.nextPageToken || apiResponse.next_cursor || apiResponse.paging?.next),
        totalCount: apiResponse.totalCount || apiResponse.total || apiResponse.count,
        rateLimit: apiResponse.rateLimit,
        platform: platform,
        transformedAt: new Date().toISOString(),
        transformationStats: {
          originalCount: Array.isArray(apiResponse.data) ? apiResponse.data.length : 1,
          transformedCount: Array.isArray(transformedData) ? transformedData.length : 1
        }
      });
    } catch (error) {
      this.logger.error('API response transformation failed', {
        error: error.message,
        dataType,
        platform
      });
      throw error;
    }
  }

  /**
   * Get transformation statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache ? this.cache.size : 0,
      cacheHitRate: this.stats.transformations > 0 
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100 
        : 0
    };
  }

  /**
   * Clear cache and reset statistics
   */
  reset() {
    if (this.cache) {
      this.cache.clear();
    }
    
    this.stats = {
      transformations: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0
    };
    
    this.logger.info('Data transformation service reset');
  }

  /**
   * Transform single data item
   * @param {Object} rawData - Raw data item
   * @param {string} dataType - Data type
   * @param {string} platform - Platform identifier
   * @param {Object} options - Options
   * @returns {Object} Transformed data
   * @private
   */
  async _transformSingle(rawData, dataType, platform, options = {}) {
    switch (dataType) {
      case DataType.PHOTO:
        return this.photoNormalizer.normalize(rawData, platform);
      case DataType.ALBUM:
        return this.albumNormalizer.normalize(rawData, platform);
      case DataType.USER_PROFILE:
        return this.userProfileNormalizer.normalize(rawData, platform);
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  /**
   * Transform batch of data items
   * @param {Array} rawDataArray - Array of raw data items
   * @param {string} dataType - Data type
   * @param {string} platform - Platform identifier
   * @param {Object} options - Options
   * @returns {Array} Array of transformed data
   * @private
   */
  async _transformBatch(rawDataArray, dataType, platform, options = {}) {
    if (this.config.enableBatchOptimization && rawDataArray.length > 10) {
      // Use batch methods for better performance on large datasets
      switch (dataType) {
        case DataType.PHOTO:
          return this.photoNormalizer.normalizeBatch(rawDataArray, platform);
        case DataType.ALBUM:
          return this.albumNormalizer.normalizeBatch(rawDataArray, platform);
        case DataType.USER_PROFILE:
          return rawDataArray.map(item => this.userProfileNormalizer.normalize(item, platform));
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }
    } else {
      // Transform individual items
      return rawDataArray.map(item => this._transformSingle(item, dataType, platform, options));
    }
  }

  /**
   * Validate input data
   * @param {any} rawData - Raw data to validate
   * @param {string} dataType - Expected data type
   * @param {string} platform - Platform identifier
   * @private
   */
  _validateInput(rawData, dataType, platform) {
    if (!rawData) {
      throw new Error('Raw data is required');
    }

    if (!dataType || !Object.values(DataType).includes(dataType)) {
      throw new Error(`Invalid data type: ${dataType}`);
    }

    if (!platform || !Object.values(Platform).includes(platform)) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    if (Array.isArray(rawData) && rawData.length === 0) {
      this.logger.warn('Empty array provided for transformation', { dataType, platform });
    }
  }

  /**
   * Enrich metadata for transformed data
   * @param {Object|Array} transformedData - Transformed data
   * @param {string} dataType - Data type
   * @param {string} platform - Platform identifier
   * @returns {Object|Array} Enriched data
   * @private
   */
  _enrichMetadata(transformedData, dataType, platform) {
    const enrichment = {
      transformedAt: new Date().toISOString(),
      transformationService: 'DataTransformationService',
      version: '1.0.0'
    };

    if (Array.isArray(transformedData)) {
      return transformedData.map(item => ({
        ...item,
        metadata: {
          ...item.metadata,
          ...enrichment
        }
      }));
    } else {
      return {
        ...transformedData,
        metadata: {
          ...transformedData.metadata,
          ...enrichment
        }
      };
    }
  }

  /**
   * Generate cache key for data
   * @param {any} rawData - Raw data
   * @param {string} dataType - Data type
   * @param {string} platform - Platform identifier
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(rawData, dataType, platform) {
    const dataStr = JSON.stringify(rawData);
    const hash = this._simpleHash(dataStr);
    return `${platform}:${dataType}:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   * @param {string} str - String to hash
   * @returns {number} Hash value
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update processing statistics
   * @param {number} processingTime - Processing time in milliseconds
   * @private
   */
  _updateStats(processingTime) {
    const totalTime = (this.stats.averageProcessingTime * (this.stats.transformations - 1)) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.transformations;
  }
}

// Export singleton instance with default configuration
export const dataTransformationService = new DataTransformationService();

// Export convenience functions
export const transformPhotos = (rawPhotos, platform, options) =>
  dataTransformationService.transformPhotos(rawPhotos, platform, options);

export const transformAlbums = (rawAlbums, platform, options) =>
  dataTransformationService.transformAlbums(rawAlbums, platform, options);

export const transformUserProfiles = (rawProfiles, platform, options) =>
  dataTransformationService.transformUserProfiles(rawProfiles, platform, options);

export const transformApiResponse = (apiResponse, dataType, platform, options) =>
  dataTransformationService.transformApiResponse(apiResponse, dataType, platform, options);

export default DataTransformationService; 