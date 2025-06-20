import { ConfigStorage } from '../configStorage';

// Mock IndexedDB
const mockIDBDatabase = {
  close: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
  createObjectStore: jest.fn(() => ({
    createIndex: jest.fn()
  })),
  transaction: jest.fn(() => mockIDBTransaction)
};

const mockIDBTransaction = {
  objectStore: jest.fn(() => mockIDBObjectStore),
  oncomplete: null,
  onerror: null
};

const mockIDBObjectStore = {
  put: jest.fn(() => mockIDBRequest),
  get: jest.fn(() => mockIDBRequest),
  getAll: jest.fn(() => mockIDBRequest),
  delete: jest.fn(() => mockIDBRequest),
  clear: jest.fn(() => mockIDBRequest),
  createIndex: jest.fn()
};

const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null
};

const mockIDBOpenRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockIDBDatabase
};

// Mock global IndexedDB
Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: jest.fn(() => mockIDBOpenRequest)
  }
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ConfigStorage', () => {
  let configStorage;
  
  const testConfig = {
    imageQuality: 'high',
    duplicateHandling: 'skip',
    batchSize: 50,
    concurrentLimit: 3
  };

  beforeEach(() => {
    configStorage = new ConfigStorage();
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(configStorage.storageKey).toBe('photo_migration_config');
      expect(configStorage.dbName).toBe('PhotoMigrationDB');
      expect(configStorage.storeName).toBe('configurations');
      expect(configStorage.dbVersion).toBe(1);
    });

    it('should detect IndexedDB support', () => {
      expect(configStorage.checkIndexedDBSupport()).toBe(true);
    });

    it('should handle missing IndexedDB', () => {
      delete window.indexedDB;
      const storage = new ConfigStorage();
      expect(storage.checkIndexedDBSupport()).toBe(false);
    });
  });

  describe('IndexedDB Operations', () => {
    beforeEach(() => {
      configStorage.isIndexedDBSupported = true;
    });

    it('should initialize IndexedDB successfully', async () => {
      const initPromise = configStorage.initIndexedDB();
      
      // Simulate successful database opening
      setTimeout(() => {
        mockIDBOpenRequest.onsuccess({ target: { result: mockIDBDatabase } });
      }, 0);
      
      const db = await initPromise;
      expect(db).toBe(mockIDBDatabase);
      expect(window.indexedDB.open).toHaveBeenCalledWith('PhotoMigrationDB', 1);
    });

    it('should handle IndexedDB initialization error', async () => {
      const initPromise = configStorage.initIndexedDB();
      
      setTimeout(() => {
        mockIDBOpenRequest.onerror();
      }, 0);
      
      await expect(initPromise).rejects.toThrow('Failed to open IndexedDB');
    });

    it('should create object store on upgrade', async () => {
      mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false);
      
      const initPromise = configStorage.initIndexedDB();
      
      setTimeout(() => {
        mockIDBOpenRequest.onupgradeneeded({ target: { result: mockIDBDatabase } });
        mockIDBOpenRequest.onsuccess({ target: { result: mockIDBDatabase } });
      }, 0);
      
      await initPromise;
      
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith(
        'configurations',
        { keyPath: 'id' }
      );
    });

    it('should save to IndexedDB successfully', async () => {
      const configData = {
        id: 'test',
        name: 'test',
        config: testConfig,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const savePromise = configStorage.saveToIndexedDB(configData);
      
      setTimeout(() => {
        mockIDBOpenRequest.onsuccess({ target: { result: mockIDBDatabase } });
        setTimeout(() => {
          mockIDBRequest.onsuccess();
          mockIDBTransaction.oncomplete();
        }, 0);
      }, 0);
      
      await savePromise;
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(configData);
    });

    it('should load from IndexedDB successfully', async () => {
      const expectedData = { config: testConfig };
      mockIDBRequest.result = expectedData;
      
      const loadPromise = configStorage.loadFromIndexedDB('test');
      
      setTimeout(() => {
        mockIDBOpenRequest.onsuccess({ target: { result: mockIDBDatabase } });
        setTimeout(() => {
          mockIDBRequest.onsuccess();
          mockIDBTransaction.oncomplete();
        }, 0);
      }, 0);
      
      const result = await loadPromise;
      
      expect(result).toBe(expectedData);
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith('test');
    });
  });

  describe('localStorage Operations', () => {
    it('should save to localStorage', () => {
      const configData = {
        id: 'test',
        config: testConfig,
        timestamp: new Date().toISOString()
      };

      configStorage.saveToLocalStorage(configData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'photo_migration_config',
        JSON.stringify({ test: configData })
      );
    });

    it('should load from localStorage', () => {
      const configData = { config: testConfig };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ test: configData })
      );

      const result = configStorage.loadFromLocalStorage('test');
      
      expect(result).toEqual(configData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('photo_migration_config');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = configStorage.loadFromLocalStorage('test');
      expect(result).toBeNull();
    });

    it('should return empty object for missing localStorage data', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = configStorage.getConfigsFromLocalStorage();
      expect(result).toEqual({});
    });
  });

  describe('High-level API', () => {
    it('should save config with fallback to localStorage', async () => {
      configStorage.isIndexedDBSupported = false;
      
      const result = await configStorage.saveConfig(testConfig, 'test');
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should load config with fallback to localStorage', async () => {
      configStorage.isIndexedDBSupported = false;
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ test: { config: testConfig } })
      );
      
      const result = await configStorage.loadConfig('test');
      
      expect(result.config).toEqual(testConfig);
    });

    it('should get all configs from localStorage', async () => {
      configStorage.isIndexedDBSupported = false;
      const configs = {
        config1: { config: testConfig },
        config2: { config: { ...testConfig, imageQuality: 'standard' } }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(configs));
      
      const result = await configStorage.getAllConfigs();
      
      expect(result).toEqual(Object.values(configs));
    });

    it('should delete config successfully', async () => {
      configStorage.isIndexedDBSupported = false;
      
      const result = await configStorage.deleteConfig('test');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('配置已刪除');
    });
  });

  describe('Export/Import', () => {
    beforeEach(() => {
      configStorage.isIndexedDBSupported = false;
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ default: { config: testConfig } })
      );
    });

    it('should export config as JSON string', async () => {
      const exported = await configStorage.exportConfig('default');
      const parsed = JSON.parse(exported);
      
      expect(parsed.config).toEqual(testConfig);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.appVersion).toBe('1.0.0');
    });

    it('should import config from JSON string', async () => {
      const importData = {
        name: 'imported',
        config: testConfig,
        timestamp: new Date().toISOString()
      };
      
      const result = await configStorage.importConfig(JSON.stringify(importData));
      
      expect(result.success).toBe(true);
      expect(result.configName).toBe('imported');
    });

    it('should generate unique name for imported config without name', async () => {
      const importData = { config: testConfig };
      
      const result = await configStorage.importConfig(JSON.stringify(importData));
      
      expect(result.configName).toMatch(/^imported_\d+$/);
    });

    it('should handle invalid import data', async () => {
      await expect(configStorage.importConfig('invalid json')).rejects.toThrow();
      
      await expect(configStorage.importConfig(JSON.stringify({}))).rejects.toThrow('無效的配置格式');
    });

    it('should handle missing config for export', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({}));
      
      await expect(configStorage.exportConfig('nonexistent')).rejects.toThrow('配置不存在');
    });
  });

  describe('Clear Operations', () => {
    it('should clear all configurations', async () => {
      configStorage.isIndexedDBSupported = false;
      
      const result = await configStorage.clearAllConfigs();
      
      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('photo_migration_config');
    });
  });

  describe('Storage Info', () => {
    it('should return correct storage information', () => {
      const info = configStorage.getStorageInfo();
      
      expect(info.isIndexedDBSupported).toBe(true);
      expect(info.preferredStorage).toBe('IndexedDB');
      expect(info.storageKey).toBe('photo_migration_config');
      expect(info.dbName).toBe('PhotoMigrationDB');
      expect(info.storeName).toBe('configurations');
    });

    it('should indicate localStorage as preferred when IndexedDB not supported', () => {
      configStorage.isIndexedDBSupported = false;
      
      const info = configStorage.getStorageInfo();
      
      expect(info.preferredStorage).toBe('localStorage');
    });
  });
});