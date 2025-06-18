import { useEffect, useCallback, useRef } from 'react';
import { useProgress } from '../contexts/ProgressContext';
import socketService from '../services/SocketService';

export const useSocketProgress = (autoConnect = true) => {
  const { state, actions } = useProgress();
  const isInitializedRef = useRef(false);

  // Format time duration
  const formatDuration = useCallback((ms) => {
    if (!ms) return 'Unknown';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Handle socket events
  const handleConnectionStatus = useCallback((data) => {
    actions.addLog(
      `Connection ${data.connected ? 'established' : 'lost'}`,
      data.connected ? 'info' : 'warning',
      data
    );
  }, [actions]);

  const handleMigrationStarted = useCallback((data) => {
    actions.startMigration();
    actions.addLog('Migration started', 'info', data);
    
    if (data.fileList) {
      actions.initMigration(data.fileList);
    }
  }, [actions]);

  const handleMigrationCompleted = useCallback((data) => {
    actions.stopMigration();
    actions.addLog(
      `Migration completed successfully in ${formatDuration(data.duration)}`,
      'info',
      data
    );
    
    // Update overall stats
    if (data.stats) {
      actions.updateStats(data.stats);
    }
  }, [actions, formatDuration]);

  const handleMigrationStopped = useCallback((data) => {
    actions.stopMigration();
    actions.addLog(
      data.reason || 'Migration stopped by user',
      'warning',
      data
    );
  }, [actions]);

  const handleFileProgress = useCallback((data) => {
    const { fileId, status, progress, error, details } = data;
    
    actions.updateFileStatus(fileId, status, progress, error);
    
    // Add detailed log for important status changes
    if (status === 'completed') {
      actions.addLog(`File completed: ${details?.fileName || fileId}`, 'info', data);
    } else if (status === 'failed') {
      actions.addLog(`File failed: ${details?.fileName || fileId}`, 'error', data);
      actions.addError({
        fileId,
        fileName: details?.fileName || fileId,
        error: error || 'Unknown error',
        details
      });
    }
  }, [actions]);

  const handleOverallProgress = useCallback((data) => {
    actions.updateOverallProgress(data);
    
    // Calculate and update estimated time
    if (data.completed > 0 && state.overall.isRunning) {
      actions.calculateEstimatedTime();
    }
  }, [actions, state.overall.isRunning]);

  const handleMigrationError = useCallback((data) => {
    actions.addError({
      type: 'migration',
      message: data.message || 'Migration error occurred',
      details: data,
      timestamp: new Date()
    });
    
    actions.addLog(
      `Migration error: ${data.message || 'Unknown error'}`,
      'error',
      data
    );
  }, [actions]);

  const handleMigrationLog = useCallback((data) => {
    actions.addLog(data.message, data.level || 'info', data.details);
  }, [actions]);

  const handleStatsUpdate = useCallback((data) => {
    actions.updateStats(data);
  }, [actions]);

  const handleQueueStatus = useCallback((data) => {
    actions.addLog(
      `Queue status: ${data.waiting} waiting, ${data.active} active, ${data.completed} completed`,
      'info',
      data
    );
    
    // Update stats if available
    if (data.stats) {
      actions.updateStats(data.stats);
    }
  }, [actions]);

  // Initialize socket connection and event listeners
  useEffect(() => {
    if (!autoConnect || isInitializedRef.current) return;

    // Connect to socket
    socketService.connect();

    // Set up event listeners
    socketService.on('connection-status', handleConnectionStatus);
    socketService.on('migration-started', handleMigrationStarted);
    socketService.on('migration-completed', handleMigrationCompleted);
    socketService.on('migration-stopped', handleMigrationStopped);
    socketService.on('file-progress', handleFileProgress);
    socketService.on('overall-progress', handleOverallProgress);
    socketService.on('migration-error', handleMigrationError);
    socketService.on('migration-log', handleMigrationLog);
    socketService.on('stats-update', handleStatsUpdate);
    socketService.on('queue-status', handleQueueStatus);

    isInitializedRef.current = true;

    // Cleanup function
    return () => {
      socketService.off('connection-status', handleConnectionStatus);
      socketService.off('migration-started', handleMigrationStarted);
      socketService.off('migration-completed', handleMigrationCompleted);
      socketService.off('migration-stopped', handleMigrationStopped);
      socketService.off('file-progress', handleFileProgress);
      socketService.off('overall-progress', handleOverallProgress);
      socketService.off('migration-error', handleMigrationError);
      socketService.off('migration-log', handleMigrationLog);
      socketService.off('stats-update', handleStatsUpdate);
      socketService.off('queue-status', handleQueueStatus);
    };
  }, [
    autoConnect,
    handleConnectionStatus,
    handleMigrationStarted,
    handleMigrationCompleted,
    handleMigrationStopped,
    handleFileProgress,
    handleOverallProgress,
    handleMigrationError,
    handleMigrationLog,
    handleStatsUpdate,
    handleQueueStatus
  ]);

  // Socket control methods
  const socketControls = {
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
    reconnect: () => socketService.reconnect(),
    
    startMigration: (config) => {
      socketService.startMigration(config);
    },
    
    stopMigration: () => {
      socketService.stopMigration();
    },
    
    pauseMigration: () => {
      socketService.pauseMigration();
    },
    
    resumeMigration: () => {
      socketService.resumeMigration();
    },
    
    sendFileList: (files) => {
      socketService.sendFileList(files);
    },
    
    requestStatus: () => {
      socketService.requestStatus();
    },
    
    getQueueStatus: () => {
      socketService.getQueueStatus();
    },
    
    clearQueue: () => {
      socketService.clearQueue();
    },
    
    getConnectionStatus: () => socketService.getConnectionStatus(),
    
    isConnected: () => socketService.isSocketConnected(),
    
    waitForConnection: (timeout) => socketService.waitForConnection(timeout)
  };

  return {
    // Progress state and actions
    progress: state,
    progressActions: actions,
    
    // Socket controls
    socket: socketControls,
    
    // Utility functions
    formatDuration,
    
    // Connection status
    isConnected: socketService.isSocketConnected(),
    connectionStatus: socketService.getConnectionStatus()
  };
};

export default useSocketProgress; 