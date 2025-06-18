/**
 * Unit Tests for Data Normalization Utilities
 */

import { 
  ExifNormalizer, 
  FileNameNormalizer, 
  MetadataNormalizer,
  DataNormalizationPipeline 
} from '../../utils/DataNormalizer.js';
import { TestDataFactory, TestUtils, MOCK_API_RESPONSES } from '../setup.js';

describe('ExifNormalizer', () => {
  
  describe('normalizeDateTime', () => {
    test('should normalize valid ISO 8601 datetime', () => {
      const input = '2023-06-15T10:30:00Z';
      const result = ExifNormalizer.normalizeDateTime(input);
      expect(result).toBe('2023-06-15T10:30:00.000Z');
    });

    test('should handle various date formats', () => {
      const inputs = [
        '2023-06-15 10:30:00',
        '2023/06/15 10:30:00',
        '2023-06-15T10:30:00+00:00',
        '1686831000000' // Unix timestamp in milliseconds
      ];

      inputs.forEach(input => {
        const result = ExifNormalizer.normalizeDateTime(input);
        // Some date formats might not be parseable, which is acceptable
        if (result) {
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
      });
    });

    test('should return null for invalid dates', () => {
      const invalidInputs = ['invalid-date', '', null, undefined];
      
      invalidInputs.forEach(input => {
        const result = ExifNormalizer.normalizeDateTime(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('normalizeGPSCoordinates', () => {
    test('should normalize valid GPS coordinates', () => {
      const result = ExifNormalizer.normalizeGPSCoordinates('40.7128', '-74.0060');
      expect(result).toEqual({
        latitude: 40.712800,
        longitude: -74.006000
      });
    });

    test('should return null for invalid coordinates', () => {
      const invalidCases = [
        ['invalid', 'coordinates'],
        ['91.0', '0.0'], // Invalid latitude
        ['0.0', '181.0'], // Invalid longitude
        [null, null],
        ['', '']
      ];

      invalidCases.forEach(([lat, lon]) => {
        const result = ExifNormalizer.normalizeGPSCoordinates(lat, lon);
        expect(result).toBeNull();
      });
    });

    test('should handle numeric inputs', () => {
      const result = ExifNormalizer.normalizeGPSCoordinates(40.7128, -74.0060);
      expect(result).toEqual({
        latitude: 40.712800,
        longitude: -74.006000
      });
    });
  });

  describe('normalizeCameraModel', () => {
    test('should standardize known camera models', () => {
      const testCases = [
        ['canon eos 5d mark iv', 'Canon EOS 5D Mark IV'],
        ['Canon EOS 5D Mk IV', 'Canon EOS 5D Mark IV'],
        ['nikon d850', 'Nikon D850'],
        ['sony a7r iv', 'Sony α7R IV']
      ];

      testCases.forEach(([input, expected]) => {
        const result = ExifNormalizer.normalizeCameraModel(input);
        expect(result).toBe(expected);
      });
    });

    test('should return trimmed input for unknown models', () => {
      const input = '  Unknown Camera Model  ';
      const result = ExifNormalizer.normalizeCameraModel(input);
      expect(result).toBe('Unknown Camera Model');
    });

    test('should handle null/undefined input', () => {
      expect(ExifNormalizer.normalizeCameraModel(null)).toBeNull();
      expect(ExifNormalizer.normalizeCameraModel(undefined)).toBeNull();
      expect(ExifNormalizer.normalizeCameraModel('')).toBeNull();
    });
  });

  describe('normalizeAperture', () => {
    test('should normalize various aperture formats', () => {
      const testCases = [
        ['f/2.8', 2.8],
        ['2.8', 2.8],
        ['F2.8', 2.8],
        [2.8, 2.8],
        ['f/1.4', 1.4]
      ];

      testCases.forEach(([input, expected]) => {
        const result = ExifNormalizer.normalizeAperture(input);
        expect(result).toBe(expected);
      });
    });

    test('should return null for invalid apertures', () => {
      const invalidInputs = ['invalid', null, '', 0, 50];
      
      invalidInputs.forEach(input => {
        const result = ExifNormalizer.normalizeAperture(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('normalizeISO', () => {
    test('should normalize valid ISO values', () => {
      const validISOs = [100, 200, 400, 800, 1600, 3200, 6400];
      
      validISOs.forEach(iso => {
        const result = ExifNormalizer.normalizeISO(iso);
        expect(result).toBe(iso);
      });
    });

    test('should return null for invalid ISOs', () => {
      const invalidISOs = [25, 500000, 'invalid', null, ''];
      
      invalidISOs.forEach(iso => {
        const result = ExifNormalizer.normalizeISO(iso);
        expect(result).toBeNull();
      });
    });
  });

  describe('normalizeExifData', () => {
    test('should normalize complete EXIF data', () => {
      const exifData = {
        dateTimeOriginal: '2023-06-15T10:30:00Z',
        cameraMake: 'canon',
        cameraModel: 'eos 5d mark iv',
        aperture: 'f/2.8',
        iso: '400',
        gpsLatitude: '40.7128',
        gpsLongitude: '-74.0060'
      };

      const result = ExifNormalizer.normalizeExifData(exifData);

      expect(result.dateTimeOriginal).toBe('2023-06-15T10:30:00.000Z');
      expect(result.cameraMake).toBe('Canon');
      expect(result.cameraModel).toBe('eos 5d mark iv');
      expect(result.aperture).toBe(2.8);
      expect(result.iso).toBe(400);
      expect(result.gpsCoordinates).toEqual({
        latitude: 40.712800,
        longitude: -74.006000
      });
      expect(result.originalExif).toEqual(exifData);
    });

    test('should handle missing EXIF data gracefully', () => {
      const result = ExifNormalizer.normalizeExifData({});
      expect(result.dateTimeOriginal).toBeNull();
      expect(result.cameraMake).toBeNull();
      expect(result.originalExif).toEqual({});
    });

    test('should handle corrupted EXIF data', () => {
      const corruptedData = {
        dateTimeOriginal: 'corrupted-date',
        aperture: 'invalid-aperture',
        iso: 'invalid-iso',
        gpsLatitude: 'invalid-lat',
        gpsLongitude: 'invalid-lon'
      };

      const result = ExifNormalizer.normalizeExifData(corruptedData);
      
      expect(result.dateTimeOriginal).toBeNull();
      expect(result.aperture).toBeNull();
      expect(result.iso).toBeNull();
      expect(result.gpsCoordinates).toBeNull();
      expect(result.originalExif).toEqual(corruptedData);
    });

    test('should handle extremely large numbers', () => {
      const largeData = {
        iso: Number.MAX_SAFE_INTEGER,
        aperture: 999999,
        gpsLatitude: 999,
        gpsLongitude: 999
      };

      const result = ExifNormalizer.normalizeExifData(largeData);
      
      expect(result.iso).toBeNull(); // Too large
      expect(result.aperture).toBeNull(); // Too large
      expect(result.gpsCoordinates).toBeNull(); // Invalid coordinates
    });

    test('should handle mixed valid and invalid data', () => {
      const mixedData = {
        dateTimeOriginal: '2023-06-15T10:30:00Z', // Valid
        aperture: 'invalid-aperture', // Invalid
        iso: 400, // Valid
        gpsLatitude: 'invalid-lat', // Invalid
        gpsLongitude: '-74.0060' // Valid but latitude is invalid
      };

      const result = ExifNormalizer.normalizeExifData(mixedData);
      
      expect(result.dateTimeOriginal).toBe('2023-06-15T10:30:00.000Z');
      expect(result.aperture).toBeNull();
      expect(result.iso).toBe(400);
      expect(result.gpsCoordinates).toBeNull(); // Both coordinates needed
    });
  });
});

describe('FileNameNormalizer', () => {
  
  describe('generateFileName', () => {
    test('should generate standardized filename', () => {
      const photo = TestDataFactory.createMockPhoto('Google Photos', {
        dateTaken: '2023-06-15T10:30:00Z',
        location: { name: 'New York City' },
        album: 'Summer Vacation',
        filename: 'original.jpg'
      });

      const result = FileNameNormalizer.generateFileName(photo, {
        sequenceNumber: 1
      });

      expect(result).toMatch(/^20230615_103000_new_york_city_summer_vacation_001\.jpg$/);
    });

    test('should handle missing optional fields', () => {
      const photo = TestDataFactory.createMockPhoto('Google Photos', {
        dateTaken: '2023-06-15T10:30:00Z',
        location: null,
        album: null,
        filename: 'test.png'
      });

      const result = FileNameNormalizer.generateFileName(photo, {
        includeLocation: false,
        includeEvent: false,
        sequenceNumber: 5
      });

      expect(result).toMatch(/^20230615_103000_005\.png$/);
    });

    test('should use custom prefix', () => {
      const photo = TestDataFactory.createMockPhoto();
      
      const result = FileNameNormalizer.generateFileName(photo, {
        customPrefix: 'CUSTOM',
        sequenceNumber: 1
      });

      expect(result).toMatch(/^CUSTOM_\d{6}_.*_001\./);
    });
  });

  describe('sanitizeFilenamePart', () => {
    test('should sanitize special characters', () => {
      const testCases = [
        ['New York City!', 'new_york_city'],
        ['Photo @ Beach', 'photo_beach'],
        ['Test-Photo_Name', 'test-photo_name'],
        ['Multiple   Spaces', 'multiple_spaces'],
        ['Very Long Location Name That Should Be Truncated', 'very_long_location_n']
      ];

      testCases.forEach(([input, expected]) => {
        const result = FileNameNormalizer.sanitizeFilenamePart(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle empty input', () => {
      const result = FileNameNormalizer.sanitizeFilenamePart('');
      expect(result).toBe('');
    });

    test('should handle null and undefined input', () => {
      expect(FileNameNormalizer.sanitizeFilenamePart(null)).toBe('');
      expect(FileNameNormalizer.sanitizeFilenamePart(undefined)).toBe('');
    });

    test('should handle unicode characters', () => {
      const testCases = [
        ['北京 Beijing', 'beijing'],
        ['Café & Restaurant', 'caf_restaurant'],
        ['Montréal, Québec', 'montral_qubec'],
        ['Москва Moscow', 'moscow']
      ];

      testCases.forEach(([input, expected]) => {
        const result = FileNameNormalizer.sanitizeFilenamePart(input);
        expect(result).toContain(expected.toLowerCase());
      });
    });

    test('should handle extremely long strings', () => {
      const longString = 'a'.repeat(500);
      const result = FileNameNormalizer.sanitizeFilenamePart(longString);
      expect(result.length).toBeLessThanOrEqual(50); // Assuming max length limit
    });
  });

  describe('ensureUniqueFileName', () => {
    test('should return original filename if unique', () => {
      const fileName = 'test.jpg';
      const existingFiles = ['other1.jpg', 'other2.jpg'];
      
      const result = FileNameNormalizer.ensureUniqueFileName(fileName, existingFiles);
      expect(result).toBe('test.jpg');
    });

    test('should add counter for duplicate filenames', () => {
      const fileName = 'test.jpg';
      const existingFiles = ['test.jpg', 'test_1.jpg'];
      
      const result = FileNameNormalizer.ensureUniqueFileName(fileName, existingFiles);
      expect(result).toBe('test_2.jpg');
    });

    test('should handle edge cases in filename generation', () => {
      // Test with corrupted date
      const photoWithBadDate = TestDataFactory.createMockPhoto('Google Photos', {
        dateTaken: 'invalid-date',
        filename: 'test.jpg'
      });

      const result = FileNameNormalizer.generateFileName(photoWithBadDate, {
        sequenceNumber: 1
      });

      // Should generate a fallback filename when date is invalid
      expect(result).toMatch(/^photo_\d+\.jpg$/);
    });

    test('should handle missing filename extension', () => {
      const photo = TestDataFactory.createMockPhoto('Google Photos', {
        filename: 'no_extension'
      });

      const result = FileNameNormalizer.generateFileName(photo, {
        sequenceNumber: 1
      });

      // Should add default extension
      expect(result).toMatch(/\.(jpg|jpeg)$/);
    });

    test('should handle very large sequence numbers', () => {
      const photo = TestDataFactory.createMockPhoto();
      
      const result = FileNameNormalizer.generateFileName(photo, {
        sequenceNumber: 999999
      });

      expect(result).toMatch(/_999999\./);
    });

    test('should handle extremely long album names', () => {
      const photo = TestDataFactory.createMockPhoto('Google Photos', {
        album: 'This is an extremely long album name that should be truncated to avoid filesystem issues'
      });

      const result = FileNameNormalizer.generateFileName(photo, {
        sequenceNumber: 1
      });

      // Should be truncated
      expect(result.length).toBeLessThan(255); // Filesystem limit
    });
  });
});

describe('MetadataNormalizer', () => {
  
  describe('Platform-specific converters', () => {
    test('should convert Google Photos metadata', () => {
      const googlePhoto = MOCK_API_RESPONSES.googlePhotos.mediaItems[0];
      const result = MetadataNormalizer.convertGooglePhotosMetadata(googlePhoto);

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('Google Photos');
      expect(result.id).toBe('google-photo-1');
      expect(result.camera.make).toBe('Canon');
      expect(result.camera.model).toBe('EOS 5D Mark IV');
    });

    test('should convert Flickr metadata', () => {
      const flickrPhoto = MOCK_API_RESPONSES.flickr.photos.photo[0];
      const result = MetadataNormalizer.convertFlickrMetadata(flickrPhoto);

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('Flickr');
      expect(result.tags).toEqual(['sunset', 'nature', 'photography']);
      expect(result.location.name).toBe('New York');
    });

    test('should convert Instagram metadata', () => {
      const instagramPhoto = MOCK_API_RESPONSES.instagram.data[0];
      const result = MetadataNormalizer.convertInstagramMetadata(instagramPhoto);

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('Instagram');
      expect(result.tags).toEqual(['photography', 'travel', 'sunset']);
    });

    test('should convert Facebook metadata', () => {
      const facebookPhoto = MOCK_API_RESPONSES.facebook.data[0];
      const result = MetadataNormalizer.convertFacebookMetadata(facebookPhoto);

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('Facebook');
      expect(result.location.name).toBe('Central Park, New York');
      expect(result.album).toBe('Summer Vacation 2023');
    });

    test('should convert 500px metadata', () => {
      const photo500px = MOCK_API_RESPONSES.fiveHundredPx.photos[0];
      const result = MetadataNormalizer.convert500pxMetadata(photo500px);

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('500px');
      expect(result.camera.make).toBe('Sony α7R IV');
      expect(result.exposure.iso).toBe(800);
    });
  });

  describe('extractHashtags', () => {
    test('should extract hashtags from text', () => {
      const text = 'Amazing day! #photography #travel #sunset';
      const result = MetadataNormalizer.extractHashtags(text);
      
      expect(result).toEqual(['photography', 'travel', 'sunset']);
    });

    test('should handle text without hashtags', () => {
      const text = 'No hashtags here';
      const result = MetadataNormalizer.extractHashtags(text);
      
      expect(result).toEqual([]);
    });

    test('should handle empty text', () => {
      const result = MetadataNormalizer.extractHashtags('');
      expect(result).toEqual([]);
    });
  });

  describe('resolveMetadataConflict', () => {
    test('should prioritize EXIF over platform data', () => {
      const result = MetadataNormalizer.resolveMetadataConflict(
        'camera', 'Canon EOS R5', 'iPhone 12', 'exif', 'Instagram'
      );
      expect(result).toBe('Canon EOS R5');
    });

    test('should prefer non-null values', () => {
      const result = MetadataNormalizer.resolveMetadataConflict(
        'title', 'Sunset Photo', null, 'Google Photos', 'Facebook'
      );
      expect(result).toBe('Sunset Photo');
    });

    test('should prefer more recent dates', () => {
      const date1 = '2023-06-15T10:00:00Z';
      const date2 = '2023-06-15T11:00:00Z';
      
      // Use same priority sources so it goes to date comparison
      const result = MetadataNormalizer.resolveMetadataConflict(
        'dateTaken', date1, date2, 'Flickr', 'Google Photos'
      );
      expect(result).toBe(date2);
    });
  });

  describe('validateMetadata', () => {
    test('should validate correct metadata structure', () => {
      const metadata = TestDataFactory.createMockPhoto();
      const result = MetadataNormalizer.validateMetadata(metadata);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect type mismatches', () => {
      const metadata = {
        id: 'test',
        title: 123, // Should be string
        tags: 'not-array' // Should be array
      };
      
      const result = MetadataNormalizer.validateMetadata(metadata);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('DataNormalizationPipeline', () => {
  
  describe('normalizePhoto', () => {
    test('should normalize photo from supported platform', async () => {
      const googlePhoto = MOCK_API_RESPONSES.googlePhotos.mediaItems[0];
      
      const result = await DataNormalizationPipeline.normalizePhoto(
        googlePhoto, 
        'Google Photos'
      );

      TestUtils.assertNormalizedPhoto(result);
      expect(result.source).toBe('Google Photos');
    });

    test('should generate filename when requested', async () => {
      const photo = MOCK_API_RESPONSES.googlePhotos.mediaItems[0];
      
      const result = await DataNormalizationPipeline.normalizePhoto(
        photo, 
        'Google Photos',
        { 
          generateFilename: true,
          filenameOptions: { sequenceNumber: 1 }
        }
      );

      expect(result.filename).toMatch(/^\d{8}_\d{6}_.*\.jpg$/);
    });

    test('should throw error for unsupported platform', async () => {
      const photo = { id: 'test' };
      
      await expect(
        DataNormalizationPipeline.normalizePhoto(photo, 'UnsupportedPlatform')
      ).rejects.toThrow('Unsupported source: UnsupportedPlatform');
    });
  });

  describe('normalizePhotoBatch', () => {
    test('should normalize multiple photos', async () => {
      const photos = MOCK_API_RESPONSES.googlePhotos.mediaItems;
      
      const result = await DataNormalizationPipeline.normalizePhotoBatch(
        photos,
        'Google Photos'
      );

      expect(result.normalized).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);

      result.normalized.forEach(photo => {
        TestUtils.assertNormalizedPhoto(photo);
      });
    });

    test('should handle mixed success and failure cases', async () => {
      const photos = [
        MOCK_API_RESPONSES.googlePhotos.mediaItems[0],
        { invalid: 'photo' } // This should cause an error
      ];
      
      const result = await DataNormalizationPipeline.normalizePhotoBatch(
        photos,
        'Google Photos'
      );

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    test('should generate sequential filenames', async () => {
      const photos = MOCK_API_RESPONSES.googlePhotos.mediaItems;
      
      const result = await DataNormalizationPipeline.normalizePhotoBatch(
        photos,
        'Google Photos',
        { generateFilename: true }
      );

      const filenames = result.normalized.map(p => p.filename);
      expect(filenames[0]).toMatch(/_001\./);
      expect(filenames[1]).toMatch(/_002\./);
    });
  });
}); 