/**
 * Photo Data Normalizer
 * Handles normalization of photo data from different platforms
 */

import { createNormalizedPhoto, Platform } from '../types.js';
import { Logger } from '../utils/index.js';

export class PhotoNormalizer {
  constructor() {
    this.logger = Logger.getLogger('PhotoNormalizer');
  }

  /**
   * Normalize photo data from any platform to standard format
   * @param {Object} rawData - Raw photo data from platform API
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized photo object
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
      this.logger.error('Normalization failed', { 
        error: error.message, 
        platform, 
        rawData 
      });
      throw error;
    }
  }

  /**
   * Normalize batch of photos
   * @param {Array} rawPhotos - Array of raw photo data
   * @param {string} platform - Platform identifier
   * @returns {Array} Array of normalized photo objects
   */
  normalizeBatch(rawPhotos, platform) {
    if (!Array.isArray(rawPhotos)) {
      throw new Error('Raw photos must be an array');
    }

    return rawPhotos.map(photo => this.normalize(photo, platform));
  }

  /**
   * Normalize Google Photos data
   * @param {Object} item - Google Photos media item
   * @returns {Object} Normalized photo
   * @private
   */
  _normalizeGooglePhotos(item) {
    const metadata = item.mediaMetadata || {};
    const photoMeta = metadata.photo || {};

    return createNormalizedPhoto({
      id: item.id,
      platformId: item.id,
      url: item.baseUrl,
      thumbnailUrl: `${item.baseUrl}=w300-h300-c`,
      downloadUrl: `${item.baseUrl}=d`,
      title: item.filename || '',
      description: item.description || '',
      createdAt: this._parseDate(metadata.creationTime || item.creationTime),
      updatedAt: this._parseDate(item.modificationTime),
      width: this._parseNumber(metadata.width),
      height: this._parseNumber(metadata.height),
      fileSize: 0, // Not provided by Google Photos API
      mimeType: item.mimeType || 'image/jpeg',
      tags: [],
      location: this._extractLocation(photoMeta),
      metadata: {
        camera: {
          make: photoMeta.cameraMake,
          model: photoMeta.cameraModel,
          lens: null
        },
        exif: {
          focalLength: this._parseNumber(photoMeta.focalLength),
          aperture: this._parseNumber(photoMeta.apertureFNumber),
          iso: this._parseNumber(photoMeta.isoEquivalent),
          exposureTime: photoMeta.exposureTime,
          flash: null,
          orientation: null
        },
        platform: Platform.GOOGLE_PHOTOS,
        originalData: item
      }
    });
  }

  /**
   * Normalize Facebook data
   * @param {Object} photo - Facebook photo data
   * @returns {Object} Normalized photo
   * @private
   */
  _normalizeFacebook(photo) {
    const images = photo.images || [];
    const highestRes = images.reduce((prev, current) => 
      (current.width > prev.width) ? current : prev, images[0] || {});
    const thumbnail = images.find(img => img.width <= 300) || highestRes;

    return createNormalizedPhoto({
      id: photo.id,
      platformId: photo.id,
      url: highestRes.source || photo.source || '',
      thumbnailUrl: thumbnail.source || photo.picture || '',
      downloadUrl: photo.source || '',
      title: photo.name || '',
      description: photo.description || '',
      createdAt: this._parseDate(photo.created_time),
      updatedAt: this._parseDate(photo.updated_time),
      width: this._parseNumber(highestRes.width),
      height: this._parseNumber(highestRes.height),
      fileSize: 0, // Not provided by Facebook API
      mimeType: 'image/jpeg', // Facebook doesn't provide MIME type
      tags: this._extractTags(photo.tags),
      location: this._extractFacebookLocation(photo.place),
      metadata: {
        camera: {
          make: null,
          model: null,
          lens: null
        },
        exif: {},
        platform: Platform.FACEBOOK,
        privacy: photo.privacy,
        likes: photo.likes?.summary?.total_count || 0,
        comments: photo.comments?.summary?.total_count || 0,
        originalData: photo
      }
    });
  }

  /**
   * Normalize Instagram data
   * @param {Object} item - Instagram media item
   * @returns {Object} Normalized photo
   * @private
   */
  _normalizeInstagram(item) {
    return createNormalizedPhoto({
      id: item.id,
      platformId: item.id,
      url: item.media_url || '',
      thumbnailUrl: item.thumbnail_url || item.media_url || '',
      downloadUrl: item.media_url || '',
      title: item.caption || '',
      description: item.caption || '',
      createdAt: this._parseDate(item.timestamp),
      updatedAt: null,
      width: 0, // Instagram doesn't provide dimensions in Basic Display API
      height: 0,
      fileSize: 0,
      mimeType: this._getInstagramMimeType(item.media_type),
      tags: this._extractHashtags(item.caption),
      location: null, // Not available in Basic Display API
      metadata: {
        camera: {
          make: null,
          model: null,
          lens: null
        },
        exif: {},
        platform: Platform.INSTAGRAM,
        mediaType: item.media_type,
        permalink: item.permalink,
        originalData: item
      }
    });
  }

