/**
 * End-to-End Tests for Photo Migration Workflow
 * Tests the complete photo migration process from source platform to destination
 */

import { jest } from '@jest/globals';
import { PhotoApiService } from '../../PhotoApiService.js';
import { DataNormalizationPipeline } from '../../utils/DataNormalizer.js';
import { PhotoRepository } from '../../repositories/PhotoRepository.js';
import { TestDataFactory, TestUtils, MockHttpClient, MOCK_API_RESPONSES } from '../setup.js';

describe('Photo Migration E2E', () => {
  let apiService;
  let mockHttpClient;
  let photoRepository;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    
    apiService = new PhotoApiService({
      httpClient: mockHttpClient,
      rateLimitConfig: { enableGlobalLimit: false },
      cacheConfig: { enableMetrics: true },
      logger: TestUtils.createMockLogger()
    });

    photoRepository = new PhotoRepository({
      cache: TestUtils.createMockCache(),
      logger: TestUtils.createMockLogger()
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
    jest.clearAllMocks();
  });

  describe('Complete Migration Workflow', () => {
    test('should migrate photos from Google Photos to local storage', async () => {
      // Step 1: Setup source platform (Google Photos)
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: MOCK_API_RESPONSES.googlePhotos }
      );

      // Step 2: Fetch photos from source
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials,
        { limit: 50 }
      );

      expect(sourcePhotos.success).toBe(true);
      expect(sourcePhotos.photos).toHaveLength(2);

      // Step 3: Normalize data
      const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
        sourcePhotos.photos.map(p => p.originalData),
        'Google Photos',
        { 
          generateFilename: true,
          filenameOptions: { includeLocation: true, includeEvent: true }
        }
      );

      expect(normalizedPhotos.successCount).toBe(2);
      expect(normalizedPhotos.errorCount).toBe(0);

      // Step 4: Store in repository
      for (const photo of normalizedPhotos.normalized) {
        await photoRepository.storePhoto(photo);
      }

      // Step 5: Verify migration
      const storedPhotos = await photoRepository.getAllPhotos();
      expect(storedPhotos).toHaveLength(2);

      storedPhotos.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
        expect(photo.source).toBe('Google Photos');
        expect(photo.filename).toMatch(/^\d{8}_\d{6}_.*\.(jpg|png)$/);
      });
    });

    test('should handle multi-platform migration', async () => {
      // Setup multiple source platforms
      const platforms = [
        { name: 'Google Photos', apiKey: 'google', mock: MOCK_API_RESPONSES.googlePhotos },
        { name: 'Flickr', apiKey: 'flickr', mock: MOCK_API_RESPONSES.flickr },
        { name: 'Instagram', apiKey: 'instagram', mock: MOCK_API_RESPONSES.instagram }
      ];

      // Mock responses for all platforms
      platforms.forEach(platform => {
        mockHttpClient.setResponse(platform.apiKey, { data: platform.mock });
      });

      const migrationResults = [];

      // Process each platform
      for (const platform of platforms) {
        const credentials = TestDataFactory.createMockAuthTokens(platform.name);
        
        // Fetch photos
        const sourcePhotos = await apiService.fetchPhotosFromPlatform(
          platform.name,
          credentials
        );

        if (sourcePhotos.success) {
          // Normalize data
          const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
            sourcePhotos.photos.map(p => p.originalData || p),
            platform.name,
            { generateFilename: true }
          );

          // Store results
          for (const photo of normalizedPhotos.normalized) {
            await photoRepository.storePhoto(photo);
          }

          migrationResults.push({
            platform: platform.name,
            photosCount: normalizedPhotos.successCount,
            success: true
          });
        }
      }

      // Verify results
      expect(migrationResults).toHaveLength(3);
      expect(migrationResults.every(r => r.success)).toBe(true);

      const allStoredPhotos = await photoRepository.getAllPhotos();
      const expectedTotal = migrationResults.reduce((sum, r) => sum + r.photosCount, 0);
      expect(allStoredPhotos).toHaveLength(expectedTotal);

      // Verify photos from different platforms
      const platformCounts = allStoredPhotos.reduce((acc, photo) => {
        acc[photo.source] = (acc[photo.source] || 0) + 1;
        return acc;
      }, {});

      platforms.forEach(platform => {
        expect(platformCounts[platform.name]).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from partial failures during migration', async () => {
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Mock mixed responses - some photos succeed, some fail
      const mixedResponse = {
        mediaItems: [
          MOCK_API_RESPONSES.googlePhotos.mediaItems[0], // Valid photo
          { invalid: 'photo' }, // Invalid photo that will cause normalization error
          MOCK_API_RESPONSES.googlePhotos.mediaItems[1]  // Valid photo
        ]
      };

      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: mixedResponse }
      );

      // Fetch photos
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials
      );

      // Normalize with error handling
      const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
        sourcePhotos.photos.map(p => p.originalData || p),
        'Google Photos',
        { continueOnError: true }
      );

      // Should have partial success
      expect(normalizedPhotos.successCount).toBe(2);
      expect(normalizedPhotos.errorCount).toBe(1);
      expect(normalizedPhotos.errors).toHaveLength(1);

      // Store successful photos
      for (const photo of normalizedPhotos.normalized) {
        await photoRepository.storePhoto(photo);
      }

      const storedPhotos = await photoRepository.getAllPhotos();
      expect(storedPhotos).toHaveLength(2);
    });

    test('should handle rate limiting gracefully', async () => {
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Mock rate limit error followed by success
      let callCount = 0;
      jest.spyOn(mockHttpClient, 'request').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Rate limit exceeded');
        }
        return { data: MOCK_API_RESPONSES.googlePhotos };
      });

      // Should eventually succeed after rate limit
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials,
        { 
          retryConfig: { 
            maxRetries: 3, 
            backoffMultiplier: 1.5,
            retryDelay: 100 
          } 
        }
      );

      expect(sourcePhotos.success).toBe(true);
      expect(callCount).toBe(2); // One failure + one success
    });

    test('should handle authentication token refresh', async () => {
      let sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Mock expired token followed by successful refresh
      let callCount = 0;
      jest.spyOn(mockHttpClient, 'request').mockImplementation(async (config) => {
        callCount++;
        
        if (callCount === 1) {
          // First call: expired token
          throw new Error('Token expired');
        } else if (callCount === 2) {
          // Second call: token refresh
          return {
            data: {
              access_token: 'new-access-token',
              refresh_token: 'new-refresh-token',
              expires_in: 3600
            }
          };
        } else {
          // Third call: successful API call with new token
          expect(config.headers.Authorization).toContain('new-access-token');
          return { data: MOCK_API_RESPONSES.googlePhotos };
        }
      });

      // Should handle token refresh automatically
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials,
        { autoRefreshTokens: true }
      );

      expect(sourcePhotos.success).toBe(true);
      expect(callCount).toBe(3); // Auth error + token refresh + successful call
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should preserve photo metadata during migration', async () => {
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Use detailed mock response with rich metadata
      const detailedResponse = {
        mediaItems: [{
          id: 'detailed-photo-1',
          filename: 'vacation_photo.jpg',
          description: 'Beach vacation photo',
          productUrl: 'https://photos.google.com/share/detailed1',
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
        }]
      };

      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: detailedResponse }
      );

      // Fetch and normalize
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials
      );

      const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
        sourcePhotos.photos.map(p => p.originalData || p),
        'Google Photos'
      );

      const photo = normalizedPhotos.normalized[0];

      // Verify all metadata is preserved and normalized
      expect(photo.id).toBe('detailed-photo-1');
      expect(photo.title).toBe('vacation_photo.jpg');
      expect(photo.description).toBe('Beach vacation photo');
      expect(photo.dateTaken).toBe('2023-06-15T10:30:00.000Z');
      expect(photo.camera.make).toBe('Canon');
      expect(photo.camera.model).toBe('Canon EOS 5D Mark IV');
      expect(photo.exposure.aperture).toBe(2.8);
      expect(photo.exposure.shutterSpeed).toBe('1/250');
      expect(photo.exposure.iso).toBe(400);
      expect(photo.location.latitude).toBe(40.712800);
      expect(photo.location.longitude).toBe(-74.006000);
      expect(photo.dimensions.width).toBe(4000);
      expect(photo.dimensions.height).toBe(3000);
    });

    test('should validate data consistency across migration steps', async () => {
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: MOCK_API_RESPONSES.googlePhotos }
      );

      // Step 1: Fetch original data
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials
      );

      const originalPhotos = sourcePhotos.photos;
      
      // Step 2: Normalize data
      const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
        originalPhotos.map(p => p.originalData || p),
        'Google Photos'
      );

      // Step 3: Validate data consistency
      expect(normalizedPhotos.normalized).toHaveLength(originalPhotos.length);

      normalizedPhotos.normalized.forEach((normalizedPhoto, index) => {
        const originalPhoto = originalPhotos[index];
        
        // IDs should match
        expect(normalizedPhoto.id).toBe(originalPhoto.id);
        
        // Source should be consistent
        expect(normalizedPhoto.source).toBe('Google Photos');
        
        // Essential fields should be present
        TestUtils.assertNormalizedPhoto(normalizedPhoto);
        
        // Original data should be preserved
        expect(normalizedPhoto.originalData).toBeDefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large photo collections efficiently', async () => {
      const sourceCredentials = TestDataFactory.createMockAuthTokens('Google Photos');
      
      // Generate large photo collection
      const largeCollection = {
        mediaItems: TestUtils.generateLargePhotoSet(500).map(photo => ({
          id: photo.id,
          filename: photo.filename,
          mediaMetadata: {
            creationTime: photo.dateTaken,
            width: photo.dimensions.width.toString(),
            height: photo.dimensions.height.toString()
          }
        }))
      };

      mockHttpClient.setResponse(
        'photoslibrary.googleapis.com',
        { data: largeCollection }
      );

      const startTime = Date.now();

      // Fetch and process large collection
      const sourcePhotos = await apiService.fetchPhotosFromPlatform(
        'Google Photos',
        sourceCredentials,
        { limit: 500 }
      );

      const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
        sourcePhotos.photos.map(p => p.originalData || p),
        'Google Photos',
        { 
          batchSize: 50, // Process in smaller batches
          generateFilename: true 
        }
      );

      const processingTime = Date.now() - startTime;

      // Verify performance and results
      expect(normalizedPhotos.successCount).toBe(500);
      expect(normalizedPhotos.errorCount).toBe(0);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify all photos are properly normalized
      normalizedPhotos.normalized.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
        expect(photo.filename).toMatch(/^\d{8}_\d{6}_.*_\d{3}\.(jpg|png)$/);
      });
    });

    test('should support concurrent migrations from multiple sources', async () => {
      const platforms = ['Google Photos', 'Flickr', 'Instagram'];
      const migrationPromises = [];

      platforms.forEach(platform => {
        const credentials = TestDataFactory.createMockAuthTokens(platform);
        const platformKey = platform.toLowerCase().replace(/\s+/g, '');
        const mockResponse = MOCK_API_RESPONSES[platformKey] || MOCK_API_RESPONSES.googlePhotos;
        
        mockHttpClient.setResponse(platformKey, { data: mockResponse });

        const migrationPromise = (async () => {
          const sourcePhotos = await apiService.fetchPhotosFromPlatform(
            platform,
            credentials
          );

          const normalizedPhotos = await DataNormalizationPipeline.normalizePhotoBatch(
            sourcePhotos.photos.map(p => p.originalData || p),
            platform
          );

          return {
            platform,
            photosCount: normalizedPhotos.successCount,
            processingTime: Date.now()
          };
        })();

        migrationPromises.push(migrationPromise);
      });

      // Execute concurrent migrations
      const startTime = Date.now();
      const results = await Promise.all(migrationPromises);
      const totalTime = Date.now() - startTime;

      // Verify all migrations completed successfully
      expect(results).toHaveLength(3);
      expect(results.every(r => r.photosCount > 0)).toBe(true);
      
      // Concurrent processing should be faster than sequential
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify platform isolation
      const platformNames = results.map(r => r.platform);
      expect(new Set(platformNames).size).toBe(3);
    });
  });
}); 