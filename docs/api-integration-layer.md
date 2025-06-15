# API Integration Layer Documentation

> Comprehensive documentation for the Photo Migration API Integration Layer

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Core Components](#core-components)
5. [Platform Support](#platform-support)
6. [Data Normalization](#data-normalization)
7. [Performance & Monitoring](#performance--monitoring)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Advanced Usage](#advanced-usage)
11. [Troubleshooting](#troubleshooting)

## Overview

The API Integration Layer provides a unified interface for photo migration across multiple platforms including Google Photos, Flickr, Instagram, Facebook, and 500px. It handles authentication, rate limiting, data normalization, caching, and error recovery.

### Key Features

- **Multi-Platform Support**: Unified interface for 5 major photo platforms
- **Intelligent Rate Limiting**: Platform-specific limits with adaptive algorithms
- **Advanced Caching**: Multi-tier caching with configurable strategies
- **Data Normalization**: Consistent data structure across all platforms
- **Comprehensive Error Handling**: Automatic retries with exponential backoff
- **Performance Monitoring**: Real-time metrics and optimization recommendations
- **Testing Framework**: Unit, integration, and E2E tests with 85%+ coverage

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                   PhotoApiService                           │
│               (Main Entry Point)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│              ApiAdapterFactory                              │
│             (Dynamic Adapter Creation)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼─────┐ ┌───────▼────┐ ┌───────▼──────┐
│ GooglePhotos  │ │   Flickr   │ │  Instagram   │
│   Adapter     │ │  Adapter   │ │   Adapter    │
└─────────┬─────┘ └────────────┘ └──────────────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│                Shared Utilities                          │
│  • RateLimitManager  • CacheManager  • Logger           │
│  • DataNormalizer    • PerformanceMonitor               │
└─────────────────────────────────────────────────────────┘
```

### Design Patterns

- **Adapter Pattern**: Unified interface for different platform APIs
- **Factory Pattern**: Dynamic creation of platform-specific adapters
- **Repository Pattern**: Abstract data access layer
- **Strategy Pattern**: Configurable caching and rate limiting strategies
- **Observer Pattern**: Event-driven logging and monitoring

## Getting Started

### Installation

```bash
# Install dependencies
npm install googleapis bottleneck lru-cache flickr-sdk
```

### Basic Usage

```javascript
import { PhotoApiService, Platform } from './src/services/api/index.js';

// Initialize the service
const apiService = new PhotoApiService({
  rateLimitConfig: {
    enableGlobalLimit: true,
    enablePlatformLimits: true
  },
  cacheConfig: {
    enableMetrics: true,
    defaultTTL: 3600000 // 1 hour
  }
});

// Fetch photos from Google Photos
const credentials = {
  accessToken: 'your-access-token',
  refreshToken: 'your-refresh-token'
};

const result = await apiService.fetchPhotosFromPlatform(
  Platform.GOOGLE_PHOTOS,
  credentials,
  { limit: 50 }
);

console.log(`Fetched ${result.photos.length} photos`);
```

### Authentication Setup

Each platform requires different authentication:

```javascript
// Google Photos (OAuth 2.0)
const googleCredentials = {
  accessToken: 'ya29.a0AX9...',
  refreshToken: '1//04...',
  expiresIn: 3600
};

// Flickr (OAuth 1.0a)
const flickrCredentials = {
  oauthToken: 'your-oauth-token',
  oauthTokenSecret: 'your-oauth-token-secret'
};

// Instagram Basic Display API (OAuth 2.0)
const instagramCredentials = {
  accessToken: 'IGQVJ...',
  refreshToken: 'optional-refresh-token'
};
```

## Core Components

### 1. PhotoApiService

Main entry point providing unified API access:

```javascript
const service = new PhotoApiService(options);

// Fetch from single platform
const photos = await service.fetchPhotosFromPlatform(platform, credentials);

// Fetch from multiple platforms
const results = await service.fetchPhotosFromMultiplePlatforms([
  { platform: 'Google Photos', credentials: googleCreds },
  { platform: 'Flickr', credentials: flickrCreds }
]);

// Test connection
const status = await service.testConnection(platform, credentials);
```

### 2. ApiAdapterFactory

Dynamic adapter creation and management:

```javascript
import { ApiAdapterFactory } from './src/services/api/factories/ApiAdapterFactory.js';

// Create adapter
const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
  rateLimiter: customRateLimiter,
  cache: customCache
});

// Get available platforms
const platforms = ApiAdapterFactory.getAvailablePlatforms();
```

### 3. Individual Adapters

Platform-specific implementations:

```javascript
// Google Photos Adapter
const googleAdapter = new GooglePhotosAdapter(dependencies);
const photos = await googleAdapter.fetchPhotos(credentials, params);

// Flickr Adapter
const flickrAdapter = new FlickrAdapter(dependencies);
const albums = await flickrAdapter.fetchAlbums(credentials);

// Each adapter implements the PhotoApiAdapter interface
interface PhotoApiAdapter {
  fetchPhotos(credentials, params);
  fetchAlbums(credentials, params);
  uploadPhoto(credentials, photoData);
  deletePhoto(credentials, photoId);
  // ... additional methods
}
```

## Platform Support

### Google Photos API
- **Authentication**: OAuth 2.0 with refresh tokens
- **Rate Limits**: 10,000 requests/hour
- **Features**: Rich metadata, EXIF data, albums, sharing
- **Limitations**: No photo deletion via API

```javascript
const googleResult = await adapter.fetchPhotos(credentials, {
  limit: 100,
  startDate: '2023-01-01',
  mediaTypes: ['photo']
});
```

### Flickr API
- **Authentication**: OAuth 1.0a (tokens don't expire)
- **Rate Limits**: 3,600 requests/hour
- **Features**: Photosets, detailed metadata, geolocation
- **Special**: Complete CRUD operations support

```javascript
const flickrResult = await adapter.fetchPhotos(credentials, {
  limit: 500,
  extras: 'geo,tags,machine_tags,o_dims,views'
});
```

### Instagram Basic Display API
- **Authentication**: OAuth 2.0 with token refresh
- **Rate Limits**: 200 requests/hour (strict)
- **Features**: Media, albums (carousels), hashtags
- **Limitations**: Read-only API

```javascript
const instagramResult = await adapter.fetchPhotos(credentials, {
  fields: 'id,caption,media_type,media_url,permalink,timestamp'
});
```

### Facebook Graph API
- **Authentication**: OAuth 2.0 with token exchange
- **Rate Limits**: 200 requests/hour
- **Features**: Albums, geolocation, privacy settings
- **Special**: Multi-resolution image support

```javascript
const facebookResult = await adapter.fetchPhotos(credentials, {
  albumId: 'specific-album-id',
  fields: 'id,name,source,created_time,place'
});
```

### 500px API
- **Authentication**: OAuth 1.0a (photography community)
- **Rate Limits**: 100 requests/hour (most conservative)
- **Features**: Photography metadata, ratings, collections
- **Special**: Rich technical photography information

```javascript
const px500Result = await adapter.fetchPhotos(credentials, {
  feature: 'popular',
  category: 'Landscapes',
  sort: 'rating'
});
```

## Data Normalization

### Unified Photo Structure

All platforms return photos in a consistent format:

```javascript
const normalizedPhoto = {
  id: 'unique-photo-id',
  title: 'Photo Title',
  description: 'Photo description',
  dateTaken: '2023-06-15T10:30:00.000Z', // ISO 8601 UTC
  source: 'Google Photos',
  filename: '20230615_103000_new_york_city_vacation_001.jpg',
  
  // Location information
  location: {
    latitude: 40.712800,
    longitude: -74.006000,
    name: 'New York City'
  },
  
  // Camera information
  camera: {
    make: 'Canon',
    model: 'Canon EOS 5D Mark IV'
  },
  
  // Exposure settings
  exposure: {
    aperture: 2.8,
    shutterSpeed: '1/250',
    iso: 400
  },
  
  // Additional metadata
  tags: ['travel', 'architecture', 'cityscape'],
  album: 'New York Vacation 2023',
  privacy: 'private',
  
  // Technical details
  dimensions: { width: 4000, height: 3000 },
  fileSize: 2048000,
  format: 'JPEG',
  
  // Platform-specific URLs
  urls: {
    original: 'https://...',
    thumbnail: 'https://...',
    medium: 'https://...'
  },
  
  // Preserved original data
  originalData: { /* platform-specific raw data */ }
};
```

### Data Normalization Pipeline

```javascript
import { DataNormalizationPipeline } from './src/services/api/utils/DataNormalizer.js';

// Normalize single photo
const normalized = await DataNormalizationPipeline.normalizePhoto(
  rawPhotoData,
  'Google Photos',
  { 
    generateFilename: true,
    filenameOptions: { 
      includeLocation: true,
      includeEvent: true,
      sequenceNumber: 1
    }
  }
);

// Normalize batch of photos
const batchResult = await DataNormalizationPipeline.normalizePhotoBatch(
  rawPhotosArray,
  'Flickr',
  { 
    generateFilename: true,
    continueOnError: true
  }
);

console.log(`Normalized: ${batchResult.successCount}, Errors: ${batchResult.errorCount}`);
```

### File Naming Convention

Standardized filename format: `[Date]_[Time]_[Location]_[Event]_[SequenceNumber].[Extension]`

```javascript
import { FileNameNormalizer } from './src/services/api/utils/DataNormalizer.js';

const filename = FileNameNormalizer.generateFileName(photo, {
  includeLocation: true,
  includeEvent: true,
  sequenceNumber: 1,
  customPrefix: 'VACATION'
});

// Output: 20230615_103000_paris_vacation_001.jpg
// or: VACATION_20230615_103000_001.jpg
```

## Performance & Monitoring

### Performance Monitoring

```javascript
import { PerformanceMonitor } from './src/services/api/utils/PerformanceMonitor.js';

const monitor = new PerformanceMonitor({
  thresholds: {
    apiCall: 5000,      // 5 seconds
    dataProcessing: 2000, // 2 seconds
    cacheOperation: 100   // 100ms
  }
});

// Start timing
monitor.startTimer('google-photos-fetch', {
  platform: 'Google Photos',
  operationType: 'apiCall',
  cacheable: true
});

// ... perform operation ...

// End timing
monitor.endTimer('google-photos-fetch', {
  success: true,
  photosCount: 150
});

// Generate performance report
const report = monitor.generateReport();
console.log(report.recommendations);
```

### Memory Monitoring

```javascript
import { MemoryMonitor } from './src/services/api/utils/PerformanceMonitor.js';

const memoryMonitor = new MemoryMonitor({
  thresholds: {
    heapUsed: 100 * 1024 * 1024, // 100MB
    heapTotal: 200 * 1024 * 1024  // 200MB
  },
  monitoringInterval: 30000 // 30 seconds
});

// Start continuous monitoring
memoryMonitor.startMonitoring();

// Check current usage
const usage = memoryMonitor.getCurrentUsage();
console.log(`Memory usage: ${usage.heapUsedMB}MB`);

// Force garbage collection (if available)
memoryMonitor.forceGC();
```

### Request Optimization

```javascript
import { RequestOptimizer } from './src/services/api/utils/PerformanceMonitor.js';

const optimizer = new RequestOptimizer();

// Analyze request patterns
const suggestions = optimizer.analyzeRequest({
  url: 'https://photoslibrary.googleapis.com/v1/mediaItems',
  method: 'GET',
  platform: 'Google Photos',
  params: { pageSize: 50 }
});

// Get optimization report
const optimizationReport = optimizer.getOptimizationReport();
console.log(optimizationReport.recommendations);
```

## Error Handling

### Error Types

```javascript
import { 
  ApiError, 
  RateLimitError, 
  AuthenticationError, 
  NotFoundError 
} from './src/services/api/types.js';

try {
  const photos = await adapter.fetchPhotos(credentials);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed. Refresh tokens.');
  } else if (error instanceof NotFoundError) {
    console.log('Resource not found.');
  } else {
    console.log(`API Error: ${error.message}`);
  }
}
```

### Retry Configuration

```javascript
const adapter = await ApiAdapterFactory.createAdapter('Google Photos', {
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    retryDelay: 1000,
    retryCondition: (error) => {
      return error instanceof RateLimitError || 
             error.code >= 500;
    }
  }
});
```

### Error Recovery Strategies

```javascript
// Automatic token refresh
const result = await apiService.fetchPhotosFromPlatform(
  'Google Photos',
  credentials,
  { 
    autoRefreshTokens: true,
    onTokenRefresh: (newTokens) => {
      // Save new tokens
      saveTokens(newTokens);
    }
  }
);

// Graceful degradation
const results = await apiService.fetchPhotosFromMultiplePlatforms(
  platformConfigs,
  { 
    continueOnError: true,
    errorHandler: (platform, error) => {
      console.log(`${platform} failed: ${error.message}`);
    }
  }
);
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

### Test Structure

```
src/services/api/__tests__/
├── setup.js                 # Test configuration and utilities
├── unit/
│   └── DataNormalizer.test.js
├── integration/
│   └── ApiAdapters.test.js
└── e2e/
    └── PhotoMigration.test.js
```

### Writing Tests

```javascript
import { TestDataFactory, TestUtils } from '../__tests__/setup.js';

describe('Custom API Adapter', () => {
  test('should fetch photos correctly', async () => {
    // Create mock data
    const mockPhotos = TestDataFactory.createMockApiResponse('Google Photos', 5);
    
    // Test adapter
    const result = await adapter.fetchPhotos(credentials);
    
    // Assertions
    expect(result.photos).toHaveLength(5);
    result.photos.forEach(photo => {
      TestUtils.assertNormalizedPhoto(photo);
    });
  });
});
```

## Advanced Usage

### Custom Caching Strategy

```javascript
import { CacheManager, CacheStrategy } from './src/services/api/utils/CacheManager.js';

// Create custom cache strategy
const customStrategy = new CacheStrategy({
  name: 'aggressive-photo-cache',
  shouldCache: (key, data) => {
    return data.photos && data.photos.length > 0;
  },
  getTTL: (key, data) => {
    // Cache photo lists for 2 hours
    return 2 * 60 * 60 * 1000;
  }
});

const cacheManager = new CacheManager({
  strategies: [customStrategy],
  maxSize: 100
});
```

### Custom Rate Limiting

```javascript
import { RateLimitManager } from './src/services/api/utils/RateLimitManager.js';

const rateLimiter = new RateLimitManager({
  global: {
    maxConcurrent: 10,
    minTime: 100
  },
  platforms: {
    'Custom Platform': {
      maxConcurrent: 2,
      minTime: 1000,
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 60 * 1000 // 1 hour
    }
  }
});
```

### Extending Adapters

```javascript
import { PhotoApiAdapter } from './src/services/api/interfaces/PhotoApiAdapter.js';

class CustomPlatformAdapter extends PhotoApiAdapter {
  constructor(dependencies) {
    super(dependencies);
    this.platform = 'Custom Platform';
  }

  async fetchPhotos(credentials, params = {}) {
    const operationId = `custom-fetch-${Date.now()}`;
    
    try {
      this.performanceMonitor.startTimer(operationId, {
        platform: this.platform,
        operationType: 'fetchPhotos'
      });

      // Custom implementation
      const rawPhotos = await this.makeApiRequest('/photos', params);
      
      // Normalize data
      const normalizedPhotos = rawPhotos.map(photo => 
        this.normalizePhotoData(photo)
      );

      return {
        photos: normalizedPhotos,
        totalCount: normalizedPhotos.length,
        nextPageToken: rawPhotos.nextPageToken
      };
    } catch (error) {
      this.handleError(error, 'fetchPhotos');
    } finally {
      this.performanceMonitor.endTimer(operationId);
    }
  }

  normalizePhotoData(rawPhoto) {
    // Convert platform-specific data to normalized format
    return {
      id: rawPhoto.id,
      title: rawPhoto.name,
      dateTaken: new Date(rawPhoto.created_at).toISOString(),
      source: this.platform,
      // ... other normalized fields
      originalData: rawPhoto
    };
  }
}
```

### Plugin System

```javascript
// Create plugin for additional functionality
class MetadataEnrichmentPlugin {
  constructor(geocodingService) {
    this.geocodingService = geocodingService;
  }

  async enrichPhoto(photo) {
    if (photo.location && !photo.location.name) {
      const location = await this.geocodingService.reverseGeocode(
        photo.location.latitude,
        photo.location.longitude
      );
      photo.location.name = location.name;
      photo.location.city = location.city;
      photo.location.country = location.country;
    }
    return photo;
  }
}

// Register plugin
apiService.registerPlugin('metadata-enrichment', new MetadataEnrichmentPlugin(geocoder));
```

## Troubleshooting

### Common Issues

#### 1. Rate Limiting Errors

```javascript
// Problem: Frequent rate limit errors
// Solution: Adjust rate limiting configuration

const rateLimiter = new RateLimitManager({
  platforms: {
    'Google Photos': {
      maxConcurrent: 5,      // Reduce from default 10
      minTime: 200           // Increase from default 100ms
    }
  }
});
```

#### 2. Memory Usage Issues

```javascript
// Problem: High memory usage
// Solution: Enable monitoring and cleanup

const service = new PhotoApiService({
  cacheConfig: {
    maxSize: 50,           // Reduce cache size
    cleanupInterval: 30000 // More frequent cleanup
  }
});

// Manual cleanup
setInterval(() => {
  service.cleanup();
}, 60000);
```

#### 3. Authentication Token Expiry

```javascript
// Problem: Tokens expire frequently
// Solution: Implement automatic refresh

const credentials = {
  accessToken: 'current-token',
  refreshToken: 'refresh-token',
  onTokenRefresh: async (newTokens) => {
    // Update stored credentials
    await updateStoredCredentials(newTokens);
  }
};
```

#### 4. Data Normalization Errors

```javascript
// Problem: Some photos fail normalization
// Solution: Use error-tolerant batch processing

const result = await DataNormalizationPipeline.normalizePhotoBatch(
  photos,
  'Google Photos',
  { 
    continueOnError: true,
    onError: (photo, error) => {
      console.log(`Failed to normalize photo ${photo.id}: ${error.message}`);
    }
  }
);
```

### Debugging

#### Enable Debug Logging

```javascript
import { Logger } from './src/services/api/utils/Logger.js';

const logger = new Logger('PhotoMigration', {
  level: 'DEBUG',
  enableMetrics: true
});

// View performance metrics
const metrics = logger.getMetrics();
console.log('API Performance:', metrics);
```

#### Performance Analysis

```javascript
// Generate comprehensive performance report
const performanceReport = monitor.generateReport({
  timeWindow: 24 * 60 * 60 * 1000 // 24 hours
});

console.log('Performance Issues:');
performanceReport.recommendations.forEach(rec => {
  console.log(`- ${rec.type}: ${rec.message}`);
});
```

#### Memory Profiling

```javascript
// Monitor memory usage patterns
const memoryMonitor = new MemoryMonitor();
memoryMonitor.startMonitoring();

// After running operations
const usage = memoryMonitor.getCurrentUsage();
if (usage.heapUsedMB > 100) {
  console.warn('High memory usage detected');
  memoryMonitor.forceGC();
}
```

### Best Practices

1. **Always implement error handling**
   ```javascript
   try {
     const result = await apiService.fetchPhotos(platform, credentials);
   } catch (error) {
     // Handle specific error types
   }
   ```

2. **Use appropriate cache strategies**
   ```javascript
   // Cache frequently accessed data
   const cacheStrategy = new CacheStrategy({
     name: 'user-photos',
     shouldCache: (key, data) => data.photos?.length > 0,
     getTTL: () => 30 * 60 * 1000 // 30 minutes
   });
   ```

3. **Monitor performance**
   ```javascript
   // Regular performance monitoring
   setInterval(() => {
     const report = monitor.generateReport();
     if (report.summary.averageResponseTime > 5000) {
       console.warn('Performance degradation detected');
     }
   }, 300000); // Every 5 minutes
   ```

4. **Implement graceful degradation**
   ```javascript
   // Handle partial failures gracefully
   const results = await apiService.fetchPhotosFromMultiplePlatforms(
     platforms,
     { continueOnError: true }
   );
   
   const successfulPlatforms = results.filter(r => r.success);
   ```

5. **Regular cleanup**
   ```javascript
   // Prevent memory leaks
   setInterval(() => {
     monitor.cleanup();      // Clean old metrics
     cacheManager.cleanup(); // Clean expired cache
   }, 3600000); // Every hour
   ```

---

## API Reference

For detailed API reference, see individual component documentation:

- [PhotoApiService API](./api-reference/PhotoApiService.md)
- [Adapter Interfaces](./api-reference/Adapters.md)
- [Utilities Reference](./api-reference/Utilities.md)
- [Error Types](./api-reference/Errors.md)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the API Integration Layer.

## License

MIT License - see [LICENSE](../LICENSE) file for details. 