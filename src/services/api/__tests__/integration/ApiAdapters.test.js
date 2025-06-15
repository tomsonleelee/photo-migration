/**
 * Integration Tests for API Adapters
 * Tests the complete integration between adapters, rate limiting, caching, and data normalization
 */

import { jest } from '@jest/globals';
import { ApiAdapterFactory } from '../../factories/ApiAdapterFactory.js';
import { PhotoApiService } from '../../PhotoApiService.js';
import { TestDataFactory, TestUtils, MockHttpClient, MOCK_API_RESPONSES } from '../setup.js';

describe('API Adapters Integration', () => {
  let mockHttpClient;
  let apiService;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    
    // Initialize API service with test configuration
    apiService = new PhotoApiService({
      rateLimitConfig: {
        enableGlobalLimit: false, // Disable for tests
        enablePlatformLimits: false
      },
      cacheConfig: {
        enableMetrics: true,
        defaultTTL: 1000 // Short TTL for tests
      },
      logger: TestUtils.createMockLogger()
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
    jest.clearAllMocks();
  });

  describe('Google Photos Adapter Integration', () => {
    let adapter;

    beforeEach(async () => {
      adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      // Mock API response
      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: MOCK_API_RESPONSES.googlePhotos }
      );
    });

    test('should fetch and normalize photos', async () => {
      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      
      const result = await adapter.fetchPhotos({
        accessToken: mockTokens.accessToken,
        limit: 10
      });

      expect(result.photos).toHaveLength(2);
      result.photos.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
        expect(photo.source).toBe('Google Photos');
      });

      // Verify HTTP request was made
      const requests = mockHttpClient.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toContain('photoslibrary.googleapis.com');
    });

    test('should handle rate limiting', async () => {
      const mockRateLimiter = TestUtils.createMockRateLimiter();
      adapter.rateLimiter = mockRateLimiter;

      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      
      await adapter.fetchPhotos({
        accessToken: mockTokens.accessToken
      });

      expect(mockRateLimiter.execute).toHaveBeenCalled();
    });

    test('should use caching for repeated requests', async () => {
      const mockCache = TestUtils.createMockCache();
      adapter.cache = mockCache;

      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      const params = {
        accessToken: mockTokens.accessToken,
        limit: 10
      };

      // First request
      await adapter.fetchPhotos(params);
      
      // Second request with same parameters
      await adapter.fetchPhotos(params);

      // Should check cache twice (once for get, once for set)
      expect(mockCache.get).toHaveBeenCalledTimes(2);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
    });

    test('should handle authentication errors', async () => {
      mockHttpClient.setResponse('photoslibrary.googleapis.com', {
        error: {
          code: 401,
          message: 'Invalid credentials'
        }
      });

      const invalidTokens = { accessToken: 'invalid-token' };

      await expect(adapter.fetchPhotos(invalidTokens)).rejects.toThrow();
    });
  });

  describe('Multi-Platform Integration', () => {
    test('should handle multiple platform adapters simultaneously', async () => {
      // Create adapters for different platforms
      const googleAdapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      const flickrAdapter = await ApiAdapterFactory.createAdapter('Flickr', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      // Mock responses for both platforms
      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: MOCK_API_RESPONSES.googlePhotos }
      );
      mockHttpClient.setResponse(
        'flickr.com',
        { data: MOCK_API_RESPONSES.flickr }
      );

      // Fetch from both platforms simultaneously
      const [googleResult, flickrResult] = await Promise.all([
        googleAdapter.fetchPhotos({
          accessToken: TestDataFactory.createMockAuthTokens('Google Photos').accessToken
        }),
        flickrAdapter.fetchPhotos({
          oauthToken: TestDataFactory.createMockAuthTokens('Flickr').oauthToken,
          oauthTokenSecret: TestDataFactory.createMockAuthTokens('Flickr').oauthTokenSecret
        })
      ]);

      // Verify both results
      expect(googleResult.photos[0].source).toBe('Google Photos');
      expect(flickrResult.photos[0].source).toBe('Flickr');

      // Verify both made HTTP requests
      const requests = mockHttpClient.getRequests();
      expect(requests).toHaveLength(2);
    });

    test('should normalize data consistently across platforms', async () => {
      const platforms = ['Google Photos', 'Flickr', 'Instagram', 'Facebook', '500px'];
      const results = [];

      for (const platform of platforms) {
        const adapter = await ApiAdapterFactory.createAdapter(platform, {
          httpClient: mockHttpClient,
          rateLimiter: TestUtils.createMockRateLimiter(),
          cache: TestUtils.createMockCache(),
          logger: TestUtils.createMockLogger()
        });

        // Mock platform-specific response
        const platformKey = platform.toLowerCase().replace(/\s+/g, '');
        const mockResponse = MOCK_API_RESPONSES[platformKey] || MOCK_API_RESPONSES.googlePhotos;
        
        mockHttpClient.setResponse(
          platform.toLowerCase(),
          { data: mockResponse }
        );

        const mockTokens = TestDataFactory.createMockAuthTokens(platform);
        const result = await adapter.fetchPhotos(mockTokens);
        results.push(result.photos[0]);
      }

      // Verify all photos have consistent normalized structure
      results.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
        expect(photo).toHaveProperty('id');
        expect(photo).toHaveProperty('title');
        expect(photo).toHaveProperty('source');
        expect(photo).toHaveProperty('dateTaken');
      });

      // Verify sources are different
      const sources = results.map(photo => photo.source);
      expect(new Set(sources).size).toBe(platforms.length);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      // Simulate network error
      mockHttpClient.setResponse('photoslibrary.googleapis.com', null);
      jest.spyOn(mockHttpClient, 'request').mockRejectedValue(new Error('Network error'));

      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');

      await expect(adapter.fetchPhotos(mockTokens)).rejects.toThrow('Network error');
    });

    test('should retry failed requests', async () => {
      const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      // Mock retry logic - fail first two attempts, succeed on third
      let callCount = 0;
      jest.spyOn(mockHttpClient, 'request').mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary error');
        }
        return { data: MOCK_API_RESPONSES.googlePhotos };
      });

      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Should eventually succeed after retries
      const result = await adapter.fetchPhotos(mockTokens);
      expect(result.photos).toHaveLength(2);
      expect(callCount).toBe(3); // Two failures + one success
    });
  });

  describe('Performance Integration', () => {
    test('should handle large batch operations efficiently', async () => {
      const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: TestUtils.createMockCache(),
        logger: TestUtils.createMockLogger()
      });

      // Generate large mock response
      const largeResponse = {
        mediaItems: TestUtils.generateLargePhotoSet(100).map(photo => ({
          id: photo.id,
          filename: photo.filename,
          mediaMetadata: {
            creationTime: photo.dateTaken,
            width: photo.dimensions.width.toString(),
            height: photo.dimensions.height.toString()
          }
        }))
      };

      mockHttpClient.setResponse('photoslibrary.googleapis.com', { data: largeResponse });

      const startTime = Date.now();
      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      
      const result = await adapter.fetchPhotos({
        ...mockTokens,
        limit: 100
      });

      const duration = Date.now() - startTime;

      expect(result.photos).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all photos are properly normalized
      result.photos.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
      });
    });

    test('should cache responses for improved performance', async () => {
      const mockCache = TestUtils.createMockCache();
      const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
        httpClient: mockHttpClient,
        rateLimiter: TestUtils.createMockRateLimiter(),
        cache: mockCache,
        logger: TestUtils.createMockLogger()
      });

      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: MOCK_API_RESPONSES.googlePhotos }
      );

      const mockTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      const params = { ...mockTokens, limit: 10 };

      // First request - should hit the API
      const firstResult = await adapter.fetchPhotos(params);
      expect(mockCache.set).toHaveBeenCalledTimes(1);

      // Mock cache hit for second request
      mockCache.get.mockReturnValueOnce(firstResult);

      // Second request - should use cache
      const secondResult = await adapter.fetchPhotos(params);
      
      expect(mockCache.get).toHaveBeenCalledTimes(2); // Once for first, once for second
      expect(secondResult).toEqual(firstResult);
    });
  });

  describe('PhotoApiService Integration', () => {
    test('should provide unified interface for multiple platforms', async () => {
      // Mock responses for multiple platforms
      mockHttpClient.setResponse('google', { data: MOCK_API_RESPONSES.googlePhotos });
      mockHttpClient.setResponse('flickr', { data: MOCK_API_RESPONSES.flickr });

      const googleTokens = TestDataFactory.createMockAuthTokens('Google Photos');
      const flickrTokens = TestDataFactory.createMockAuthTokens('Flickr');

      // Fetch from multiple platforms through unified service
      const results = await apiService.fetchPhotosFromMultiplePlatforms([
        { platform: 'Google Photos', credentials: googleTokens },
        { platform: 'Flickr', credentials: flickrTokens }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].platform).toBe('Google Photos');
      expect(results[1].platform).toBe('Flickr');

      // Verify all photos are normalized consistently
      results.forEach(platformResult => {
        platformResult.photos.forEach(photo => {
          TestUtils.assertNormalizedPhoto(photo);
        });
      });
    });

    test('should handle partial failures gracefully', async () => {
      // Mock success for Google Photos, failure for Flickr
      mockHttpClient.setResponse('google', { data: MOCK_API_RESPONSES.googlePhotos });
      mockHttpClient.setResponse('flickr', null);
      
      jest.spyOn(mockHttpClient, 'request').mockImplementation(async (config) => {
        if (config.url.includes('flickr')) {
          throw new Error('Flickr API error');
        }
        return mockHttpClient.getResponseForUrl(config.url);
      });

      const results = await apiService.fetchPhotosFromMultiplePlatforms([
        { 
          platform: 'Google Photos', 
          credentials: TestDataFactory.createMockAuthTokens('Google Photos')
        },
        { 
          platform: 'Flickr', 
          credentials: TestDataFactory.createMockAuthTokens('Flickr')
        }
      ], { continueOnError: true });

      // Should have one success, one failure
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });
}); 