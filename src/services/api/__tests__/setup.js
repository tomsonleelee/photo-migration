/**
 * Test Setup and Configuration
 * Provides common test utilities, mocks, and fixtures for API Integration Layer tests
 */

import { jest } from '@jest/globals';

// Test configuration
export const TEST_CONFIG = {
  timeout: 30000, // 30 seconds for integration tests
  mockApiResponses: true,
  enableRateLimiting: false, // Disable rate limiting in tests
  logLevel: 'ERROR' // Reduce log noise during tests
};

/**
 * Mock API Response Data
 */
export const MOCK_API_RESPONSES = {
  googlePhotos: {
    mediaItems: [
      {
        id: 'google-photo-1',
        filename: 'DSC_001.jpg',
        description: 'Test photo from Google Photos',
        productUrl: 'https://photos.google.com/share/item1',
        mediaMetadata: {
          creationTime: '2023-06-15T10:30:00Z',
          width: '4000',
          height: '3000',
          cameraMake: 'Canon',
          cameraModel: 'EOS 5D Mark IV',
          aperture: '2.8',
          shutterSpeed: '1/250',
          iso: '400',
          latitude: '40.7128',
          longitude: '-74.0060'
        }
      },
      {
        id: 'google-photo-2',
        filename: 'IMG_002.jpg',
        description: 'Another test photo',
        productUrl: 'https://photos.google.com/share/item2',
        mediaMetadata: {
          creationTime: '2023-06-15T14:45:00Z',
          width: '3000',
          height: '4000'
        }
      }
    ]
  },

  flickr: {
    photos: {
      photo: [
        {
          id: 'flickr-photo-1',
          title: 'Beautiful Sunset',
          description: 'Test photo from Flickr',
          dates: {
            taken: '2023-06-15 10:30:00'
          },
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            locality: 'New York',
            region: 'NY'
          },
          tags: {
            tag: [
              { _content: 'sunset' },
              { _content: 'nature' },
              { _content: 'photography' }
            ]
          },
          urls: {
            url: [
              { type: 'photopage', _content: 'https://flickr.com/photos/user/12345' }
            ]
          },
          sizes: {
            size: [
              { label: 'Original', width: 4000, height: 3000 }
            ]
          },
          exif: {
            cameraMake: 'Nikon',
            cameraModel: 'D850',
            aperture: '5.6',
            iso: '200'
          }
        }
      ]
    }
  },

  instagram: {
    data: [
      {
        id: 'instagram-photo-1',
        caption: 'Amazing day! #photography #travel #sunset',
        media_type: 'IMAGE',
        media_url: 'https://instagram.com/media/12345.jpg',
        permalink: 'https://instagram.com/p/12345',
        timestamp: '2023-06-15T10:30:00+0000'
      },
      {
        id: 'instagram-photo-2',
        caption: 'Carousel post with multiple photos #album',
        media_type: 'CAROUSEL_ALBUM',
        permalink: 'https://instagram.com/p/67890',
        timestamp: '2023-06-15T14:45:00+0000'
      }
    ]
  },

  facebook: {
    data: [
      {
        id: 'facebook-photo-1',
        name: 'Family vacation photo',
        created_time: '2023-06-15T10:30:00+0000',
        link: 'https://facebook.com/photo/12345',
        width: 1920,
        height: 1080,
        place: {
          name: 'Central Park, New York',
          location: {
            latitude: 40.7829,
            longitude: -73.9654
          }
        },
        album: {
          name: 'Summer Vacation 2023'
        }
      }
    ]
  },

  fiveHundredPx: {
    photos: [
      {
        id: 12345,
        name: 'Urban Photography',
        description: 'Street photography in downtown',
        created_at: '2023-06-15T10:30:00Z',
        camera: 'Sony α7R IV',
        aperture: '2.8',
        shutter_speed: '1/125',
        iso: 800,
        width: 4000,
        height: 2667,
        latitude: 40.7589,
        longitude: -73.9851,
        city: 'New York',
        country: 'United States',
        tags: ['street', 'urban', 'photography', 'city']
      }
    ]
  }
};

/**
 * Mock Error Responses
 */