  /**
   * Normalize Flickr data
   * @param {Object} photo - Flickr photo data
   * @param {Array} sizes - Available photo sizes
   * @returns {Object} Normalized photo
   * @private
   */
  _normalizeFlickr(photo, sizes = []) {
    const largeSize = sizes.find(s => s.label === 'Large') || sizes[sizes.length - 1] || {};
    const thumbSize = sizes.find(s => s.label === 'Small') || sizes[0] || {};

    return createNormalizedPhoto({
      id: photo.id,
      platformId: photo.id,
      url: largeSize.source || photo.url_l || photo.url_m || '',
      thumbnailUrl: thumbSize.source || photo.url_s || photo.url_sq || '',
      downloadUrl: photo.url_o || largeSize.source || '',
      title: photo.title || '',
      description: photo.description?._content || photo.description || '',
      createdAt: this._parseDate(photo.datetaken || photo.dateupload),
      updatedAt: this._parseDate(photo.lastupdate),
      width: this._parseNumber(largeSize.width || photo.width_l || photo.width_m),
      height: this._parseNumber(largeSize.height || photo.height_l || photo.height_m),
      fileSize: 0, // Not provided
      mimeType: 'image/jpeg', // Flickr doesn't specify
      tags: this._extractFlickrTags(photo.tags),
      location: this._extractFlickrLocation(photo),
      metadata: {
        camera: {
          make: photo.exif?.find(e => e.tag === 'Make')?.raw,
          model: photo.exif?.find(e => e.tag === 'Model')?.raw,
          lens: photo.exif?.find(e => e.tag === 'LensModel')?.raw
        },
        exif: this._extractFlickrExif(photo.exif),
        platform: Platform.FLICKR,
        views: this._parseNumber(photo.views),
        license: photo.license,
        safety_level: photo.safety_level,
        originalData: photo
      }
    });
  }

  /**
   * Normalize 500px data
   * @param {Object} photo - 500px photo data
   * @returns {Object} Normalized photo
   * @private
   */
  _normalize500px(photo) {
    const images = photo.images || [];
    const largeImage = images.find(img => img.size >= 1600) || images[images.length - 1] || {};
    const thumbImage = images.find(img => img.size <= 300) || images[0] || {};

    return createNormalizedPhoto({
      id: photo.id.toString(),
      platformId: photo.id.toString(),
      url: largeImage.https_url || largeImage.url || photo.image_url,
      thumbnailUrl: thumbImage.https_url || thumbImage.url || photo.image_url,
      downloadUrl: largeImage.https_url || largeImage.url || '',
      title: photo.name || '',
      description: photo.description || '',
      createdAt: this._parseDate(photo.created_at),
      updatedAt: this._parseDate(photo.updated_at),
      width: this._parseNumber(photo.width),
      height: this._parseNumber(photo.height),
      fileSize: 0, // Not provided
      mimeType: 'image/jpeg', // 500px doesn't specify
      tags: this._extract500pxTags(photo.tags),
      location: this._extract500pxLocation(photo),
      metadata: {
        camera: {
          make: photo.camera,
          model: null,
          lens: photo.lens
        },
        exif: {
          focalLength: photo.focal_length,
          aperture: photo.aperture,
          iso: photo.iso,
          exposureTime: photo.shutter_speed,
          flash: null,
          orientation: null
        },
        platform: Platform.FIVEHUNDREDPX,
        rating: photo.rating,
        votes_count: photo.votes_count,
        favorites_count: photo.favorites_count,
        category: photo.category,
        originalData: photo
      }
    });
  }

  /**
   * Generic normalization for unknown platforms
   * @param {Object} data - Raw data
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized photo
   * @private
   */
  _normalizeGeneric(data, platform) {
    return createNormalizedPhoto({
      id: data.id || data._id || data.identifier || '',
      platformId: data.id || data._id || data.identifier || '',
      url: data.url || data.image_url || data.src || '',
      thumbnailUrl: data.thumbnail || data.thumb || data.url || '',
      downloadUrl: data.download_url || data.url || '',
      title: data.title || data.name || data.filename || '',
      description: data.description || data.caption || '',
      createdAt: this._parseDate(data.created_at || data.date_created || data.timestamp),
      updatedAt: this._parseDate(data.updated_at || data.date_modified),
      width: this._parseNumber(data.width),
      height: this._parseNumber(data.height),
      fileSize: this._parseNumber(data.size || data.file_size),
      mimeType: data.mime_type || data.content_type || 'image/jpeg',
      tags: this._extractGenericTags(data.tags),
      location: null,
      metadata: {
        camera: {
          make: null,
          model: null,
          lens: null
        },
        exif: {},
        platform: platform,
        originalData: data
      }
    });
  }

