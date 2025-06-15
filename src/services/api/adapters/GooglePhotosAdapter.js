import { google } from 'googleapis';
import { PhotoApiAdapter } from '../interfaces/PhotoApiAdapter.js';
import { Platform, ApiError, RateLimitError, AuthenticationError, createNormalizedPhoto, createApiResponse } from '../types.js';
import { createPlatformLogger } from '../utils/index.js';

/**
 * Google Photos API Adapter
 */
export class GooglePhotosAdapter extends PhotoApiAdapter {
  constructor(authManager, rateLimiter = null, options = {}) {
    super(Platform.GOOGLE_PHOTOS, authManager, rateLimiter);
    
    this.options = {
      version: 'v1',
      scopes: [
        'https://www.googleapis.com/auth/photoslibrary.readonly',
        'https://www.googleapis.com/auth/photoslibrary.appendonly'
      ],
      ...options
    };

    this.logger = createPlatformLogger('GooglePhotos');
    this.photosLibrary = null;
    this.auth = null;
    
    this._initializeClient();
  }

  /**
   * Initialize Google Photos client
   * @private
   */
  async _initializeClient() {
    try {
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if available
      const tokens = await this.authManager.getTokens(this.platform);
      if (tokens && tokens.access_token) {
        this.auth.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        });
      }

      this.photosLibrary = google.photoslibrary({ version: this.options.version, auth: this.auth });
      
