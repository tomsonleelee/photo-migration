/**
 * Album Data Normalizer
 * Handles normalization of album data from different platforms
 */

import { Platform } from '../types.js';
import { Logger } from '../utils/index.js';

/**
 * Create normalized album object
 * @param {Object} params - Album parameters
 * @returns {Object} Normalized album
 */
export const createNormalizedAlbum = ({
  id,
  platformId,
  title = '',
  description = '',
  coverPhotoUrl = null,
  photoCount = 0,
  createdAt,
  updatedAt = null,
  url = null,
  privacy = 'private',
  isShared = false,
  metadata = {}
}) => ({
  id,
  platformId,
  title,
  description,
  coverPhotoUrl,
  photoCount: Number(photoCount),
  createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
  updatedAt: updatedAt ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)) : null,
  url,
  privacy,
  isShared,
  metadata: {
    ...metadata,
    originalData: metadata.originalData || null
  }
});

export class AlbumNormalizer {
  constructor() {
    this.logger = Logger.getLogger('AlbumNormalizer');
  }

  /**
   * Normalize album data from any platform to standard format
   * @param {Object} rawData - Raw album data from platform API
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized album object
   */
  normalize(rawData, platform) {
    try {
      switch (platform) {
        case Platform.GOOGLE_PHOTOS:
          return this._normalizeGooglePhotos(rawData);
        case Platform.FACEBOOK:
          return this._normalizeFacebook(rawData);
        case Platform.INSTAGRAM:
          return this._normalizeInstagram(rawData);
        case Platform.FLICKR:
          return this._normalizeFlickr(rawData);
        case Platform.FIVEHUNDREDPX:
          return this._normalize500px(rawData);
        default:
          this.logger.warn(`Unknown platform: ${platform}`, { rawData });
          return this._normalizeGeneric(rawData, platform);
      }
    } catch (error) {
      this.logger.error('Album normalization failed', { 
        error: error.message, 
        platform, 
        rawData 
      });
      throw error;
    }
  }

  /**
   * Normalize batch of albums
   * @param {Array} rawAlbums - Array of raw album data
   * @param {string} platform - Platform identifier
   * @returns {Array} Array of normalized album objects
   */
  normalizeBatch(rawAlbums, platform) {
    if (!Array.isArray(rawAlbums)) {
      throw new Error('Raw albums must be an array');
    }

    return rawAlbums.map(album => this.normalize(album, platform));
  }

  /**
   * Normalize Google Photos album
   * @param {Object} album - Google Photos album data
   * @returns {Object} Normalized album
   * @private
   */
  _normalizeGooglePhotos(album) {
    return createNormalizedAlbum({
      id: album.id,
      platformId: album.id,
      title: album.title || '',
      description: album.description || '',
      coverPhotoUrl: album.coverPhotoBaseUrl || null,
      photoCount: parseInt(album.mediaItemsCount) || 0,
      createdAt: this._parseDate(album.creationTime),
      updatedAt: null, // Google Photos doesn't provide update time
      url: album.productUrl || null,
      privacy: album.isWriteable ? 'private' : 'public', // Approximation
      isShared: album.shareInfo?.isOwned === false,
      metadata: {
        platform: Platform.GOOGLE_PHOTOS,
        isWriteable: album.isWriteable,
        shareInfo: album.shareInfo,
        originalData: album
      }
    });
  }

  /**
   * Normalize Facebook album
   * @param {Object} album - Facebook album data
   * @returns {Object} Normalized album
   * @private
   */
  _normalizeFacebook(album) {
    return createNormalizedAlbum({
      id: album.id,
      platformId: album.id,
      title: album.name || '',
      description: album.description || '',
      coverPhotoUrl: album.cover_photo?.picture || album.picture || null,
      photoCount: album.count || 0,
      createdAt: this._parseDate(album.created_time),
      updatedAt: this._parseDate(album.updated_time),
      url: album.link || null,
      privacy: album.privacy || 'private',
      isShared: album.privacy === 'public' || album.privacy === 'friends',
      metadata: {
        platform: Platform.FACEBOOK,
        type: album.type,
        location: album.location,
        canUpload: album.can_upload,
        originalData: album
      }
    });
  }

  /**
   * Normalize Instagram album (limited support)
   * @param {Object} album - Instagram album data
   * @returns {Object} Normalized album
   * @private
   */
  _normalizeInstagram(album) {
    // Instagram Basic Display API doesn't have albums
    // This handles carousel posts as pseudo-albums
    return createNormalizedAlbum({
      id: album.id,
      platformId: album.id,
      title: album.caption ? album.caption.substring(0, 50) + '...' : 'Instagram Carousel',
      description: album.caption || '',
      coverPhotoUrl: album.media_url || null,
      photoCount: album.children?.data?.length || 1,
      createdAt: this._parseDate(album.timestamp),
      updatedAt: null,
      url: album.permalink || null,
      privacy: 'private', // Instagram Basic Display is always private
      isShared: false,
      metadata: {
        platform: Platform.INSTAGRAM,
        mediaType: album.media_type,
        children: album.children,
        originalData: album
      }
    });
  }

