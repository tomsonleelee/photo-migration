/**
 * Photo API Adapter Interface
 * 
 * This interface defines the common methods that all platform adapters must implement.
 * It provides a unified way to interact with different photo APIs.
 */

export class PhotoApiAdapter {
  constructor(platform, authManager, rateLimiter = null) {
    if (new.target === PhotoApiAdapter) {
      throw new Error('PhotoApiAdapter is an abstract class and cannot be instantiated directly');
    }
    
    this.platform = platform;
    this.authManager = authManager;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch photos from the platform
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with normalized photos
   */
  async fetchPhotos(params) {
    throw new Error('fetchPhotos method must be implemented');
  }

  /**
   * Fetch a specific photo by ID
   * @param {string} photoId - Photo ID
   * @returns {Promise<Object>} Normalized photo object
   */
  async fetchPhoto(photoId) {
    throw new Error('fetchPhoto method must be implemented');
  }

  /**
   * Upload a photo to the platform
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    throw new Error('uploadPhoto method must be implemented');
  }

  /**
   * Delete a photo from the platform
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    throw new Error('deletePhoto method must be implemented');
  }

  /**
   * Fetch albums from the platform
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params) {
    throw new Error('fetchAlbums method must be implemented');
  }

  /**
   * Create a new album
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    throw new Error('createAlbum method must be implemented');
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    throw new Error('getUserProfile method must be implemented');
  }

  /**
   * Get platform-specific API limits and usage
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    throw new Error('getApiLimits method must be implemented');
  }

  /**
   * Test connection to the platform
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.getUserProfile();
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${this.platform}:`, error);
      return false;
    }
  }

  /**
   * Get the current authentication status
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    return this.authManager ? await this.authManager.isAuthenticated(this.platform) : false;
  }

  /**
   * Refresh the authentication token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    if (!this.authManager) {
      throw new Error('AuthManager not available for token refresh');
    }
    return await this.authManager.refreshToken(this.platform);
  }

  /**
   * Execute an API call with rate limiting and error handling
   * @param {Function} apiCall - API call function
   * @param {number} retries - Number of retries
   * @returns {Promise<any>} API call result
   */
  async executeWithRetry(apiCall, retries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Apply rate limiting if configured
        if (this.rateLimiter) {
          return await this.rateLimiter.schedule(apiCall);
        } else {
          return await apiCall();
        }
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.name === 'AuthenticationError') {
          throw error;
        }
        
        // Handle rate limiting
        if (error.name === 'RateLimitError' && attempt < retries) {
          const delay = error.retryAfter * 1000 || (attempt + 1) * 1000;
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Exponential backoff for other errors
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Log API activity for monitoring
   * @param {string} operation - Operation name
   * @param {Object} metadata - Additional metadata
   */
  logActivity(operation, metadata = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      platform: this.platform,
      operation,
      ...metadata
    };
    
    // In production, this would send to a logging service
    console.log('[API Activity]', logData);
  }
} 