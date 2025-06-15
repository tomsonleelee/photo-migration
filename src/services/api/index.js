/**
 * API Integration Layer - Main Entry Point
 * 
 * This module provides a unified interface for interacting with multiple photo platforms.
 * It includes adapters, repositories, factories, and services for handling OAuth authentication
 * and photo operations across different APIs.
 */

// Core types and utilities
export {
  Platform,
  ApiError,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  createNormalizedPhoto,
  createFetchParams,
  createUploadResult,
  createMigrationProgress,
  createApiResponse
} from './types.js';

// Main service
export { PhotoApiService } from './PhotoApiService.js';

// Repositories
export { 
  PhotoRepository, 
  MultiPlatformPhotoRepository 
} from './repositories/PhotoRepository.js';

// Factories
export { ApiAdapterFactory } from './factories/ApiAdapterFactory.js';

// Base adapter interface
export { PhotoApiAdapter } from './interfaces/PhotoApiAdapter.js';

// Export default service instance
import photoApiService from './PhotoApiService.js';
export default photoApiService;

/**
 * Quick start helper function
 * Initialize the API service with authentication manager
 * 
 * @param {Object} authManager - Authentication manager instance
 * @param {Object} options - Service options
 * @returns {PhotoApiService} Configured service instance
 */
export function initializeApiService(authManager, options = {}) {
  photoApiService.setAuthManager(authManager);
  return photoApiService;
}

/**
 * Create a platform repository helper
 * 
 * @param {string} platform - Platform identifier
 * @param {Object} authManager - Authentication manager instance
 * @param {Object} options - Repository options
 * @returns {PhotoRepository} Platform repository
 */
export function createPlatformRepository(platform, authManager, options = {}) {
  const service = new PhotoApiService(options);
  service.setAuthManager(authManager);
  return service.initializePlatform(platform, options);
}

/**
 * Create a multi-platform repository helper
 * 
 * @param {string[]} platforms - Array of platform identifiers
 * @param {Object} authManager - Authentication manager instance
 * @param {Object} options - Repository options
 * @returns {MultiPlatformPhotoRepository} Multi-platform repository
 */
export function createMultiPlatformRepository(platforms, authManager, options = {}) {
  const service = new PhotoApiService(options);
  service.setAuthManager(authManager);
  return service.initializeMultiplePlatforms(platforms, options);
}

/**
 * API Integration Layer Constants
 */
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  DEFAULT_RATE_LIMIT: {
    minTime: 100,
    maxConcurrent: 5,
    reservoir: 100,
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 60 * 1000
  },
  SUPPORTED_PLATFORMS: Object.values(Platform)
};

/**
 * Utility functions for working with the API layer
 */
export const ApiUtils = {
  /**
   * Check if a platform is supported
   * @param {string} platform - Platform identifier
   * @returns {boolean} Support status
   */
  isPlatformSupported(platform) {
    return API_CONSTANTS.SUPPORTED_PLATFORMS.includes(platform);
  },

  /**
   * Get all supported platforms
   * @returns {string[]} Array of supported platforms
   */
  getSupportedPlatforms() {
    return [...API_CONSTANTS.SUPPORTED_PLATFORMS];
  },

  /**
   * Validate fetch parameters
   * @param {Object} params - Parameters to validate
   * @returns {Object} Validated parameters
   */
  validateFetchParams(params) {
    return createFetchParams(params);
  },

  /**
   * Create a standardized error response
   * @param {Error} error - Original error
   * @param {string} platform - Platform where error occurred
   * @returns {Object} Standardized error response
   */
  createErrorResponse(error, platform = 'unknown') {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.statusCode || 500,
        platform,
        timestamp: new Date().toISOString()
      }
    };
  },

  /**
   * Create a standardized success response
   * @param {any} data - Response data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Standardized success response
   */
  createSuccessResponse(data, metadata = {}) {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }
}; 