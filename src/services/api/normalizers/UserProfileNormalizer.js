/**
 * User Profile Data Normalizer
 * Handles normalization of user profile data from different platforms
 */

import { Platform } from '../types.js';
import { Logger } from '../utils/index.js';

/**
 * Create normalized user profile object
 * @param {Object} params - User profile parameters
 * @returns {Object} Normalized user profile
 */
export const createNormalizedUserProfile = ({
  id,
  platformId,
  username = '',
  displayName = '',
  email = '',
  profilePictureUrl = null,
  coverPhotoUrl = null,
  bio = '',
  location = null,
  website = null,
  isVerified = false,
  followerCount = 0,
  followingCount = 0,
  photoCount = 0,
  createdAt = null,
  metadata = {}
}) => ({
  id,
  platformId,
  username,
  displayName,
  email,
  profilePictureUrl,
  coverPhotoUrl,
  bio,
  location,
  website,
  isVerified,
  followerCount: Number(followerCount),
  followingCount: Number(followingCount),
  photoCount: Number(photoCount),
  createdAt: createdAt ? (createdAt instanceof Date ? createdAt : new Date(createdAt)) : null,
  metadata: {
    ...metadata,
    originalData: metadata.originalData || null
  }
});

export class UserProfileNormalizer {
  constructor() {
    this.logger = Logger.getLogger('UserProfileNormalizer');
  }