  // Helper methods for data extraction and parsing

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
   * Extract location information (generic)
   * @param {Object} locationData - Location data
   * @returns {Object|null} Location object
   * @private
   */
  _extractLocation(locationData) {
    if (!locationData) return null;
    
    return {
      latitude: this._parseNumber(locationData.latitude || locationData.lat),
      longitude: this._parseNumber(locationData.longitude || locationData.lng || locationData.lon),
      address: locationData.address || locationData.name || null,
      city: locationData.city || null,
      country: locationData.country || null
    };
  }

  /**
   * Extract Facebook location
   * @param {Object} place - Facebook place object
   * @returns {Object|null} Location object
   * @private
   */
  _extractFacebookLocation(place) {
    if (!place) return null;
    
    return {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
      address: place.name || null,
      city: place.location?.city || null,
      country: place.location?.country || null
    };
  }

  /**
   * Extract Flickr location
   * @param {Object} photo - Flickr photo data
   * @returns {Object|null} Location object
   * @private
   */
  _extractFlickrLocation(photo) {
    if (!photo.latitude || !photo.longitude) return null;
    
    return {
      latitude: this._parseNumber(photo.latitude),
      longitude: this._parseNumber(photo.longitude),
      address: photo.location?.locality?._content || null,
      city: photo.location?.locality?._content || null,
      country: photo.location?.country?._content || null
    };
  }

  /**
   * Extract 500px location
   * @param {Object} photo - 500px photo data
   * @returns {Object|null} Location object
   * @private
   */
  _extract500pxLocation(photo) {
    if (!photo.latitude || !photo.longitude) return null;
    
    return {
      latitude: this._parseNumber(photo.latitude),
      longitude: this._parseNumber(photo.longitude),
      address: photo.location || null,
      city: photo.city || null,
      country: photo.country || null
    };
  }

  /**
   * Extract tags from Facebook data
   * @param {Object} tags - Facebook tags object
   * @returns {Array} Tags array
   * @private
   */
  _extractTags(tags) {
    if (!tags || !tags.data) return [];
    return tags.data.map(tag => tag.name).filter(Boolean);
  }

  /**
   * Extract hashtags from Instagram caption
   * @param {string} caption - Instagram caption
   * @returns {Array} Hashtags array
   * @private
   */
  _extractHashtags(caption) {
    if (!caption) return [];
    const hashtags = caption.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.slice(1)) : [];
  }

  /**
   * Extract Flickr tags
   * @param {string} tags - Flickr tags string
   * @returns {Array} Tags array
   * @private
   */
  _extractFlickrTags(tags) {
    if (!tags) return [];
    if (typeof tags === 'string') {
      return tags.split(/\s+/).filter(Boolean);
    }
    if (Array.isArray(tags)) {
      return tags.map(tag => tag.raw || tag._content || tag).filter(Boolean);
    }
    return [];
  }

  /**
   * Extract 500px tags
   * @param {Array} tags - 500px tags array
   * @returns {Array} Tags array
   * @private
   */
  _extract500pxTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map(tag => tag.name || tag).filter(Boolean);
  }

  /**
   * Extract generic tags
   * @param {any} tags - Tags data
   * @returns {Array} Tags array
   * @private
   */
  _extractGenericTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
    return [];
  }

  /**
   * Extract Flickr EXIF data
   * @param {Array} exifArray - Flickr EXIF array
   * @returns {Object} EXIF object
   * @private
   */
  _extractFlickrExif(exifArray) {
    if (!Array.isArray(exifArray)) return {};
    
    const exif = {};
    exifArray.forEach(item => {
      switch (item.tag) {
        case 'FocalLength':
          exif.focalLength = this._parseNumber(item.raw);
          break;
        case 'FNumber':
          exif.aperture = this._parseNumber(item.raw);
          break;
        case 'ISO':
          exif.iso = this._parseNumber(item.raw);
          break;
        case 'ExposureTime':
          exif.exposureTime = item.raw;
          break;
        case 'Flash':
          exif.flash = item.raw;
          break;
        case 'Orientation':
          exif.orientation = this._parseNumber(item.raw);
          break;
      }
    });
    
    return exif;
  }

  /**
   * Get MIME type for Instagram media
   * @param {string} mediaType - Instagram media type
   * @returns {string} MIME type
   * @private
   */
  _getInstagramMimeType(mediaType) {
    switch (mediaType) {
      case 'IMAGE':
        return 'image/jpeg';
      case 'VIDEO':
        return 'video/mp4';
      case 'CAROUSEL_ALBUM':
        return 'image/jpeg'; // Default for carousel
      default:
        return 'image/jpeg';
    }
  }
}

// Export singleton instance
export const photoNormalizer = new PhotoNormalizer();
export default PhotoNormalizer; 