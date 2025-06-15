import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { Platform, ApiError, RateLimitError, AuthenticationError, createNormalizedPhoto, createApiResponse } from '../types.js';
import { createPlatformLogger } from '../utils/index.js';

/**
 * 500px API Adapter
 */
export class FiveHundredPxAdapter extends PhotoApiAdapter {
  constructor(authManager, rateLimiter = null, options = {}) {
    super(Platform.FIVE_HUNDRED_PX, authManager, rateLimiter);
    
    this.options = {
      consumerKey: process.env.FIVE_HUNDRED_PX_CONSUMER_KEY,
      consumerSecret: process.env.FIVE_HUNDRED_PX_CONSUMER_SECRET,
      baseUrl: 'https://api.500px.com/v1',
      ...options
    };

    this.logger = createPlatformLogger('500px');
    
    if (!this.options.consumerKey) {
      throw new ApiError('500px Consumer Key is required');
    }
  }

  /**
   * Fetch photos from 500px
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    const requestParams = {
      consumer_key: this.options.consumerKey,
      feature: params.feature || 'user',
      page: params.page || 1,
      rpp: Math.min(params.pageSize || 20, 100),
      image_size: '1600,2048,4,5',
      include_store: 'store_download',
      include_states: 'voted,favorited,purchased'
    };

    // If authenticated, add user-specific parameters
    if (tokens && tokens.access_token) {
      requestParams.oauth_token = tokens.access_token;
      if (params.userId) {
        requestParams.user_id = params.userId;
      }
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photos from 500px', { params: requestParams });

      const url = `${this.options.baseUrl}/photos`;
      const response = await this._makeRequest(url, requestParams);

      const photos = (response.photos || []).map(photo => 
        this._normalizePhoto(photo)
      );

      return createApiResponse(photos, {
        platform: this.platform,
        totalCount: response.total_items,
        totalPages: response.total_pages,
        currentPage: response.current_page,
        hasNextPage: response.current_page < response.total_pages
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
    const requestParams = {
      consumer_key: this.options.consumerKey,
      image_size: '1600,2048,4,5',
      include_store: 'store_download',
      include_states: 'voted,favorited,purchased'
    };

    if (tokens && tokens.access_token) {
      requestParams.oauth_token = tokens.access_token;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photo from 500px', { photoId });

      const url = `${this.options.baseUrl}/photos/${photoId}`;
      const response = await this._makeRequest(url, requestParams);

      return this._normalizePhoto(response.photo);
    });
  }

  /**
   * Upload a photo to 500px
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('OAuth token required for 500px upload');
    }

    return this._executeWithRetry(async () => {
      this.logger.info('Uploading photo to 500px', { 
        filename: photoData.filename 
      });

      // Step 1: Create photo entry
      const createParams = {
        name: photoData.title || photoData.filename,
        description: photoData.description || '',
        category: photoData.category || 0, // Uncategorized
        privacy: photoData.privacy || 0, // Public
        oauth_token: tokens.access_token
      };

      if (photoData.tags && photoData.tags.length > 0) {
        createParams.tags = photoData.tags.join(',');
      }

      const createUrl = `${this.options.baseUrl}/photos`;
      const createResponse = await this._makeAuthenticatedRequest('POST', createUrl, createParams);

      const photoId = createResponse.photo.id;

      // Step 2: Upload photo file
      const formData = new FormData();
      formData.append('photo_id', photoId);
      formData.append('file', photoData.buffer, photoData.filename);

      const uploadUrl = `${this.options.baseUrl}/photos/${photoId}/upload`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth oauth_token="${tokens.access_token}"`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new ApiError(`Upload failed: ${uploadResponse.statusText}`, uploadResponse.status);
      }

      const uploadResult = await uploadResponse.json();

      return {
        success: true,
        photoId: photoId,
        url: `https://500px.com/photo/${photoId}`,
        platform: this.platform
      };
    });
  }

  /**
   * Delete a photo from 500px
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('OAuth token required for 500px deletion');
    }

    return this._executeWithRetry(async () => {
      this.logger.info('Deleting photo from 500px', { photoId });

      const url = `${this.options.baseUrl}/photos/${photoId}`;
      const response = await this._makeAuthenticatedRequest('DELETE', url, {
        oauth_token: tokens.access_token
      });

      return response.success === true;
    });
  }

  /**
   * Fetch albums (sets) from 500px
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('OAuth token required for 500px albums');
    }

    const requestParams = {
      oauth_token: tokens.access_token,
      page: params.page || 1,
      rpp: Math.min(params.pageSize || 20, 100)
    };

    if (params.userId) {
      requestParams.user_id = params.userId;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching albums from 500px', { params: requestParams });

      const url = `${this.options.baseUrl}/collections`;
      const response = await this._makeRequest(url, requestParams);

      const albums = (response.collections || []).map(collection => ({
        id: collection.id,
        title: collection.title,
        description: collection.description || '',
        coverPhotoUrl: collection.cover_photo?.image_url || '',
        mediaItemsCount: collection.photos_count || 0,
        createdAt: collection.created_at,
        url: `https://500px.com/collections/${collection.id}`,
        platform: this.platform
      }));

      return createApiResponse(albums, {
        platform: this.platform,
        totalCount: response.total_items,
        totalPages: response.total_pages,
        currentPage: response.current_page,
        hasNextPage: response.current_page < response.total_pages
      });
    });
  }

  /**
   * Create a new album (collection)
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('OAuth token required for 500px album creation');
    }

    const createParams = {
      title: albumData.title,
      description: albumData.description || '',
      kind: albumData.kind || 1, // 1 = Collection
      oauth_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.info('Creating album in 500px', { 
        title: albumData.title 
      });

      const url = `${this.options.baseUrl}/collections`;
      const response = await this._makeAuthenticatedRequest('POST', url, createParams);

      return {
        id: response.collection.id,
        title: response.collection.title,
        description: response.collection.description || '',
        coverPhotoUrl: '',
        mediaItemsCount: 0,
        createdAt: response.collection.created_at,
        url: `https://500px.com/collections/${response.collection.id}`,
        platform: this.platform
      };
    });
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('OAuth token required for 500px profile');
    }

    const requestParams = {
      oauth_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching user profile from 500px');

      const url = `${this.options.baseUrl}/users`;
      const response = await this._makeRequest(url, requestParams);

      const user = response.user;
      
      return {
        id: user.id,
        name: user.fullname || user.username,
        email: user.email || '',
        profilePictureUrl: user.userpic_url || '',
        bio: user.about || '',
        website: user.domain || '',
        location: user.city || '',
        platform: this.platform
      };
    });
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    // 500px API doesn't provide quota information directly
    // Return estimated limits based on documentation
    return {
      limit: 100, // Conservative estimate
      remaining: 100, // Cannot determine actual usage
      resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      platform: this.platform
    };
  }

  /**
   * Test connection to 500px
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const requestParams = {
        consumer_key: this.options.consumerKey,
        feature: 'popular',
        rpp: 1
      };

      const url = `${this.options.baseUrl}/photos`;
      await this._makeRequest(url, requestParams);
      
      this.logger.info('500px connection test successful');
      return true;
    } catch (error) {
      this.logger.error('500px connection test failed', { error: error.message });
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

      // Validate token by making a simple request
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
    // 500px uses OAuth 1.0a which doesn't have token refresh
    // Return existing token if available
    const tokens = await this.authManager.getTokens(this.platform);
    if (tokens && tokens.access_token) {
      this.logger.info('500px OAuth 1.0a tokens do not require refresh');
      return tokens.access_token;
    }

    throw new AuthenticationError('No access token available and 500px does not support token refresh');
  }

  /**
   * Make a request to 500px API
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
          `500px rate limit exceeded: ${errorData.error || response.statusText}`,
          3600 // Reset time in seconds
        );
      } else if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(
          `500px authentication failed: ${errorData.error || response.statusText}`
        );
      } else {
        throw new ApiError(
          `500px API error: ${errorData.error || response.statusText}`,
          response.status
        );
      }
    }

    return await response.json();
  }

  /**
   * Make an authenticated request to 500px API
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeAuthenticatedRequest(method, url, params = {}) {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (method === 'GET') {
      const requestUrl = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        requestUrl.searchParams.append(key, value);
      });
      url = requestUrl.toString();
    } else {
      options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        `500px API error: ${errorData.error || response.statusText}`,
        response.status
      );
    }

    return await response.json();
  }

  /**
   * Normalize 500px photo to standard format
   * @param {Object} photo - 500px photo object
   * @returns {Object} Normalized photo object
   * @private
   */
  _normalizePhoto(photo) {
    // Find the best available image sizes
    const images = photo.images || [];
    const highResImage = images.find(img => img.size === 2048) || 
                        images.find(img => img.size === 1600) || 
                        images[0];
    
    const thumbnailImage = images.find(img => img.size === 4) || 
                          images.find(img => img.size === 5) || 
                          images[0];

    return createNormalizedPhoto({
      id: photo.id.toString(),
      title: photo.name || '',
      description: photo.description || '',
      url: photo.image_url || highResImage?.url,
      downloadUrl: highResImage?.url || photo.image_url,
      thumbnailUrl: thumbnailImage?.url || photo.image_url,
      size: {
        width: photo.width || 0,
        height: photo.height || 0,
        bytes: 0 // 500px doesn't provide file size
      },
      format: photo.image_format || 'jpeg',
      createdAt: photo.created_at,
      location: photo.latitude && photo.longitude ? {
        latitude: photo.latitude,
        longitude: photo.longitude,
        address: photo.location || null
      } : null,
      metadata: {
        rating: photo.rating,
        votes_count: photo.votes_count,
        favorites_count: photo.favorites_count,
        comments_count: photo.comments_count,
        views_count: photo.times_viewed,
        category: photo.category,
        tags: photo.tags || [],
        lens: photo.lens,
        camera: photo.camera,
        iso: photo.iso,
        shutter_speed: photo.shutter_speed,
        focal_length: photo.focal_length,
        aperture: photo.aperture
      },
      platform: this.platform,
      originalData: photo
    });
  }

  /**
   * Handle API errors
   * @param {Error} error - Original error
   * @returns {Error} Processed error
   * @private
   */
  _handleApiError(error) {
    if (error.status === 401 || error.status === 403) {
      return new AuthenticationError(`500px authentication failed: ${error.message}`);
    } else if (error.status === 429) {
      return new RateLimitError(`500px rate limit exceeded: ${error.message}`, 3600);
    } else {
      return new ApiError(`500px API error: ${error.message}`, error.status || 500);
    }
  }
} 