  /**
   * Normalize user profile data from any platform to standard format
   * @param {Object} rawData - Raw user profile data from platform API
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized user profile object
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
      this.logger.error('User profile normalization failed', { 
        error: error.message, 
        platform, 
        rawData 
      });
      throw error;
    }
  }

  /**
   * Normalize Google Photos user profile
   * @param {Object} profile - Google Photos user profile data
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalizeGooglePhotos(profile) {
    return createNormalizedUserProfile({
      id: profile.id || profile.sub || 'unknown',
      platformId: profile.id || profile.sub || 'unknown',
      username: profile.email?.split('@')[0] || '',
      displayName: profile.name || profile.given_name || 'Google Photos User',
      email: profile.email || '',
      profilePictureUrl: profile.picture || null,
      coverPhotoUrl: null, // Google Photos doesn't provide cover photos
      bio: '',
      location: profile.locale ? this._parseGoogleLocation(profile.locale) : null,
      website: null,
      isVerified: profile.email_verified || false,
      followerCount: 0, // Not available
      followingCount: 0, // Not available
      photoCount: 0, // Would need separate API call
      createdAt: null, // Not provided
      metadata: {
        platform: Platform.GOOGLE_PHOTOS,
        locale: profile.locale,
        familyName: profile.family_name,
        givenName: profile.given_name,
        originalData: profile
      }
    });
  }

  /**
   * Normalize Facebook user profile
   * @param {Object} profile - Facebook user profile data
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalizeFacebook(profile) {
    return createNormalizedUserProfile({
      id: profile.id,
      platformId: profile.id,
      username: profile.username || profile.id,
      displayName: profile.name || '',
      email: profile.email || '',
      profilePictureUrl: profile.picture?.data?.url || null,
      coverPhotoUrl: profile.cover?.source || null,
      bio: profile.bio || profile.about || '',
      location: profile.location?.name || profile.hometown?.name || null,
      website: profile.website || profile.link || null,
      isVerified: profile.verified || false,
      followerCount: 0, // Not available in basic profile
      followingCount: 0, // Not available in basic profile
      photoCount: 0, // Would need separate API call
      createdAt: null, // Not provided in basic profile
      metadata: {
        platform: Platform.FACEBOOK,
        birthday: profile.birthday,
        gender: profile.gender,
        ageRange: profile.age_range,
        timezone: profile.timezone,
        originalData: profile
      }
    });
  }

  /**
   * Normalize Instagram user profile
   * @param {Object} profile - Instagram user profile data
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalizeInstagram(profile) {
    return createNormalizedUserProfile({
      id: profile.id,
      platformId: profile.id,
      username: profile.username || '',
      displayName: profile.username || '', // Instagram Basic Display doesn't provide display name
      email: '', // Not available in Basic Display API
      profilePictureUrl: null, // Not available in Basic Display API
      coverPhotoUrl: null,
      bio: '', // Not available in Basic Display API
      location: null,
      website: null,
      isVerified: false, // Not available in Basic Display API
      followerCount: 0, // Not available in Basic Display API
      followingCount: 0, // Not available in Basic Display API
      photoCount: profile.media_count || 0,
      createdAt: null,
      metadata: {
        platform: Platform.INSTAGRAM,
        accountType: profile.account_type,
        originalData: profile
      }
    });
  }

  /**
   * Normalize Flickr user profile
   * @param {Object} profile - Flickr user profile data
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalizeFlickr(profile) {
    const person = profile.person || profile;
    
    return createNormalizedUserProfile({
      id: person.id || person.nsid,
      platformId: person.id || person.nsid,
      username: person.username?._content || person.username || '',
      displayName: person.realname?._content || person.realname || person.username?._content || '',
      email: '', // Not provided by Flickr API
      profilePictureUrl: this._buildFlickrBuddyIconUrl(person),
      coverPhotoUrl: null,
      bio: person.description?._content || person.description || '',
      location: person.location?._content || person.location || null,
      website: person.photosurl?._content || person.photosurl || null,
      isVerified: person.ispro === 1,
      followerCount: 0, // Not easily available
      followingCount: 0, // Not easily available
      photoCount: parseInt(person.photos?.count?._content) || 0,
      createdAt: this._parseDate(person.photos?.firstdate?._content || person.photos?.firstdatetaken?._content),
      metadata: {
        platform: Platform.FLICKR,
        isPro: person.ispro === 1,
        iconServer: person.iconserver,
        iconFarm: person.iconfarm,
        path_alias: person.path_alias,
        originalData: profile
      }
    });
  }

  /**
   * Normalize 500px user profile
   * @param {Object} profile - 500px user profile data
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalize500px(profile) {
    const user = profile.user || profile;
    
    return createNormalizedUserProfile({
      id: user.id?.toString() || '',
      platformId: user.id?.toString() || '',
      username: user.username || '',
      displayName: user.fullname || user.firstname + ' ' + user.lastname || user.username || '',
      email: user.email || '',
      profilePictureUrl: user.userpic_url || user.avatar_url || null,
      coverPhotoUrl: user.cover_url || null,
      bio: user.about || '',
      location: user.city || null,
      website: user.domain || null,
      isVerified: user.upgrade_status > 0,
      followerCount: user.followers_count || 0,
      followingCount: user.friends_count || 0,
      photoCount: user.photos_count || 0,
      createdAt: this._parseDate(user.registration_date),
      metadata: {
        platform: Platform.FIVEHUNDREDPX,
        upgradeStatus: user.upgrade_status,
        country: user.country,
        birthday: user.birthday,
        sex: user.sex,
        originalData: profile
      }
    });
  }

  /**
   * Generic normalization for unknown platforms
   * @param {Object} data - Raw user profile data
   * @param {string} platform - Platform identifier
   * @returns {Object} Normalized user profile
   * @private
   */
  _normalizeGeneric(data, platform) {
    return createNormalizedUserProfile({
      id: data.id || data._id || data.user_id || '',
      platformId: data.id || data._id || data.user_id || '',
      username: data.username || data.handle || data.login || '',
      displayName: data.display_name || data.name || data.full_name || data.username || '',
      email: data.email || '',
      profilePictureUrl: data.profile_picture || data.avatar || data.profile_image || null,
      coverPhotoUrl: data.cover_photo || data.banner || null,
      bio: data.bio || data.description || data.about || '',
      location: data.location || data.city || null,
      website: data.website || data.url || null,
      isVerified: data.verified || data.is_verified || false,
      followerCount: this._parseNumber(data.followers_count || data.followers),
      followingCount: this._parseNumber(data.following_count || data.following),
      photoCount: this._parseNumber(data.photos_count || data.media_count),
      createdAt: this._parseDate(data.created_at || data.joined_at),
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
   * Parse Google locale to location
   * @param {string} locale - Google locale string
   * @returns {string|null} Location string
   * @private
   */
  _parseGoogleLocation(locale) {
    if (!locale) return null;
    
    // Convert locale like 'en-US' to 'United States'
    const localeMap = {
      'en-US': 'United States',
      'en-GB': 'United Kingdom',
      'en-CA': 'Canada',
      'fr-FR': 'France',
      'de-DE': 'Germany',
      'es-ES': 'Spain',
      'it-IT': 'Italy',
      'ja-JP': 'Japan',
      'ko-KR': 'South Korea',
      'zh-CN': 'China',
      'zh-TW': 'Taiwan'
    };
    
    return localeMap[locale] || locale.split('-')[1] || null;
  }

  /**
   * Build Flickr buddy icon URL
   * @param {Object} person - Flickr person data
   * @returns {string|null} Buddy icon URL
   * @private
   */
  _buildFlickrBuddyIconUrl(person) {
    if (!person.iconserver || person.iconserver === '0') {
      return 'https://www.flickr.com/images/buddyicon.gif'; // Default icon
    }
    
    const farm = person.iconfarm || 1;
    const server = person.iconserver;
    const nsid = person.id || person.nsid;
    
    return `https://farm${farm}.staticflickr.com/${server}/buddyicons/${nsid}.jpg`;
  }
}

// Export singleton instance
export const userProfileNormalizer = new UserProfileNormalizer();
export default UserProfileNormalizer; 