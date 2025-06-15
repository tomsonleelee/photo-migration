// 支援的平台
export const PLATFORMS = {
  GOOGLE_PHOTOS: 'google_photos',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  FLICKR: 'flickr',
  FIVEHUNDREDPX: '500px',
};

// 平台顯示名稱
export const PLATFORM_NAMES = {
  [PLATFORMS.GOOGLE_PHOTOS]: 'Google Photos',
  [PLATFORMS.FACEBOOK]: 'Facebook',
  [PLATFORMS.INSTAGRAM]: 'Instagram',
  [PLATFORMS.FLICKR]: 'Flickr',
  [PLATFORMS.FIVEHUNDREDPX]: '500px',
};

// 遷移狀態
export const MIGRATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

// 圖片品質選項
export const IMAGE_QUALITY = {
  ORIGINAL: 'original',
  HIGH: 'high',
  STANDARD: 'standard',
};

// 重複檔案處理方式
export const DUPLICATE_HANDLING = {
  SKIP: 'skip',
  OVERWRITE: 'overwrite',
  RENAME: 'rename',
};

// API 端點
export const API_ENDPOINTS = {
  AUTH: '/auth',
  PLATFORMS: '/platforms',
  ALBUMS: '/albums',
  MIGRATION: '/migration',
  PROGRESS: '/progress',
}; 