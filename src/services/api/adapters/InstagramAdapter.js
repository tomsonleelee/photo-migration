import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { Platform, ApiError, RateLimitError, AuthenticationError, createNormalizedPhoto, createApiResponse } from '../types.js';
import { createPlatformLogger } from '../utils/index.js';

/**
 * Instagram Basic Display API Adapter
 */
export class InstagramAdapter extends PhotoApiAdapter {
  constructor(authManager, rateLimiter = null, options = {}) {
    super(Platform.INSTAGRAM, authManager, rateLimiter);
    
    this.options = {
      appId: process.env.INSTAGRAM_APP_ID,
      appSecret: process.env.INSTAGRAM_APP_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
      baseUrl: 'https://graph.instagram.com',
      scope: 'user_profile,user_media',
      ...options
    };

    this.logger = createPlatformLogger('Instagram');
    
    if (!this.options.appId) {
      throw new ApiError('Instagram App ID is required');
    }
  }

  /**
   * Fetch photos from Instagram
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Instagram API');
    }

    const requestParams = {
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
      limit: Math.min(params.pageSize || 25, 25), // Instagram limit is 25
      access_token: tokens.access_token
    };

    if (params.after) {
      requestParams.after = params.after;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photos from Instagram', { params: requestParams });

      const url = `${this.options.baseUrl}/me/media`;
      const response = await this._makeRequest(url, requestParams);

      const photos = (response.data || [])
        .filter(item => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
        .map(item => this._normalizePhoto(item));

      return createApiResponse(photos, {
        platform: this.platform,
        totalCount: photos.length,
        nextCursor: response.paging?.cursors?.after,
        hasNextPage: !!response.paging?.next
      });
    });
  }

  /**
   * Fetch a specific photo by ID
   * @param {string} photoId - Photo ID
   * @returns {Promise<Object>} Normalized photo object
   */
  async fetchPhoto(photoId) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Instagram API');
    }

    const requestParams = {
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type}',
      access_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photo from Instagram', { photoId });

      const url = `${this.options.baseUrl}/${photoId}`;
      const response = await this._makeRequest(url, requestParams);

      return this._normalizePhoto(response);
    });
  }

  /**
   * Upload a photo to Instagram
   * Note: Instagram Basic Display API is read-only, upload not supported
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    this.logger.warn('Instagram Basic Display API does not support photo upload');
    throw new ApiError('Instagram Basic Display API does not support photo upload', 501);
  }

  /**
   * Delete a photo from Instagram
   * Note: Instagram Basic Display API is read-only, deletion not supported
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    this.logger.warn('Instagram Basic Display API does not support photo deletion', { photoId });
    throw new ApiError('Instagram Basic Display API does not support photo deletion', 501);
  }

  /**
   * Fetch albums from Instagram
   * Note: Instagram doesn't have traditional albums, returns carousel posts
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with carousel albums
   */
  async fetchAlbums(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Instagram API');
    }

    const requestParams = {
      fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,children{media_url,media_type}',
      limit: Math.min(params.pageSize || 25, 25),
      access_token: tokens.access_token
    };

    if (params.after) {
      requestParams.after = params.after;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching carousel albums from Instagram', { params: requestParams });

      const url = `${this.options.baseUrl}/me/media`;
      const response = await this._makeRequest(url, requestParams);

      // Filter for carousel albums only
      const albums = (response.data || [])
        .filter(item => item.media_type === 'CAROUSEL_ALBUM')
        .map(album => ({
          id: album.id,
          title: album.caption ? album.caption.substring(0, 50) + '...' : 'Carousel Album',
          description: album.caption || '',
          coverPhotoUrl: album.media_url,
          mediaItemsCount: album.children?.data?.length || 0,
          createdAt: album.timestamp,
          url: album.permalink,
          platform: this.platform
        }));

      return createApiResponse(albums, {
        platform: this.platform,
        totalCount: albums.length,
        nextCursor: response.paging?.cursors?.after,
        hasNextPage: !!response.paging?.next
      });
    });
  }

  /**
   * Create a new album
   * Note: Instagram Basic Display API is read-only, album creation not supported
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    this.logger.warn('Instagram Basic Display API does not support album creation');
    throw new ApiError('Instagram Basic Display API does not support album creation', 501);
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Instagram API');
    }

    const requestParams = {
      fields: 'id,username,account_type,media_count',
      access_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching user profile from Instagram');

      const url = `${this.options.baseUrl}/me`;
      const response = await this._makeRequest(url, requestParams);

      return {
        id: response.id,
        name: response.username,
        email: '',
        profilePictureUrl: '',
        accountType: response.account_type,
        mediaCount: response.media_count,
        platform: this.platform
      };
    });
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    // Instagram Basic Display API has rate limits but doesn't provide usage info
    // Return estimated limits based on documentation
    return {
      limit: 200, // 200 requests per hour per user
      remaining: 200, // Cannot determine actual usage
      resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      platform: this.platform
    };
  }

  /**
   * Test connection to Instagram
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.getUserProfile();
      this.logger.info('Instagram connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Instagram connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Check if the adapter is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    try {
      const tokens = await this.authManager.getTokens(this.platform);
      if (!tokens || !tokens.access_token) {
        return false;
      }

      // Check if token is still valid by making a simple request
      await this.getUserProfile();
      return true;
    } catch (error) {
      this.logger.error('Authentication check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Refresh the authentication token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('No access token available for refresh');
    }

    const requestParams = {
      grant_type: 'ig_refresh_token',
      access_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.info('Refreshing Instagram token');

      const url = `${this.options.baseUrl}/refresh_access_token`;
      const response = await this._makeRequest(url, requestParams);

      // Update stored tokens
      const newTokens = {
        access_token: response.access_token,
        token_type: response.token_type || 'bearer',
        expires_in: response.expires_in
      };

      await this.authManager.setTokens(this.platform, newTokens);

      this.logger.info('Instagram token refreshed successfully');
      return response.access_token;
    });
  }

  /**
   * Make a request to Instagram API
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeRequest(url, params = {}) {
    const requestUrl = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      requestUrl.searchParams.append(key, value);
    });

    const response = await fetch(requestUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new RateLimitError(
          `Instagram rate limit exceeded: ${errorData.error?.message || response.statusText}`,
          3600 // Reset time in seconds
        );
      } else if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(
          `Instagram authentication failed: ${errorData.error?.message || response.statusText}`
        );
      } else {
        throw new ApiError(
          `Instagram API error: ${errorData.error?.message || response.statusText}`,
          response.status
        );
      }
    }

    return await response.json();
  }

  /**
   * Normalize Instagram media item to standard format
   * @param {Object} item - Instagram media item
   * @returns {Object} Normalized photo object
   * @private
   */
  _normalizePhoto(item) {
    return createNormalizedPhoto({
      id: item.id,
      title: item.caption ? item.caption.substring(0, 100) + '...' : '',
      description: item.caption || '',
      url: item.media_url,
      downloadUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url || item.media_url,
      size: {
        width: 0, // Instagram doesn't provide dimensions in Basic Display API
        height: 0,
        bytes: 0
      },
      format: this._getFormatFromUrl(item.media_url),
      createdAt: item.timestamp,
      location: null, // Instagram Basic Display API doesn't provide location
      metadata: {
        mediaType: item.media_type,
        username: item.username,
        permalink: item.permalink,
        children: item.children?.data || []
      },
      platform: this.platform,
      originalData: item
    });
  }

  /**
   * Extract format from media URL
   * @param {string} url - Media URL
   * @returns {string} File format
   * @private
   */
  _getFormatFromUrl(url) {
    if (!url) return 'unknown';
    
    const urlParts = url.split('.');
    const extension = urlParts[urlParts.length - 1];
    
    // Common Instagram formats
    if (extension.includes('jpg') || extension.includes('jpeg')) return 'image/jpeg';
    if (extension.includes('png')) return 'image/png';
    if (extension.includes('mp4')) return 'video/mp4';
    
    return 'image/jpeg'; // Default for Instagram
  }

  /**
   * Handle API errors
   * @param {Error} error - Original error
   * @returns {Error} Processed error
   * @private
   */
  _handleApiError(error) {
    if (error.code === 190 || error.code === 102) {
      return new AuthenticationError(`Instagram authentication failed: ${error.message}`);
    } else if (error.code === 4 || error.code === 17) {
      return new RateLimitError(`Instagram rate limit exceeded: ${error.message}`, 3600);
    } else {
      return new ApiError(`Instagram API error: ${error.message}`, error.code || 500);
    }
  }
} 