export const MOCK_ERROR_RESPONSES = {
  rateLimitError: {
    error: {
      code: 403,
      message: 'Rate limit exceeded',
      details: 'Too many requests'
    }
  },
  authError: {
    error: {
      code: 401,
      message: 'Invalid credentials',
      details: 'Token expired or invalid'
    }
  },
  notFoundError: {
    error: {
      code: 404,
      message: 'Resource not found',
      details: 'The requested photo does not exist'
    }
  },
  networkError: {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed'
  }
};

/**
 * Test Data Factories
 */
export class TestDataFactory {
  
  static createMockPhoto(platform = 'Google Photos', overrides = {}) {
    const basePhoto = {
      id: `test-photo-${Date.now()}`,
      originalId: `original-${Date.now()}`,
      platform: platform,
      title: 'Test Photo',
      description: 'A test photo for unit testing',
      dateTaken: new Date().toISOString(),
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'New York City'
      },
      camera: {
        make: 'Canon',
        model: 'EOS 5D Mark IV'
      },
      exposure: {
        aperture: 2.8,
        shutterSpeed: '1/250',
        iso: 400
      },
      tags: ['test', 'photography'],
      album: 'Test Album',
      source: platform,
      filename: 'test-photo.jpg',
      fileSize: 2048000,
      dimensions: {
        width: 4000,
        height: 3000
      }
    };

    return { ...basePhoto, ...overrides };
  }

  static createMockApiResponse(platform, count = 5) {
    const photos = [];
    for (let i = 0; i < count; i++) {
      photos.push(this.createMockPhoto(platform, {
        id: `${platform.toLowerCase()}-photo-${i + 1}`,
        title: `Test Photo ${i + 1}`
      }));
    }
    return photos;
  }

  static createMockAuthTokens(platform) {
    const baseTokens = {
      accessToken: `mock-access-token-${platform.toLowerCase()}`,
      refreshToken: `mock-refresh-token-${platform.toLowerCase()}`,
      expiresIn: 3600,
      expiresAt: Date.now() + 3600000
    };

    // Platform-specific token formats
    switch (platform) {
      case 'Google Photos':
        return {
          ...baseTokens,
          scope: 'https://www.googleapis.com/auth/photoslibrary'
        };
      case 'Facebook':
        return {
          ...baseTokens,
          scope: 'user_photos'
        };
      case 'Instagram':
        return {
          ...baseTokens,
          scope: 'user_profile,user_media'
        };
      case 'Flickr':
        return {
          oauthToken: baseTokens.accessToken,
          oauthTokenSecret: 'mock-token-secret',
          oauthVerifier: 'mock-verifier'
        };
      case '500px':
        return {
          oauthToken: baseTokens.accessToken,
          oauthTokenSecret: 'mock-token-secret'
        };
      default:
        return baseTokens;
    }
  }
}

/**
 * Mock HTTP Client
 */
export class MockHttpClient {
  constructor() {
    this.requests = [];
    this.responses = new Map();
    this.defaultResponse = { data: [] };
  }

  // Record all requests for verification
  async request(config) {
    this.requests.push({
      ...config,
      timestamp: Date.now()
    });

    // Return mocked response based on URL pattern
    const response = this.getResponseForUrl(config.url) || this.defaultResponse;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return response;
  }

  // Set mock response for specific URL pattern
  setResponse(urlPattern, response) {
    this.responses.set(urlPattern, response);
  }

  // Get response for URL
  getResponseForUrl(url) {
    for (const [pattern, response] of this.responses) {
      if (url.includes(pattern)) {
        return response;
      }
    }
    return null;
  }

  // Get recorded requests
  getRequests() {
    return [...this.requests];
  }

  // Clear recorded requests
  clearRequests() {
    this.requests = [];
  }

  // Reset all mocks
  reset() {
    this.requests = [];
    this.responses.clear();
  }
}

/**
 * Test Utilities
 */
export class TestUtils {
  
  static async waitFor(condition, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static createMockLogger() {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logActivity: jest.fn(),
      logPerformance: jest.fn(),
      logRateLimit: jest.fn(),
      logAuthentication: jest.fn()
    };
  }