  /**
   * Normalize Flickr photoset
   * @param {Object} photoset - Flickr photoset data
   * @returns {Object} Normalized album
   * @private
   */
  _normalizeFlickr(photoset) {
    return createNormalizedAlbum({
      id: photoset.id,
      platformId: photoset.id,
      title: photoset.title?._content || photoset.title || '',
      description: photoset.description?._content || photoset.description || '',
      coverPhotoUrl: this._buildFlickrPhotoUrl(photoset.primary, photoset.secret, photoset.server, photoset.farm),
      photoCount: parseInt(photoset.photos) || 0,
      createdAt: this._parseDate(photoset.date_create),
      updatedAt: this._parseDate(photoset.date_update),
      url: `https://www.flickr.com/photos/${photoset.owner}/sets/${photoset.id}/`,
      privacy: this._getFlickrPrivacy(photoset.visibility_can_see_set),
      isShared: photoset.visibility_can_see_set !== '0',
      metadata: {
        platform: Platform.FLICKR,
        owner: photoset.owner,
        secret: photoset.secret,
        server: photoset.server,
        farm: photoset.farm,
        needsInterstitial: photoset.needs_interstitial,
        visibility: {
          canSeeSet: photoset.visibility_can_see_set,
          canComment: photoset.can_comment
        },
        originalData: photoset
      }
    });
  }

  /**
   * Normalize 500px collection
   * @param {Object} collection - 500px collection data
   * @returns {Object} Normalized album
   * @private
   */
  _normalize500px(collection) {
    return createNormalizedAlbum({
      id: collection.id.toString(),
      platformId: collection.id.toString(),
      title: collection.name || '',
      description: collection.description || '',
      coverPhotoUrl: collection.cover_photo_url || null,
      photoCount: collection.photos_count || 0,
      createdAt: this._parseDate(collection.created_at),
      updatedAt: this._parseDate(collection.updated_at),
      url: `https://500px.com/p/${collection.user?.username}/galleries/${collection.id}`,
      privacy: collection.privacy ? 'private' : 'public',
      isShared: !collection.privacy,
      metadata: {
        platform: Platform.FIVEHUNDREDPX,
        user: collection.user,
        kind: collection.kind,
        path: collection.path,
        originalData: collection
      }
    });
  }

  /**
   * Generic normalization for unknown platforms
   * @param {Object} data - Raw album data
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized album
   * @private
   */
  _normalizeGeneric(data, platform) {
    return createNormalizedAlbum({
      id: data.id || data._id || data.identifier || '',
      platformId: data.id || data._id || data.identifier || '',
      title: data.title || data.name || '',
      description: data.description || '',
      coverPhotoUrl: data.cover_photo || data.thumbnail || data.cover_image || null,
      photoCount: this._parseNumber(data.photo_count || data.count || data.items_count),
      createdAt: this._parseDate(data.created_at || data.date_created),
      updatedAt: this._parseDate(data.updated_at || data.date_modified),
      url: data.url || data.link || null,
      privacy: data.privacy || 'private',
      isShared: data.is_shared || data.shared || false,
      metadata: {
        platform: platform,
        originalData: data
      }
    });
  }

  // Helper methods

  /**
   * Parse date string to Date object
   * @param {string|number|Date} dateValue - Date value
   * @returns {Date|null} Parsed date
   * @private
   */
  _parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    
    // Handle Unix timestamps
    if (typeof dateValue === 'number') {
      return new Date(dateValue * 1000);
    }
    
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Parse number value
   * @param {any} value - Value to parse
   * @returns {number} Parsed number
   * @private
   */
  _parseNumber(value) {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Build Flickr photo URL
   * @param {string} photoId - Photo ID
   * @param {string} secret - Photo secret
   * @param {string} server - Server ID
   * @param {string} farm - Farm ID
   * @returns {string|null} Photo URL
   * @private
   */
  _buildFlickrPhotoUrl(photoId, secret, server, farm) {
    if (!photoId || !secret || !server) return null;
    return `https://farm${farm}.staticflickr.com/${server}/${photoId}_${secret}_m.jpg`;
  }

  /**
   * Get privacy setting from Flickr visibility
   * @param {string} visibility - Flickr visibility setting
   * @returns {string} Privacy setting
   * @private
   */
  _getFlickrPrivacy(visibility) {
    switch (visibility) {
      case '0': return 'private';
      case '1': return 'public';
      case '2': return 'friends';
      case '3': return 'family';
      case '4': return 'friends_family';
      default: return 'private';
    }
  }
}

// Export singleton instance
export const albumNormalizer = new AlbumNormalizer();
export default AlbumNormalizer; 