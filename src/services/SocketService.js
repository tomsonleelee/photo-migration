import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.progressCallback = null;
  }

  // Initialize socket connection
  connect(options = {}) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    const defaultOptions = {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      autoConnect: true,
      ...options
    };

    this.socket = io(this.url, defaultOptions);

    this.setupEventListeners();
    
    return this.socket;
  }

  // Set up default event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.emit('connection-status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection-status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connectionAttempts++;
      this.emit('connection-error', { error, attempts: this.connectionAttempts });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.emit('reconnected', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      this.emit('reconnection-failed', { maxAttempts: this.maxReconnectAttempts });
    });

    // Progress tracking events
    this.socket.on('migration-started', (data) => {
      console.log('Migration started:', data);
      this.emit('migration-started', data);
    });

    this.socket.on('migration-completed', (data) => {
      console.log('Migration completed:', data);
      this.emit('migration-completed', data);
    });

    this.socket.on('migration-stopped', (data) => {
      console.log('Migration stopped:', data);
      this.emit('migration-stopped', data);
    });

    this.socket.on('file-progress', (data) => {
      this.emit('file-progress', data);
      if (this.progressCallback) {
        this.progressCallback(data);
      }
    });

    this.socket.on('overall-progress', (data) => {
      this.emit('overall-progress', data);
    });

    this.socket.on('migration-error', (data) => {
      console.error('Migration error:', data);
      this.emit('migration-error', data);
    });

    this.socket.on('migration-log', (data) => {
      this.emit('migration-log', data);
    });

    this.socket.on('queue-status', (data) => {
      this.emit('queue-status', data);
    });

    this.socket.on('stats-update', (data) => {
      this.emit('stats-update', data);
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  // Register event handler
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);

    // Also register with socket if connected
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  // Unregister event handler
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
      
      // Also unregister from socket if connected
      if (this.socket) {
        this.socket.off(event, handler);
      }
    }
  }

  // Emit event to server
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: socket not connected`);
    }
  }

  // Emit event to local handlers
  emitLocal(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Set progress callback for easy integration with ProgressContext
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  // Migration control methods
  startMigration(config) {
    this.emit('start-migration', config);
  }

  stopMigration() {
    this.emit('stop-migration');
  }

  pauseMigration() {
    this.emit('pause-migration');
  }

  resumeMigration() {
    this.emit('resume-migration');
  }

  // Request current status
  requestStatus() {
    this.emit('get-status');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      attempts: this.connectionAttempts
    };
  }

  // Manual reconnect
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connect();
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  // Wait for connection
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.isSocketConnected()) {
        resolve(this.socket);
        return;
      }

      const timer = setTimeout(() => {
        this.socket?.off('connect', onConnect);
        reject(new Error('Connection timeout'));
      }, timeout);

      const onConnect = () => {
        clearTimeout(timer);
        resolve(this.socket);
      };

      this.socket?.once('connect', onConnect);
    });
  }

  // Send file list for migration
  sendFileList(files) {
    this.emit('file-list', files);
  }

  // Request queue status
  getQueueStatus() {
    this.emit('get-queue-status');
  }

  // Clear migration queue
  clearQueue() {
    this.emit('clear-queue');
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;

// Also export the class for testing purposes
export { SocketService }; 