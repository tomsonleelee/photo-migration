/**
 * Data Normalization Utilities
 * Implements EXIF standardization, file naming conventions, and metadata consistency
 * Based on photo migration best practices research
 */

import { createNormalizedPhoto } from '../types.js';

/**
 * EXIF Data Standardization
 */
export class ExifNormalizer {
  
  static ESSENTIAL_FIELDS = [
    'dateTimeOriginal',
    'cameraMake',
    'cameraModel',
    'lensModel',
    'aperture',
    'shutterSpeed',
    'iso',
    'gpsLatitude',
    'gpsLongitude',
    'orientation'
  ];

  /**
   * Normalize date and time to ISO 8601 UTC format
   */
  static normalizeDateTime(dateTimeString) {
    if (!dateTimeString) return null;
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      console.warn('Failed to normalize datetime:', dateTimeString, error);
      return null;
    }
  }

  /**
   * Normalize GPS coordinates to decimal degrees format
   */
  static normalizeGPSCoordinates(latitude, longitude) {
    if (!latitude || !longitude) return null;
    
    try {
      const normalizedLat = parseFloat(latitude).toFixed(6);
      const normalizedLon = parseFloat(longitude).toFixed(6);
      
      if (Math.abs(normalizedLat) > 90 || Math.abs(normalizedLon) > 180) {
        return null;
      }
      
      return { 
        latitude: parseFloat(normalizedLat), 
        longitude: parseFloat(normalizedLon) 
      };
    } catch (error) {
      console.warn('Failed to normalize GPS coordinates:', latitude, longitude, error);
      return null;
    }
  }

  /**
   * Camera model mapping for standardization
   */
  static CAMERA_MODEL_MAP = {
    "canon eos 5d mark iv": "Canon EOS 5D Mark IV",
    "canon eos 5d mk iv": "Canon EOS 5D Mark IV",
    "canon eos 5d mark iii": "Canon EOS 5D Mark III",
    "canon eos 5d mk iii": "Canon EOS 5D Mark III",
    "canon eos r5": "Canon EOS R5",
    "canon eos r6": "Canon EOS R6",
    "nikon d850": "Nikon D850",
    "nikon d780": "Nikon D780",
    "nikon z7": "Nikon Z7",
    "nikon z6": "Nikon Z6",
    "sony a7r iv": "Sony α7R IV",
    "sony a7 iv": "Sony α7 IV",
    "sony a7r iii": "Sony α7R III",
    "fujifilm x-t4": "Fujifilm X-T4",
    "fujifilm x-t3": "Fujifilm X-T3",
    "iphone 14 pro": "iPhone 14 Pro",
    "iphone 13 pro": "iPhone 13 Pro",
    "iphone 12 pro": "iPhone 12 Pro"
  };

  /**
   * Normalize camera model name
   */
  static normalizeCameraModel(model) {
    if (!model) return null;
    
    const normalizedModel = model.toLowerCase().trim();
    return this.CAMERA_MODEL_MAP[normalizedModel] || model.trim();
  }

  /**
   * Normalize camera make name
   */
  static normalizeCameraMake(make) {
    if (!make) return null;
    
    const makeMap = {
      'canon': 'Canon',
      'nikon': 'Nikon',
      'sony': 'Sony',
      'fujifilm': 'Fujifilm',
      'fuji': 'Fujifilm',
      'apple': 'Apple',
      'samsung': 'Samsung',
      'google': 'Google',
      'oneplus': 'OnePlus',
      'xiaomi': 'Xiaomi'
    };
    
    const normalizedMake = make.toLowerCase().trim();
    return makeMap[normalizedMake] || make.trim();
  }

  /**
   * Standardize aperture value
   */
  static normalizeAperture(aperture) {
    if (!aperture) return null;
    
    try {
      const fNumber = parseFloat(aperture.toString().replace(/[^\d.]/g, ''));
      return fNumber > 0 && fNumber <= 32 ? parseFloat(fNumber.toFixed(1)) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Standardize ISO value
   */
  static normalizeISO(iso) {
    if (!iso) return null;
    
    try {
      const isoNumber = parseInt(iso);
      return isoNumber >= 50 && isoNumber <= 409600 ? isoNumber : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize complete EXIF data
   */
  static normalizeExifData(exifData) {
    if (!exifData) return {};

    return {
      dateTimeOriginal: this.normalizeDateTime(exifData.dateTimeOriginal || exifData.createDate),
      cameraMake: this.normalizeCameraMake(exifData.cameraMake || exifData.make),
      cameraModel: this.normalizeCameraModel(exifData.cameraModel || exifData.model),
      lensModel: exifData.lensModel || exifData.lens || null,
      aperture: this.normalizeAperture(exifData.aperture || exifData.fNumber),
      shutterSpeed: exifData.shutterSpeed || exifData.exposureTime || null,
      iso: this.normalizeISO(exifData.iso || exifData.isoSpeedRating),
      gpsCoordinates: this.normalizeGPSCoordinates(
        exifData.gpsLatitude || exifData.latitude,
        exifData.gpsLongitude || exifData.longitude
      ),
      orientation: exifData.orientation || 1,
      originalExif: { ...exifData } // Preserve original for reference
    };
  }
}

/**
 * File Naming Convention System
 */
export class FileNameNormalizer {
  
  /**
   * Generate standardized filename
   * Format: [Date]_[Time]_[Location]_[Event]_[SequenceNumber].[Extension]
   */
  static generateFileName(photo, options = {}) {
    const {
      includeLocation = true,
      includeEvent = true,
      sequenceNumber = 1,
      customPrefix = null
    } = options;

    try {
      // Extract date and time
      const dateTime = new Date(photo.dateTaken || photo.createdAt || Date.now());
      const date = dateTime.toISOString().slice(0, 10).replace(/-/g, '');
      const time = dateTime.toISOString().slice(11, 19).replace(/:/g, '');

      // Build filename parts
      const parts = [customPrefix || date, time];
      
      if (includeLocation && photo.location?.name) {
        const location = this.sanitizeFilenamePart(photo.location.name);
        parts.push(location);
      }
      
      if (includeEvent && photo.album) {
        const event = this.sanitizeFilenamePart(photo.album);
        parts.push(event);
      }
      
      // Add sequence number
      const seqNum = String(sequenceNumber).padStart(3, '0');
      parts.push(seqNum);
      
      // Get file extension
      const extension = this.extractFileExtension(photo.filename || photo.originalFilename || 'jpg');
      
      return `${parts.join('_')}.${extension.toLowerCase()}`;
    } catch (error) {
      console.warn('Failed to generate filename:', error);
      return `photo_${Date.now()}.jpg`;
    }
  }

  /**
   * Sanitize filename part by removing special characters
   */
  static sanitizeFilenamePart(text) {
    if (!text) return '';
    
    return text
      .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
      .replace(/\s+/g, '_')     // Replace spaces with underscores
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .replace(/_+/g, '_')      // Replace multiple underscores with single
      .toLowerCase()
      .substring(0, 20);        // Limit length
  }

  /**
   * Extract file extension from filename
   */
  static extractFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1] : 'jpg';
  }

  /**
   * Handle filename collisions by adding unique identifier
   */
  static ensureUniqueFileName(fileName, existingFiles) {
    if (!existingFiles.includes(fileName)) {
      return fileName;
    }

    const [name, extension] = fileName.split('.');
    let counter = 1;
    let uniqueFileName;

    do {
      uniqueFileName = `${name}_${counter}.${extension}`;
      counter++;
    } while (existingFiles.includes(uniqueFileName) && counter < 1000);

    return uniqueFileName;
  }
}

/**
 * Cross-Platform Metadata Normalizer
 */
export class MetadataNormalizer {
  
  /**
   * Unified metadata schema
   */
  static UNIFIED_SCHEMA = {
    id: 'string',
    title: 'string',
    description: 'string',
    dateTaken: 'string',
    location: 'object',
    camera: 'object',
    exposure: 'object',
    tags: 'array',
    album: 'string',
    source: 'string',
    originalUrl: 'string',
    filename: 'string',
    fileSize: 'number',
    dimensions: 'object',
    exif: 'object'
  };

  /**
   * Platform-specific adapters for metadata conversion
   */
  static convertGooglePhotosMetadata(googlePhoto) {
    const exif = ExifNormalizer.normalizeExifData(googlePhoto.mediaMetadata);
    
    return createNormalizedPhoto({
      id: googlePhoto.id,
      title: googlePhoto.filename || 'Untitled',
      description: googlePhoto.description || '',
      dateTaken: exif.dateTimeOriginal || ExifNormalizer.normalizeDateTime(googlePhoto.mediaMetadata.creationTime),
      location: exif.gpsCoordinates ? {
        latitude: exif.gpsCoordinates.latitude,
        longitude: exif.gpsCoordinates.longitude,
        name: null // Will be enhanced later
      } : null,
      camera: {
        make: exif.cameraMake,
        model: exif.cameraModel
      },
      exposure: {
        aperture: exif.aperture,
        shutterSpeed: exif.shutterSpeed,
        iso: exif.iso
      },
      tags: [],
      album: null,
      source: 'Google Photos',
      originalUrl: googlePhoto.productUrl,
      filename: googlePhoto.filename,
      fileSize: parseInt(googlePhoto.mediaMetadata.width) * parseInt(googlePhoto.mediaMetadata.height),
      dimensions: {
        width: parseInt(googlePhoto.mediaMetadata.width),
        height: parseInt(googlePhoto.mediaMetadata.height)
      },
      exif: exif,
      originalMetadata: googlePhoto
    });
  }

  static convertFlickrMetadata(flickrPhoto) {
    const exif = ExifNormalizer.normalizeExifData(flickrPhoto.exif);
    
    return createNormalizedPhoto({
      id: flickrPhoto.id,
      title: flickrPhoto.title || 'Untitled',
      description: flickrPhoto.description || '',
      dateTaken: exif.dateTimeOriginal || ExifNormalizer.normalizeDateTime(flickrPhoto.dates?.taken),
      location: flickrPhoto.location ? {
        latitude: parseFloat(flickrPhoto.location.latitude),
        longitude: parseFloat(flickrPhoto.location.longitude),
        name: flickrPhoto.location.locality || flickrPhoto.location.region
      } : null,
      camera: {
        make: exif.cameraMake,
        model: exif.cameraModel
      },
      exposure: {
        aperture: exif.aperture,
        shutterSpeed: exif.shutterSpeed,
        iso: exif.iso
      },
      tags: flickrPhoto.tags?.tag?.map(t => t._content) || [],
      album: flickrPhoto.photoset?.title || null,
      source: 'Flickr',
      originalUrl: flickrPhoto.urls?.url?.find(u => u.type === 'photopage')?._content,
      filename: `${flickrPhoto.id}.jpg`,
      fileSize: null,
      dimensions: {
        width: parseInt(flickrPhoto.sizes?.size?.find(s => s.label === 'Original')?.width),
        height: parseInt(flickrPhoto.sizes?.size?.find(s => s.label === 'Original')?.height)
      },
      exif: exif,
      originalMetadata: flickrPhoto
    });
  }

  static convertInstagramMetadata(instagramPhoto) {
    return createNormalizedPhoto({
      id: instagramPhoto.id,
      title: instagramPhoto.caption || 'Instagram Photo',
      description: instagramPhoto.caption || '',
      dateTaken: ExifNormalizer.normalizeDateTime(instagramPhoto.timestamp),
      location: null, // Instagram Basic API doesn't provide location
      camera: { make: null, model: null },
      exposure: { aperture: null, shutterSpeed: null, iso: null },
      tags: this.extractHashtags(instagramPhoto.caption),
      album: instagramPhoto.media_type === 'CAROUSEL_ALBUM' ? 'Instagram Album' : null,
      source: 'Instagram',
      originalUrl: instagramPhoto.permalink,
      filename: `${instagramPhoto.id}.jpg`,
      fileSize: null,
      dimensions: {
        width: null,
        height: null
      },
      exif: {},
      originalMetadata: instagramPhoto
    });
  }

  static convertFacebookMetadata(facebookPhoto) {
    return createNormalizedPhoto({
      id: facebookPhoto.id,
      title: facebookPhoto.name || 'Facebook Photo',
      description: facebookPhoto.name || '',
      dateTaken: ExifNormalizer.normalizeDateTime(facebookPhoto.created_time),
      location: facebookPhoto.place ? {
        latitude: facebookPhoto.place.location?.latitude,
        longitude: facebookPhoto.place.location?.longitude,
        name: facebookPhoto.place.name
      } : null,
      camera: { make: null, model: null },
      exposure: { aperture: null, shutterSpeed: null, iso: null },
      tags: [],
      album: facebookPhoto.album?.name || null,
      source: 'Facebook',
      originalUrl: facebookPhoto.link,
      filename: `${facebookPhoto.id}.jpg`,
      fileSize: null,
      dimensions: {
        width: facebookPhoto.width,
        height: facebookPhoto.height
      },
      exif: {},
      originalMetadata: facebookPhoto
    });
  }

  static convert500pxMetadata(photo500px) {
    const exif = ExifNormalizer.normalizeExifData(photo500px);
    
    return createNormalizedPhoto({
      id: photo500px.id.toString(),
      title: photo500px.name || 'Untitled',
      description: photo500px.description || '',
      dateTaken: ExifNormalizer.normalizeDateTime(photo500px.created_at),
      location: photo500px.latitude && photo500px.longitude ? {
        latitude: parseFloat(photo500px.latitude),
        longitude: parseFloat(photo500px.longitude),
        name: `${photo500px.city || ''} ${photo500px.country || ''}`.trim()
      } : null,
      camera: {
        make: exif.cameraMake || photo500px.camera,
        model: exif.cameraModel
      },
      exposure: {
        aperture: exif.aperture || photo500px.aperture,
        shutterSpeed: exif.shutterSpeed || photo500px.shutter_speed,
        iso: exif.iso || photo500px.iso
      },
      tags: photo500px.tags || [],
      album: null,
      source: '500px',
      originalUrl: `https://500px.com/photo/${photo500px.id}`,
      filename: `${photo500px.id}.jpg`,
      fileSize: null,
      dimensions: {
        width: photo500px.width,
        height: photo500px.height
      },
      exif: exif,
      originalMetadata: photo500px
    });
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text) {
    if (!text) return [];
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Metadata conflict resolution
   */
  static resolveMetadataConflict(field, value1, value2, source1, source2) {
    // Priority rules: EXIF > Platform-specific > User-generated
    const priorityMap = {
      'exif': 3,
      'Google Photos': 2,
      'Flickr': 2,
      'Facebook': 1,
      'Instagram': 1,
      '500px': 2
    };

    const priority1 = priorityMap[source1] || 0;
    const priority2 = priorityMap[source2] || 0;

    if (priority1 > priority2) return value1;
    if (priority2 > priority1) return value2;

    // If same priority, prefer non-null values
    if (value1 && !value2) return value1;
    if (value2 && !value1) return value2;

    // If both exist, prefer more recent for date fields
    if (field.includes('date') || field.includes('time')) {
      const date1 = new Date(value1);
      const date2 = new Date(value2);
      return date1 > date2 ? value1 : value2;
    }

    // Default to first value
    return value1;
  }

  /**
   * Validate metadata against unified schema
   */
  static validateMetadata(metadata) {
    const errors = [];
    
    for (const [field, expectedType] of Object.entries(this.UNIFIED_SCHEMA)) {
      const value = metadata[field];
      
      if (value !== null && value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== expectedType) {
          errors.push(`Field ${field} should be ${expectedType}, got ${actualType}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Main Data Normalization Pipeline
 */
export class DataNormalizationPipeline {
  
  static async normalizePhoto(photo, source, options = {}) {
    try {
      // 1. Apply platform-specific adapter
      let normalizedPhoto;
      
      switch (source) {
        case 'Google Photos':
          normalizedPhoto = MetadataNormalizer.convertGooglePhotosMetadata(photo);
          break;
        case 'Flickr':
          normalizedPhoto = MetadataNormalizer.convertFlickrMetadata(photo);
          break;
        case 'Instagram':
          normalizedPhoto = MetadataNormalizer.convertInstagramMetadata(photo);
          break;
        case 'Facebook':
          normalizedPhoto = MetadataNormalizer.convertFacebookMetadata(photo);
          break;
        case '500px':
          normalizedPhoto = MetadataNormalizer.convert500pxMetadata(photo);
          break;
        default:
          throw new Error(`Unsupported source: ${source}`);
      }

      // 2. Validate metadata
      const validation = MetadataNormalizer.validateMetadata(normalizedPhoto);
      if (!validation.isValid) {
        console.warn('Metadata validation warnings:', validation.errors);
      }

      // 3. Generate standardized filename
      if (options.generateFilename) {
        normalizedPhoto.filename = FileNameNormalizer.generateFileName(
          normalizedPhoto,
          options.filenameOptions
        );
      }

      // 4. Enhance metadata (could include reverse geocoding, etc.)
      if (options.enhance) {
        normalizedPhoto = await this.enhanceMetadata(normalizedPhoto);
      }

      return normalizedPhoto;
    } catch (error) {
      console.error('Failed to normalize photo metadata:', error);
      throw error;
    }
  }

  /**
   * Enhance metadata with additional information
   */
  static async enhanceMetadata(photo) {
    // Placeholder for enhancements like reverse geocoding
    // Could integrate with services like OpenStreetMap Nominatim
    
    if (photo.location && !photo.location.name) {
      // TODO: Implement reverse geocoding
      // photo.location.name = await reverseGeocode(photo.location.latitude, photo.location.longitude);
    }

    return photo;
  }

  /**
   * Batch normalize multiple photos
   */
  static async normalizePhotoBatch(photos, source, options = {}) {
    const results = [];
    const errors = [];

    for (let i = 0; i < photos.length; i++) {
      try {
        const normalized = await this.normalizePhoto(photos[i], source, {
          ...options,
          filenameOptions: {
            ...options.filenameOptions,
            sequenceNumber: i + 1
          }
        });
        results.push(normalized);
      } catch (error) {
        errors.push({ index: i, error: error.message, photo: photos[i] });
      }
    }

    return {
      normalized: results,
      errors,
      successCount: results.length,
      errorCount: errors.length
    };
  }
}

export default {
  ExifNormalizer,
  FileNameNormalizer,
  MetadataNormalizer,
  DataNormalizationPipeline
}; 