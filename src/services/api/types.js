/**
 * API Integration Layer Type Definitions
 */

// Platform enumeration
export const Platform = {
  GOOGLE_PHOTOS: 'google_photos',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  FLICKR: 'flickr',
  FIVEHUNDREDPX: '500px'
};

// API Error Types
export class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class RateLimitError extends ApiError {
  constructor(message, retryAfter = 60) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Normalized Photo Interface
export const createNormalizedPhoto = ({
  id,
  platformId,
  url,
  thumbnailUrl,
  title = '',
  description = '',
  dateTaken,
  createdAt,
  updatedAt = null,
  width = 0,
  height = 0,
  fileSize = 0,
  mimeType = '',
  tags = [],
  location = null,
  camera = null,
  exposure = null,
  album = null,
  source = null,
  originalUrl = null,
  filename = null,
  dimensions = null,
  exif = null,
  originalMetadata = null
}) => ({
  id,
  platformId,
  url,
  thumbnailUrl,
  title,
  description,
  dateTaken: dateTaken ? (dateTaken instanceof Date ? dateTaken : new Date(dateTaken)) : null,
  createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
  updatedAt: updatedAt ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)) : null,
  width: Number(width),
  height: Number(height),
  fileSize: Number(fileSize),
  mimeType,
  tags: Array.isArray(tags) ? tags : [],
  location,
  camera,
  exposure,
  album,
  source,
  originalUrl,
  filename,
  dimensions,
  exif,
  originalMetadata
});

// Fetch Parameters Interface
export const createFetchParams = ({
  pageSize = 50,
  pageToken = null,
  dateFilter = null,
  albumId = null,
  includeArchived = false
}) => ({
  pageSize: Math.min(Math.max(pageSize, 1), 100), // Limit between 1-100
  pageToken,
  dateFilter,
  albumId,
  includeArchived
});

// Upload Result Interface
export const createUploadResult = ({
  success,
  photoId = null,
  url = null,
  error = null
}) => ({
  success,
  photoId,
  url,
  error
});

// Migration Progress Interface
export const createMigrationProgress = ({
  total = 0,
  completed = 0,
  failed = 0,
  currentPhoto = null,
  status = 'idle', // idle, running, paused, completed, failed
  startedAt = null,
  completedAt = null,
  errors = []
}) => ({
  total,
  completed,
  failed,
  currentPhoto,
  status,
  startedAt,
  completedAt,
  errors: Array.isArray(errors) ? errors : [],
  get percentage() {
    return this.total > 0 ? Math.round((this.completed / this.total) * 100) : 0;
  }
});

// API Response Wrapper
export const createApiResponse = ({
  data = null,
  nextPageToken = null,
  hasNextPage = false,
  totalCount = null,
  rateLimit = null
}) => ({
  data,
  nextPageToken,
  hasNextPage,
  totalCount,
  rateLimit
}); 