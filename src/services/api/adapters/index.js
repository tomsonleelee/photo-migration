// Platform API Adapters
export { GooglePhotosAdapter } from './GooglePhotosAdapter.js';
export { FlickrAdapter } from './FlickrAdapter.js';
export { InstagramAdapter } from './InstagramAdapter.js';
export { FacebookAdapter } from './FacebookAdapter.js';
export { FiveHundredPxAdapter } from './FiveHundredPxAdapter.js';

// Adapter registry for dynamic loading
export const ADAPTER_REGISTRY = {
  'google-photos': () => import('./GooglePhotosAdapter.js').then(m => m.GooglePhotosAdapter),
  'flickr': () => import('./FlickrAdapter.js').then(m => m.FlickrAdapter),
  'instagram': () => import('./InstagramAdapter.js').then(m => m.InstagramAdapter),
  'facebook': () => import('./FacebookAdapter.js').then(m => m.FacebookAdapter),
  '500px': () => import('./FiveHundredPxAdapter.js').then(m => m.FiveHundredPxAdapter)
};

/**
 * Get adapter class for a platform
 * @param {string} platform - Platform identifier
 * @returns {Promise<Class>} Adapter class
 */
export async function getAdapterClass(platform) {
  const loader = ADAPTER_REGISTRY[platform];
  if (!loader) {
    throw new Error(`No adapter found for platform: ${platform}`);
  }
  return await loader();
}

/**
 * Get all available platform identifiers
 * @returns {string[]} Array of platform identifiers
 */
export function getAvailablePlatforms() {
  return Object.keys(ADAPTER_REGISTRY);
} 