  static createMockRateLimiter() {
    return {
      execute: jest.fn().mockImplementation(async (fn) => await fn()),
      getStatus: jest.fn().mockReturnValue({
        isActive: true,
        remaining: 1000,
        resetTime: Date.now() + 3600000
      }),
      pause: jest.fn(),
      resume: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        totalRequests: 10,
        successfulRequests: 9,
        failedRequests: 1
      })
    };
  }

  static createMockCache() {
    const storage = new Map();
    return {
      get: jest.fn().mockImplementation(key => storage.get(key)),
      set: jest.fn().mockImplementation((key, value) => storage.set(key, value)),
      delete: jest.fn().mockImplementation(key => storage.delete(key)),
      clear: jest.fn().mockImplementation(() => storage.clear()),
      has: jest.fn().mockImplementation(key => storage.has(key)),
      getStats: jest.fn().mockReturnValue({
        size: storage.size,
        hits: 0,
        misses: 0,
        hitRate: 0
      })
    };
  }

  static assertNormalizedPhoto(photo) {
    expect(photo).toHaveProperty('id');
    expect(photo).toHaveProperty('title');
    expect(photo).toHaveProperty('dateTaken');
    expect(photo).toHaveProperty('source');
    expect(photo).toHaveProperty('filename');
    
    if (photo.location) {
      expect(photo.location).toHaveProperty('latitude');
      expect(photo.location).toHaveProperty('longitude');
    }
    
    if (photo.camera) {
      expect(photo.camera).toHaveProperty('make');
      expect(photo.camera).toHaveProperty('model');
    }
    
    if (photo.exposure) {
      expect(photo.exposure).toHaveProperty('aperture');
      expect(photo.exposure).toHaveProperty('shutterSpeed');
      expect(photo.exposure).toHaveProperty('iso');
    }
  }

  static assertApiError(error, expectedType = 'ApiError') {
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(expectedType);
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('platform');
  }

  static generateLargePhotoSet(count = 1000) {
    const photos = [];
    for (let i = 0; i < count; i++) {
      photos.push(TestDataFactory.createMockPhoto('Google Photos', {
        id: `large-set-photo-${i}`,
        title: `Batch Photo ${i}`,
        dateTaken: new Date(Date.now() - (i * 86400000)).toISOString() // One day apart
      }));
    }
    return photos;
  }
}

/**
 * Global Test Setup
 */
export function setupTests() {
  // Mock console methods to reduce noise
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.API_RATE_LIMIT_ENABLED = 'false';
  process.env.API_CACHE_ENABLED = 'true';
  process.env.LOG_LEVEL = 'ERROR';

  // Global test timeout
  jest.setTimeout(TEST_CONFIG.timeout);
}

/**
 * Test Cleanup
 */
export function teardownTests() {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset environment
  delete process.env.NODE_ENV;
  delete process.env.API_RATE_LIMIT_ENABLED;
  delete process.env.API_CACHE_ENABLED;
  delete process.env.LOG_LEVEL;
}

// Auto-setup when imported
setupTests();

export default {
  TEST_CONFIG,
  MOCK_API_RESPONSES,
  MOCK_ERROR_RESPONSES,
  TestDataFactory,
  MockHttpClient,
  TestUtils,
  setupTests,
  teardownTests
};

// Basic test to ensure the setup file is working
describe('Test Setup', () => {
  test('should export required test utilities', () => {
    expect(TEST_CONFIG).toBeDefined();
    expect(MOCK_API_RESPONSES).toBeDefined();
    expect(TestDataFactory).toBeDefined();
    expect(MockHttpClient).toBeDefined();
    expect(TestUtils).toBeDefined();
    expect(setupTests).toBeDefined();
    expect(teardownTests).toBeDefined();
  });

  test('should create mock photo data', () => {
    const mockPhoto = TestDataFactory.createMockPhoto();
    expect(mockPhoto).toBeDefined();
    expect(mockPhoto.platform).toBeDefined();
    expect(mockPhoto.originalId).toBeDefined();
  });

  test('should create mock HTTP client', () => {
    const httpClient = new MockHttpClient();
    expect(httpClient).toBeDefined();
    expect(typeof httpClient.request).toBe('function');
  });
}); 