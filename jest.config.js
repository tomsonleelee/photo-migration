/**
 * Jest Configuration for Photo Migration API Integration Layer
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // ES Module support
  preset: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test file patterns
  testMatch: [
    '**/src/services/api/__tests__/**/*.test.js',
    '**/src/services/api/__tests__/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/services/api/__tests__/setup.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/services/api/**/*.js',
    '!src/services/api/__tests__/**',
    '!src/services/api/**/*.test.js',
    '!src/services/api/**/*.spec.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical components should have higher coverage
    'src/services/api/utils/DataNormalizer.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/services/api/adapters/*.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test timeout
  testTimeout: 30000, // 30 seconds for integration tests

  // Parallel testing
  maxWorkers: '50%', // Use half of available CPU cores

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Output configuration
  verbose: true,
  silent: false,

  // Error handling
  bail: false, // Continue running tests after failures
  errorOnDeprecated: true,

  // Transform configuration for ES modules
  transform: {},

  // Module resolution
  moduleFileExtensions: ['js', 'json', 'node'],

  // Test groups configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['**/src/services/api/__tests__/unit/**/*.test.js'],
      testTimeout: 10000,
      setupFilesAfterEnv: ['<rootDir>/src/services/api/__tests__/setup.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['**/src/services/api/__tests__/integration/**/*.test.js'],
      testTimeout: 30000,
      setupFilesAfterEnv: ['<rootDir>/src/services/api/__tests__/setup.js']
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['**/src/services/api/__tests__/e2e/**/*.test.js'],
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/src/services/api/__tests__/setup.js']
    }
  ],

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'API Integration Layer Test Report'
      }
    ]
  ],

  // Global test configuration
  globalSetup: '<rootDir>/src/services/api/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/src/services/api/__tests__/globalTeardown.js',

  // Environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    API_RATE_LIMIT_ENABLED: 'false',
    API_CACHE_ENABLED: 'true',
    LOG_LEVEL: 'ERROR'
  }
}; 