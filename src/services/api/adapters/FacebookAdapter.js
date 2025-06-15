import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { Platform, ApiError, RateLimitError, AuthenticationError, createNormalizedPhoto, createApiResponse } from '../types.js';
import { createPlatformLogger } from '../utils/index.js';

/**
 * Facebook Graph API Adapter
 */
export class FacebookAdapter extends PhotoApiAdapter {
  constructor(authManager, rateLimiter = null, options = {}) {
    super(Platform.FACEBOOK, authManager, rateLimiter);
    
    this.options = {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI,
      baseUrl: 'https://graph.facebook.com/v18.0',
      scope: 'user_photos',
      ...options
    };

    this.logger = createPlatformLogger('Facebook');
    
    if (!this.options.appId) {
      throw new ApiError('Facebook App ID is required');
    }
  }

  /**
   * Fetch photos from Facebook
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Facebook API');
    }

    const requestParams = {
      fields: 'id,name,picture,source,created_time,updated_time,link,place,tags,album{id,name}',
      limit: Math.min(params.pageSize || 25, 100),
      access_token: tokens.access_token
    };

    if (params.after) {
      requestParams.after = params.after;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photos from Facebook', { params: requestParams });

      const url = `${this.options.baseUrl}/me/photos/uploaded`;
      const response = await this._makeRequest(url, requestParams);

      const photos = (response.data || []).map(photo => 
        this._normalizePhoto(photo)
      );

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
      throw new AuthenticationError('Access token required for Facebook API');
    }

    const requestParams = {
      fields: 'id,name,picture,source,created_time,updated_time,link,place,tags,album{id,name},images',
      access_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photo from Facebook', { photoId });

      const url = `${this.options.baseUrl}/${photoId}`;
      const response = await this._makeRequest(url, requestParams);

      return this._normalizePhoto(response);
    });
  }

  /**
   * Upload a photo to Facebook
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Facebook API');
    }

    return this._executeWithRetry(async () => {
      this.logger.info('Uploading photo to Facebook', { 
        filename: photoData.filename 
      });

      const formData = new FormData();
      formData.append('source', photoData.buffer, photoData.filename);
      formData.append('message', photoData.caption || '');
      formData.append('published', photoData.published !== false ? 'true' : 'false');
      formData.append('access_token', tokens.access_token);

      if (photoData.albumId) {
        formData.append('album_id', photoData.albumId);
      }

      const uploadUrl = photoData.albumId 
        ? `${this.options.baseUrl}/${photoData.albumId}/photos`
        : `${this.options.baseUrl}/me/photos`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          `Upload failed: ${errorData.error?.message || response.statusText}`,
          response.status
        );
      }

      const result = await response.json();

      return {
        success: true,
        photoId: result.id,
        url: `https://www.facebook.com/photo.php?fbid=${result.id}`,
        platform: this.platform
      };
    });
  }

  /**
   * Delete a photo from Facebook
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Facebook API');
    }

    return this._executeWithRetry(async () => {
      this.logger.info('Deleting photo from Facebook', { photoId });

      const url = `${this.options.baseUrl}/${photoId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: tokens.access_token
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          `Delete failed: ${errorData.error?.message || response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      return result.success === true;
    });
  }

  /**
   * Fetch albums from Facebook
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params = {}) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Facebook API');
    }

    const requestParams = {
      fields: 'id,name,description,cover_photo{id,picture},count,created_time,updated_time,link',
      limit: Math.min(params.pageSize || 25, 100),
      access_token: tokens.access_token
    };

    if (params.after) {
      requestParams.after = params.after;
    }

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching albums from Facebook', { params: requestParams });

      const url = `${this.options.baseUrl}/me/albums`;
      const response = await this._makeRequest(url, requestParams);

      const albums = (response.data || []).map(album => ({
        id: album.id,
        title: album.name,
        description: album.description || '',
        coverPhotoUrl: album.cover_photo?.picture || '',
        mediaItemsCount: album.count || 0,
        createdAt: album.created_time,
        url: album.link,
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
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('Access token required for Facebook API');
    }

    return this._executeWithRetry(async () => {
      this.logger.info('Creating album in Facebook', { 
        title: albumData.title 
      });

      const formData = new FormData();
      formData.append('name', albumData.title);
      formData.append('message', albumData.description || '');
      formData.append('privacy', JSON.stringify(albumData.privacy || { value: 'SELF' }));
      formData.append('access_token', tokens.access_token);

      const response = await fetch(`${this.options.baseUrl}/me/albums`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          `Album creation failed: ${errorData.error?.message || response.statusText}`,
          response.status
        );
      }

      const result = await response.json();

      return {
        id: result.id,
        title: albumData.title,
        description: albumData.description || '',
        coverPhotoUrl: '',
        mediaItemsCount: 0,
        createdAt: new Date().toISOString(),
        url: `https://www.facebook.com/media/set/?set=a.${result.id}`,
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
      throw new AuthenticationError('Access token required for Facebook API');
    }

    const requestParams = {
      fields: 'id,name,email,picture{url}',
      access_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching user profile from Facebook');

      const url = `${this.options.baseUrl}/me`;
      const response = await this._makeRequest(url, requestParams);

      return {
        id: response.id,
        name: response.name,
        email: response.email || '',
        profilePictureUrl: response.picture?.data?.url || '',
        platform: this.platform
      };
    });
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    // Facebook API doesn't provide quota information directly
    // Return estimated limits based on documentation
    return {
      limit: 200, // 200 requests per hour per user
      remaining: 200, // Cannot determine actual usage
      resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      platform: this.platform
    };
  }

  /**
   * Test connection to Facebook
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.getUserProfile();
      this.logger.info('Facebook connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Facebook connection test failed', { error: error.message });
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
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.access_token) {
      throw new AuthenticationError('No access token available for refresh');
    }

    const requestParams = {
      grant_type: 'fb_exchange_token',
      client_id: this.options.appId,
      client_secret: this.options.appSecret,
      fb_exchange_token: tokens.access_token
    };

    return this._executeWithRetry(async () => {
      this.logger.info('Refreshing Facebook token');

      const url = `${this.options.baseUrl}/oauth/access_token`;
      const response = await this._makeRequest(url, requestParams);

      // Update stored tokens
      const newTokens = {
        access_token: response.access_token,
        token_type: 'bearer',
        expires_in: response.expires_in
      };

      await this.authManager.setTokens(this.platform, newTokens);

      this.logger.info('Facebook token refreshed successfully');
      return response.access_token;
    });
  }

  /**
   * Make a request to Facebook API
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
          `Facebook rate limit exceeded: ${errorData.error?.message || response.statusText}`,
          3600 // Reset time in seconds
        );
      } else if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(
          `Facebook authentication failed: ${errorData.error?.message || response.statusText}`
        );
      } else {
        throw new ApiError(
          `Facebook API error: ${errorData.error?.message || response.statusText}`,
          response.status
        );
      }
    }

    return await response.json();
  }

  /**
   * Normalize Facebook photo to standard format
   * @param {Object} photo - Facebook photo object
   * @returns {Object} Normalized photo object
   * @private
   */
  _normalizePhoto(photo) {
    // Find the highest resolution image
    const images = photo.images || [];
    const highResImage = images.reduce((max, img) => 
      (img.width * img.height) > (max.width * max.height) ? img : max, 
      images[0] || {}
    );

    // Find thumbnail (smallest image)
    const thumbnail = images.reduce((min, img) => 
      (img.width * img.height) < (min.width * min.height) ? img : min, 
      images[0] || {}
    );

    return createNormalizedPhoto({
      id: photo.id,
      title: photo.name || '',
      description: photo.name || '',
      url: photo.source || highResImage.source || photo.picture,
      downloadUrl: photo.source || highResImage.source,
      thumbnailUrl: thumbnail.source || photo.picture,
      size: {
        width: highResImage.width || 0,
        height: highResImage.height || 0,
        bytes: 0 // Facebook doesn't provide file size
      },
      format: 'image/jpeg', // Facebook typically serves JPEG
      createdAt: photo.created_time,
      location: photo.place ? {
        latitude: photo.place.location?.latitude || null,
        longitude: photo.place.location?.longitude || null,
        address: photo.place.name || null
      } : null,
      metadata: {
        link: photo.link,
        albumId: photo.album?.id,
        albumName: photo.album?.name,
        tags: photo.tags?.data || [],
        updatedTime: photo.updated_time
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
    if (error.code === 190 || error.code === 102) {
      return new AuthenticationError(`Facebook authentication failed: ${error.message}`);
    } else if (error.code === 4 || error.code === 17 || error.code === 613) {
      return new RateLimitError(`Facebook rate limit exceeded: ${error.message}`, 3600);
    } else {
      return new ApiError(`Facebook API error: ${error.message}`, error.code || 500);
    }
  }
} 