      this.logger.info('Google Photos client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Photos client', { error: error.message });
      throw new ApiError(`Failed to initialize Google Photos client: ${error.message}`);
    }
  }

  /**
   * Fetch photos from Google Photos
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with photos
   */
  async fetchPhotos(params = {}) {
    const requestParams = {
      pageSize: Math.min(params.pageSize || 50, 100),
      pageToken: params.pageToken || undefined,
      filters: this._buildFilters(params)
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photos from Google Photos', { params: requestParams });

      const response = await this.photosLibrary.mediaItems.search({
        requestBody: requestParams
      });

      const photos = (response.data.mediaItems || []).map(item => 
        this._normalizePhoto(item)
      );

      return createApiResponse(photos, {
        platform: this.platform,
        totalCount: photos.length,
        nextPageToken: response.data.nextPageToken,
        hasNextPage: !!response.data.nextPageToken
      });
    });
  }

  /**
   * Fetch a specific photo by ID
   * @param {string} photoId - Photo ID
   * @returns {Promise<Object>} Normalized photo object
   */
  async fetchPhoto(photoId) {
    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching photo from Google Photos', { photoId });

      const response = await this.photosLibrary.mediaItems.get({
        mediaItemId: photoId
      });

      return this._normalizePhoto(response.data);
    });
  }

  /**
   * Upload a photo to Google Photos
   * @param {Object} photoData - Photo data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(photoData) {
    return this._executeWithRetry(async () => {
      this.logger.info('Uploading photo to Google Photos', { 
        filename: photoData.filename 
      });

      // Step 1: Upload raw bytes
      const uploadToken = await this._uploadBytes(photoData);

      // Step 2: Create media item
      const response = await this.photosLibrary.mediaItems.batchCreate({
        requestBody: {
          newMediaItems: [{
            description: photoData.description || '',
            simpleMediaItem: {
              fileName: photoData.filename,
              uploadToken: uploadToken
            }
          }]
        }
      });

      const result = response.data.newMediaItemResults[0];
      
      if (result.status && result.status.code !== 0) {
        throw new ApiError(`Upload failed: ${result.status.message}`, result.status.code);
      }

      return {
        success: true,
        photoId: result.mediaItem.id,
        url: result.mediaItem.baseUrl,
        platform: this.platform
      };
    });
  }

  /**
   * Delete a photo from Google Photos
   * @param {string} photoId - Photo ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePhoto(photoId) {
    // Note: Google Photos API doesn't support deletion via API
    // This is a limitation of the Google Photos API
    this.logger.warn('Google Photos API does not support photo deletion', { photoId });
    throw new ApiError('Google Photos API does not support photo deletion', 501);
  }

  /**
   * Fetch albums from Google Photos
   * @param {Object} params - Fetch parameters
   * @returns {Promise<Object>} API response with albums
   */
  async fetchAlbums(params = {}) {
    const requestParams = {
      pageSize: Math.min(params.pageSize || 50, 50),
      pageToken: params.pageToken || undefined,
      excludeNonAppCreatedData: params.excludeNonAppCreatedData || false
    };

    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching albums from Google Photos', { params: requestParams });

      const response = await this.photosLibrary.albums.list(requestParams);

      const albums = (response.data.albums || []).map(album => ({
        id: album.id,
        title: album.title,
        description: album.description || '',
        coverPhotoUrl: album.coverPhotoBaseUrl,
        mediaItemsCount: parseInt(album.mediaItemsCount) || 0,
        createdAt: album.creationTime,
        url: album.productUrl,
        platform: this.platform
      }));

      return createApiResponse(albums, {
        platform: this.platform,
        totalCount: albums.length,
        nextPageToken: response.data.nextPageToken,
        hasNextPage: !!response.data.nextPageToken
      });
    });
  }

  /**
   * Create a new album
   * @param {Object} albumData - Album data
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(albumData) {
    return this._executeWithRetry(async () => {
      this.logger.info('Creating album in Google Photos', { 
        title: albumData.title 
      });

      const response = await this.photosLibrary.albums.create({
        requestBody: {
          album: {
            title: albumData.title
          }
        }
      });

      return {
        id: response.data.id,
        title: response.data.title,
        description: '',
        coverPhotoUrl: response.data.coverPhotoBaseUrl,
        mediaItemsCount: 0,
        createdAt: response.data.creationTime,
        url: response.data.productUrl,
        platform: this.platform
      };
    });
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    return this._executeWithRetry(async () => {
      this.logger.debug('Fetching user profile from Google Photos');

      // Google Photos API doesn't have a direct profile endpoint
      // We'll use the Google+ People API or make a simple authenticated request
      const response = await this.photosLibrary.albums.list({ pageSize: 1 });
      
      // Extract user info from auth context if available
      const userInfo = this.auth.credentials;
      
      return {
        id: userInfo.sub || 'unknown',
        name: userInfo.name || 'Google Photos User',
        email: userInfo.email || '',
        profilePictureUrl: userInfo.picture || '',
        platform: this.platform
      };
    });
  }

  /**
   * Get API limits and usage information
   * @returns {Promise<Object>} API limits information
   */
  async getApiLimits() {
    // Google Photos API doesn't provide quota information directly
    // Return estimated limits based on documentation
    return {
      limit: 10000, // 10,000 requests per day
      remaining: 10000, // Cannot determine actual usage
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      platform: this.platform
    };
  }

  /**
   * Test connection to Google Photos
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.photosLibrary.albums.list({ pageSize: 1 });
      this.logger.info('Google Photos connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Google Photos connection test failed', { error: error.message });
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
      return !!(tokens && tokens.access_token);
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
    try {
      this.logger.info('Refreshing Google Photos token');

      const tokens = await this.authManager.getTokens(this.platform);
      if (!tokens || !tokens.refresh_token) {
        throw new AuthenticationError('No refresh token available');
      }

      this.auth.setCredentials({
        refresh_token: tokens.refresh_token
      });

      const { credentials } = await this.auth.refreshAccessToken();
      
      // Update stored tokens
      await this.authManager.setTokens(this.platform, {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date
      });

      this.logger.info('Google Photos token refreshed successfully');
      return credentials.access_token;
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      throw new AuthenticationError(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Upload raw bytes to Google Photos
   * @param {Object} photoData - Photo data
   * @returns {Promise<string>} Upload token
   * @private
   */
  async _uploadBytes(photoData) {
    const uploadUrl = 'https://photoslibrary.googleapis.com/v1/uploads';
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.auth.credentials.access_token}`,
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-Protocol': 'raw',
        'X-Goog-Upload-File-Name': photoData.filename
      },
      body: photoData.buffer
    });

    if (!response.ok) {
      throw new ApiError(`Upload failed: ${response.statusText}`, response.status);
    }

    return await response.text(); // Upload token
  }

  /**
   * Build filters for search request
   * @param {Object} params - Search parameters
   * @returns {Object} Filters object
   * @private
   */
  _buildFilters(params) {
    const filters = {};

    if (params.startDate || params.endDate) {
      filters.dateFilter = {
        ranges: [{
          startDate: params.startDate ? {
            year: params.startDate.getFullYear(),
            month: params.startDate.getMonth() + 1,
            day: params.startDate.getDate()
          } : undefined,
          endDate: params.endDate ? {
            year: params.endDate.getFullYear(),
            month: params.endDate.getMonth() + 1,
            day: params.endDate.getDate()
          } : undefined
        }]
      };
    }

    if (params.mediaTypes && params.mediaTypes.length > 0) {
      filters.mediaTypeFilter = {
        mediaTypes: params.mediaTypes.map(type => type.toUpperCase())
      };
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  /**
   * Normalize Google Photos media item to standard format
   * @param {Object} item - Google Photos media item
   * @returns {Object} Normalized photo object
   * @private
   */
  _normalizePhoto(item) {
    return createNormalizedPhoto({
      id: item.id,
      title: item.filename || '',
      description: item.description || '',
      url: item.baseUrl,
      downloadUrl: `${item.baseUrl}=d`, // Add download parameter
      thumbnailUrl: `${item.baseUrl}=w300-h300`,
      size: {
        width: parseInt(item.mediaMetadata?.width) || 0,
        height: parseInt(item.mediaMetadata?.height) || 0,
        bytes: 0 // Not provided by Google Photos API
      },
      format: item.mimeType,
      createdAt: item.mediaMetadata?.creationTime || item.creationTime,
      location: item.mediaMetadata?.photo?.cameraMake ? {
        latitude: null,
        longitude: null,
        address: null
      } : null,
      metadata: {
        cameraMake: item.mediaMetadata?.photo?.cameraMake,
        cameraModel: item.mediaMetadata?.photo?.cameraModel,
        focalLength: item.mediaMetadata?.photo?.focalLength,
        apertureFNumber: item.mediaMetadata?.photo?.apertureFNumber,
        isoEquivalent: item.mediaMetadata?.photo?.isoEquivalent,
        exposureTime: item.mediaMetadata?.photo?.exposureTime
      },
      platform: this.platform,
      originalData: item
    });
  }

  /**
   * Handle API errors
   * @param {Error} error - Original error
   * @returns {Error} Processed error
   * @private
   */
  _handleApiError(error) {
    if (error.code === 401 || error.code === 403) {
      return new AuthenticationError(`Google Photos authentication failed: ${error.message}`);
    } else if (error.code === 429) {
      return new RateLimitError(`Google Photos rate limit exceeded: ${error.message}`, 60);
    } else {
      return new ApiError(`Google Photos API error: ${error.message}`, error.code || 500);
    }
  }
} 