class ConfigStorage {
  constructor() {
    this.storageKey = 'photo_migration_config';
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
    this.dbName = 'PhotoMigrationDB';
    this.storeName = 'configurations';
    this.dbVersion = 1;
  }

  checkIndexedDBSupport() {
    return 'indexedDB' in window && indexedDB !== null;
  }

  async initIndexedDB() {
    if (!this.isIndexedDBSupported) {
      throw new Error('IndexedDB is not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async saveConfig(config, name = 'default') {
    const configData = {
      id: name,
      name,
      config,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    try {
      if (this.isIndexedDBSupported) {
        await this.saveToIndexedDB(configData);
      } else {
        this.saveToLocalStorage(configData);
      }
      return { success: true, message: '配置已成功儲存' };
    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.saveToLocalStorage(configData);
      return { success: true, message: '配置已儲存到本地存儲' };
    }
  }

  async saveToIndexedDB(configData) {
    const db = await this.initIndexedDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(configData);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      
      transaction.oncomplete = () => db.close();
    });
  }

  saveToLocalStorage(configData) {
    try {
      const existingConfigs = this.getConfigsFromLocalStorage();
      existingConfigs[configData.id] = configData;
      localStorage.setItem(this.storageKey, JSON.stringify(existingConfigs));
    } catch (error) {
      throw new Error('Failed to save to localStorage: ' + error.message);
    }
  }

  async loadConfig(name = 'default') {
    try {
      if (this.isIndexedDBSupported) {
        const config = await this.loadFromIndexedDB(name);
        if (config) return config;
      }
      
      return this.loadFromLocalStorage(name);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  async loadFromIndexedDB(name) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(name);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => reject(new Error('Failed to load from IndexedDB'));
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      return null;
    }
  }

  loadFromLocalStorage(name) {
    try {
      const configs = this.getConfigsFromLocalStorage();
      return configs[name] || null;
    } catch (error) {
      return null;
    }
  }

  getConfigsFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  async getAllConfigs() {
    try {
      if (this.isIndexedDBSupported) {
        const indexedConfigs = await this.getAllFromIndexedDB();
        if (indexedConfigs.length > 0) return indexedConfigs;
      }
      
      return this.getAllFromLocalStorage();
    } catch (error) {
      console.error('Failed to get all configurations:', error);
      return this.getAllFromLocalStorage();
    }
  }

  async getAllFromIndexedDB() {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => reject(new Error('Failed to get all from IndexedDB'));
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      return [];
    }
  }

  getAllFromLocalStorage() {
    try {
      const configs = this.getConfigsFromLocalStorage();
      return Object.values(configs);
    } catch (error) {
      return [];
    }
  }

  async deleteConfig(name) {
    try {
      if (this.isIndexedDBSupported) {
        await this.deleteFromIndexedDB(name);
      }
      this.deleteFromLocalStorage(name);
      return { success: true, message: '配置已刪除' };
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      return { success: false, message: '刪除配置失敗' };
    }
  }

  async deleteFromIndexedDB(name) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(name);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      throw error;
    }
  }

  deleteFromLocalStorage(name) {
    try {
      const configs = this.getConfigsFromLocalStorage();
      delete configs[name];
      localStorage.setItem(this.storageKey, JSON.stringify(configs));
    } catch (error) {
      throw new Error('Failed to delete from localStorage: ' + error.message);
    }
  }

  async exportConfig(name = 'default') {
    const config = await this.loadConfig(name);
    if (!config) {
      throw new Error('配置不存在');
    }

    const exportData = {
      ...config,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importConfig(jsonString, name = null) {
    try {
      const importData = JSON.parse(jsonString);
      
      if (!importData.config) {
        throw new Error('無效的配置格式');
      }

      const configName = name || importData.name || 'imported_' + Date.now();
      
      const result = await this.saveConfig(importData.config, configName);
      return {
        ...result,
        configName,
        message: `配置已成功匯入為 "${configName}"`
      };
    } catch (error) {
      throw new Error('匯入配置失敗: ' + error.message);
    }
  }

  async clearAllConfigs() {
    try {
      if (this.isIndexedDBSupported) {
        await this.clearIndexedDB();
      }
      localStorage.removeItem(this.storageKey);
      return { success: true, message: '所有配置已清除' };
    } catch (error) {
      console.error('Failed to clear configurations:', error);
      return { success: false, message: '清除配置失敗' };
    }
  }

  async clearIndexedDB() {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear IndexedDB'));
        
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      throw error;
    }
  }

  getStorageInfo() {
    return {
      isIndexedDBSupported: this.isIndexedDBSupported,
      preferredStorage: this.isIndexedDBSupported ? 'IndexedDB' : 'localStorage',
      storageKey: this.storageKey,
      dbName: this.dbName,
      storeName: this.storeName
    };
  }
}

const configStorage = new ConfigStorage();

export default configStorage;
export { ConfigStorage };