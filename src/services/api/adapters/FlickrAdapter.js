import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { Platform, ApiError, RateLimitError, AuthenticationError, createNormalizedPhoto, createApiResponse } from '../types.js';
import { createPlatformLogger } from '../utils/index.js';

/**
 * Flickr API Adapter
 */
export class FlickrAdapter extends PhotoApiAdapter {
  constructor(authManager, rateLimiter = null, options = {}) {
    super(Platform.FLICKR, authManager, rateLimiter);
    
    this.options = {
      apiKey: process.env.FLICKR_API_KEY,
      apiSecret: process.env.FLICKR_API_SECRET,
      baseUrl: 'https://api.flickr.com/services/rest',
      uploadUrl: 'https://up.flickr.com/services/upload/',
      ...options
    };

    this.logger = createPlatformLogger('Flickr');
    
    if (!this.options.apiKey) {
      throw new ApiError('Flickr API key is required');
    }
  }

  /**
   * Fetch photos from Flickr
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}) {
    const requestParams = {
      method: 'flickr.people.getPhotos',
      api_key: this.options.apiKey,
      user_id: params.userId || 'me',
      extras: 'description,date_upload,date_taken,owner_name,icon_server,original_format,last_update,geo,tags,machine_tags,o_dims,views,media,path_alias,url_sq,url_t,url_s,url_q,url_m,url_n,url_z,url_c,url_l,url_o',
      format: 'json',
      nojsoncallback: 1,
      per_page: Math.min(params.pageSize || 50, 500),
      page: params.page || 1,
      sort: params.sort || 'date-posted-desc'
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photos from Flickr', { params: requestParams });

      const response = await this._makeRequest(requestParams);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      const photos = (response.photos.photo || []).map(photo => 
        this._normalizePhoto(photo)
      );

      return createApiResponse(photos, {
        platform: this.platform,
        totalCount: response.photos.total,
        page: response.photos.page,
        perPage: response.photos.perpage,
        pages: response.photos.pages,
        hasNextPage: response.photos.page < response.photos.pages
      });
    });
  }

  /**
   * Fetch a specific photo by ID
   * @param {string} photoId - Photo ID
   * @returns {Promise<Object>} Normalized photo object
   */
  async fetchPhoto(photoId) {
    const requestParams = {
      method: 'flickr.photos.getInfo',
      api_key: this.options.apiKey,
      photo_id: photoId,
      format: 'json',
      nojsoncallback: 1
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photo from Flickr', { photoId });

      const response = await this._makeRequest(requestParams);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      // Get sizes information
      const sizesParams = {
        method: 'flickr.photos.getSizes',
        api_key: this.options.apiKey,
        photo_id: photoId,
        format: 'json',
        nojsoncallback: 1
      };

      const sizesResponse = await this._makeRequest(sizesParams);
      const sizes = sizesResponse.sizes?.size || [];

      return this._normalizePhoto(response.photo, sizes);
    });
  }

  /**
   * Upload a photo to Flickr
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    return this._executeWithRetry(async () => {
      this.logger.info('Uploading photo to Flickr', { 
        filename: photoData.filename 
      });

      const tokens = await this.authManager.getTokens(this.platform);
      if (!tokens || !tokens.oauth_token) {
        throw new AuthenticationError('OAuth token required for upload');
      }

      const formData = new FormData();
      formData.append('photo', photoData.buffer, photoData.filename);
      formData.append('title', photoData.title || '');
      formData.append('description', photoData.description || '');
      formData.append('tags', (photoData.tags || []).join(' '));
      formData.append('is_public', photoData.isPublic ? '1' : '0');
      formData.append('is_friend', photoData.isFriend ? '1' : '0');
      formData.append('is_family', photoData.isFamily ? '1' : '0');

      // Add OAuth parameters
      const oauthParams = this._generateOAuthParams('POST', this.options.uploadUrl, tokens);
      Object.entries(oauthParams).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(this.options.uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new ApiError(`Upload failed: ${response.statusText}`, response.status);
      }

      const responseText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, 'text/xml');

      const rsp = xmlDoc.getElementsByTagName('rsp')[0];
      if (rsp.getAttribute('stat') !== 'ok') {
        const err = xmlDoc.getElementsByTagName('err')[0];
        throw new ApiError(`Upload failed: ${err.getAttribute('msg')}`, err.getAttribute('code'));
      }

      const photoId = xmlDoc.getElementsByTagName('photoid')[0].textContent;

      return {
        success: true,
        photoId: photoId,
        url: `https://www.flickr.com/photos/${tokens.user_nsid || 'user'}/${photoId}`,
        platform: this.platform
      };
    });
  }

  /**
   * Delete a photo from Flickr
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.oauth_token) {
      throw new AuthenticationError('OAuth token required for deletion');
    }

    const requestParams = {
      method: 'flickr.photos.delete',
      photo_id: photoId,
      format: 'json',
      nojsoncallback: 1
    };

    return this._executeWithRetry(async () => {
      this.logger.info('Deleting photo from Flickr', { photoId });

      const response = await this._makeAuthenticatedRequest(requestParams, tokens);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      return true;
    });
  }

  /**
   * Fetch albums (photosets) from Flickr
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params = {}) {
    const requestParams = {
      method: 'flickr.photosets.getList',
      api_key: this.options.apiKey,
      user_id: params.userId || 'me',
      format: 'json',
      nojsoncallback: 1,
      per_page: Math.min(params.pageSize || 50, 500),
      page: params.page || 1
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching albums from Flickr', { params: requestParams });

      const response = await this._makeRequest(requestParams);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      const albums = (response.photosets.photoset || []).map(photoset => ({
        id: photoset.id,
        title: photoset.title._content,
        description: photoset.description._content || '',
        coverPhotoUrl: this._buildPhotoUrl(photoset, 'url_m'),
        mediaItemsCount: parseInt(photoset.photos) || 0,
        createdAt: new Date(parseInt(photoset.date_create) * 1000).toISOString(),
        url: `https://www.flickr.com/photos/${photoset.owner}/${photoset.id}/`,
        platform: this.platform
      }));

      return createApiResponse(albums, {
        platform: this.platform,
        totalCount: response.photosets.total,
        page: response.photosets.page,
        perPage: response.photosets.perpage,
        pages: response.photosets.pages,
        hasNextPage: response.photosets.page < response.photosets.pages
      });
    });
  }

  /**
   * Create a new album (photoset)
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    const tokens = await this.authManager.getTokens(this.platform);
    if (!tokens || !tokens.oauth_token) {
      throw new AuthenticationError('OAuth token required for album creation');
    }

    if (!albumData.primaryPhotoId) {
      throw new ApiError('Primary photo ID is required to create a Flickr photoset');
    }

    const requestParams = {
      method: 'flickr.photosets.create',
      title: albumData.title,
      description: albumData.description || '',
      primary_photo_id: albumData.primaryPhotoId,
      format: 'json',
      nojsoncallback: 1
    };

    return this._executeWithRetry(async () => {
      this.logger.info('Creating album in Flickr', { 
        title: albumData.title 
      });

      const response = await this._makeAuthenticatedRequest(requestParams, tokens);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      return {
        id: response.photoset.id,
        title: albumData.title,
        description: albumData.description || '',
        coverPhotoUrl: '',
        mediaItemsCount: 1, // Primary photo
        createdAt: new Date().toISOString(),
        url: response.photoset.url,
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
    const userId = tokens?.user_nsid || 'me';

    const requestParams = {
      method: 'flickr.people.getInfo',
      api_key: this.options.apiKey,
      user_id: userId,
      format: 'json',
      nojsoncallback: 1
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching user profile from Flickr');

      const response = await this._makeRequest(requestParams);
      
      if (response.stat !== 'ok') {
        throw new ApiError(`Flickr API error: ${response.message}`, response.code);
      }

      const person = response.person;
      
      return {
        id: person.nsid,
        name: person.realname?._content || person.username?._content || 'Flickr User',
        email: '',
        profilePictureUrl: this._buildBuddyIconUrl(person),
        platform: this.platform
      };
    });
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    // Flickr API doesn't provide quota information directly
    // Return estimated limits based on documentation
    return {
      limit: 3600, // 3,600 requests per hour
      remaining: 3600, // Cannot determine actual usage
      resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      platform: this.platform
    };
  }

  /**
   * Test connection to Flickr
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const requestParams = {
        method: 'flickr.test.echo',
        api_key: this.options.apiKey,
        format: 'json',
        nojsoncallback: 1
      };

      await this._makeRequest(requestParams);
      this.logger.info('Flickr connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Flickr connection test failed', { error: error.message });
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
      return !!(tokens && tokens.oauth_token);
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
    // Flickr OAuth 1.0a tokens don't expire, so no refresh needed
    this.logger.info('Flickr OAuth tokens do not require refresh');
    const tokens = await this.authManager.getTokens(this.platform);
    return tokens?.oauth_token || null;
  }

  /**
   * Make a request to Flickr API
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeRequest(params) {
    const url = new URL(this.options.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    return await response.json();
  }

  /**
   * Make an authenticated request to Flickr API
   * @param {Object} params - Request parameters
   * @param {Object} tokens - OAuth tokens
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeAuthenticatedRequest(params, tokens) {
    const oauthParams = this._generateOAuthParams('GET', this.options.baseUrl, tokens);
    const allParams = { ...params, ...oauthParams };

    return this._makeRequest(allParams);
  }

  /**
   * Generate OAuth parameters for request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} tokens - OAuth tokens
   * @returns {Object} OAuth parameters
   * @private
   */
  _generateOAuthParams(method, url, tokens) {
    // This is a simplified OAuth 1.0a implementation
    // In production, use a proper OAuth library
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);

    const params = {
      oauth_consumer_key: this.options.apiKey,
      oauth_token: tokens.oauth_token,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0'
    };

    // Generate signature (simplified)
    const signature = this._generateOAuthSignature(method, url, params, tokens);
    params.oauth_signature = signature;

    return params;
  }

  /**
   * Generate OAuth signature
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - OAuth parameters
   * @param {Object} tokens - OAuth tokens
   * @returns {string} OAuth signature
   * @private
   */
  _generateOAuthSignature(method, url, params, tokens) {
    // This is a placeholder implementation
    // In production, implement proper OAuth 1.0a signature generation
    // or use a library like oauth-1.0a
    return 'placeholder_signature';
  }

  /**
   * Build photo URL from photo object
   * @param {Object} photo - Photo object
   * @param {string} sizeKey - Size key (url_s, url_m, etc.)
   * @returns {string} Photo URL
   * @private
   */
  _buildPhotoUrl(photo, sizeKey = 'url_m') {
    if (photo[sizeKey]) {
      return photo[sizeKey];
    }

    // Fallback to constructing URL manually
    const farm = photo.farm;
    const server = photo.server;
    const id = photo.id;
    const secret = photo.secret;
    
    return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_m.jpg`;
  }

  /**
   * Build buddy icon URL
   * @param {Object} person - Person object
   * @returns {string} Buddy icon URL
   * @private
   */
  _buildBuddyIconUrl(person) {
    if (person.iconserver && person.iconserver !== '0') {
      return `https://farm${person.iconfarm}.staticflickr.com/${person.iconserver}/buddyicons/${person.nsid}.jpg`;
    }
    return 'https://www.flickr.com/images/buddyicon.gif';
  }

  /**
   * Normalize Flickr photo to standard format
   * @param {Object} photo - Flickr photo object
   * @param {Array} sizes - Photo sizes array
   * @returns {Object} Normalized photo object
   * @private
   */
  _normalizePhoto(photo, sizes = []) {
    // Find different size URLs
    const originalSize = sizes.find(s => s.label === 'Original');
    const largeSize = sizes.find(s => s.label === 'Large');
    const mediumSize = sizes.find(s => s.label === 'Medium');
    const thumbnailSize = sizes.find(s => s.label === 'Thumbnail');

    return createNormalizedPhoto({
      id: photo.id,
      title: photo.title?._content || photo.title || '',
      description: photo.description?._content || photo.description || '',
      url: this._buildPhotoUrl(photo, 'url_l') || largeSize?.source,
      downloadUrl: originalSize?.source || this._buildPhotoUrl(photo, 'url_o'),
      thumbnailUrl: this._buildPhotoUrl(photo, 'url_t') || thumbnailSize?.source,
      size: {
        width: parseInt(photo.width || originalSize?.width) || 0,
        height: parseInt(photo.height || originalSize?.height) || 0,
        bytes: 0 // Not provided by Flickr API
      },
      format: photo.originalformat || 'jpg',
      createdAt: photo.datetaken || new Date(parseInt(photo.dateupload || 0) * 1000).toISOString(),
      location: photo.latitude && photo.longitude ? {
        latitude: parseFloat(photo.latitude),
        longitude: parseFloat(photo.longitude),
        address: photo.geo?.locality?._content || null
      } : null,
      metadata: {
        views: parseInt(photo.views) || 0,
        tags: photo.tags?.tag?.map(t => t.raw || t._content) || [],
        license: photo.license
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
    if (error.code === 98 || error.code === 99) {
      return new AuthenticationError(`Flickr authentication failed: ${error.message}`);
    } else if (error.code === 105) {
      return new RateLimitError(`Flickr rate limit exceeded: ${error.message}`, 3600);
    } else {
      return new ApiError(`Flickr API error: ${error.message}`, error.code || 500);
    }
  }
} 