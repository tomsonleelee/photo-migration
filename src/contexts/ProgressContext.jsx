import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// Initial state
const initialState = {
  overall: {
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    percentage: 0,
    isRunning: false,
    startTime: null,
    endTime: null,
    estimatedTime: null
  },
  albums: {},
  files: {},
  errors: [],
  logs: [],
  stats: {
    totalAlbums: 0,
    processedAlbums: 0,
    totalFiles: 0,
    processedFiles: 0,
    successRate: 0,
    averageTime: 0,
    downloadSpeed: 0,
    uploadSpeed: 0
  }
};

// Action types
const actionTypes = {
  INIT_MIGRATION: 'INIT_MIGRATION',
  START_MIGRATION: 'START_MIGRATION',
  STOP_MIGRATION: 'STOP_MIGRATION',
  UPDATE_ALBUM_STATUS: 'UPDATE_ALBUM_STATUS',
  UPDATE_FILE_STATUS: 'UPDATE_FILE_STATUS',
  UPDATE_OVERALL_PROGRESS: 'UPDATE_OVERALL_PROGRESS',
  ADD_ERROR: 'ADD_ERROR',
  ADD_LOG: 'ADD_LOG',
  UPDATE_STATS: 'UPDATE_STATS',
  RESET_PROGRESS: 'RESET_PROGRESS',
  SET_ESTIMATED_TIME: 'SET_ESTIMATED_TIME'
};

// Reducer function
const progressReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.INIT_MIGRATION: {
      const { albumList, fileList } = action.payload;
      const albums = {};
      const files = {};

      // Initialize albums
      if (albumList) {
        albumList.forEach(album => {
          albums[album.id] = {
            id: album.id,
            title: album.title,
            photoCount: album.photoCount || 0,
            status: 'pending',
            progress: 0,
            completedFiles: 0,
            failedFiles: 0,
            error: null,
            startTime: null,
            endTime: null,
            platform: album.metadata?.platform
          };
        });
      }

      // Initialize files
      if (fileList) {
        fileList.forEach(file => {
          files[file.id] = {
            id: file.id,
            name: file.name,
            size: file.size,
            albumId: file.albumId,
            status: 'pending',
            progress: 0,
            error: null,
            startTime: null,
            endTime: null,
            source: file.source,
            destination: file.destination
          };
        });
      }

      const totalFiles = fileList ? fileList.length : 0;
      const totalAlbums = albumList ? albumList.length : 0;

      return {
        ...state,
        overall: {
          ...state.overall,
          total: totalFiles,
          completed: 0,
          failed: 0,
          inProgress: 0,
          percentage: 0
        },
        albums,
        files,
        errors: [],
        logs: [],
        stats: {
          ...state.stats,
          totalAlbums,
          processedAlbums: 0,
          totalFiles,
          processedFiles: 0
        }
      };
    }

    case actionTypes.START_MIGRATION: {
      return {
        ...state,
        overall: {
          ...state.overall,
          isRunning: true,
          startTime: new Date()
        }
      };
    }

    case actionTypes.STOP_MIGRATION: {
      return {
        ...state,
        overall: {
          ...state.overall,
          isRunning: false,
          endTime: new Date()
        }
      };
    }

    case actionTypes.UPDATE_ALBUM_STATUS: {
      const { albumId, status, error } = action.payload;
      const currentAlbum = state.albums[albumId];
      
      if (!currentAlbum) return state;

      // Calculate album progress based on its files
      const albumFiles = Object.values(state.files).filter(file => file.albumId === albumId);
      const completedFiles = albumFiles.filter(file => file.status === 'completed').length;
      const failedFiles = albumFiles.filter(file => file.status === 'failed').length;
      const progress = albumFiles.length > 0 ? ((completedFiles + failedFiles) / albumFiles.length) * 100 : 0;

      const updatedAlbum = {
        ...currentAlbum,
        status,
        progress: Math.round(progress * 100) / 100,
        completedFiles,
        failedFiles,
        error: error ?? null,
        endTime: (status === 'completed' || status === 'failed') ? new Date() : currentAlbum.endTime,
        startTime: currentAlbum.startTime || (status === 'in-progress' ? new Date() : null)
      };

      const updatedAlbums = {
        ...state.albums,
        [albumId]: updatedAlbum
      };

      // Calculate overall album statistics
      const albumArray = Object.values(updatedAlbums);
      const processedAlbums = albumArray.filter(a => a.status === 'completed' || a.status === 'failed').length;

      return {
        ...state,
        albums: updatedAlbums,
        stats: {
          ...state.stats,
          processedAlbums
        }
      };
    }

    case actionTypes.UPDATE_FILE_STATUS: {
      const { fileId, status, progress, error } = action.payload;
      const currentFile = state.files[fileId];
      
      if (!currentFile) return state;

      const updatedFile = {
        ...currentFile,
        status,
        progress: progress ?? currentFile.progress,
        error: error ?? null,
        endTime: (status === 'completed' || status === 'failed') ? new Date() : currentFile.endTime,
        startTime: currentFile.startTime || (status === 'in-progress' ? new Date() : null)
      };

      const updatedFiles = {
        ...state.files,
        [fileId]: updatedFile
      };

      // Calculate overall progress
      const fileArray = Object.values(updatedFiles);
      const completed = fileArray.filter(f => f.status === 'completed').length;
      const failed = fileArray.filter(f => f.status === 'failed').length;
      const inProgress = fileArray.filter(f => f.status === 'in-progress').length;
      const percentage = state.overall.total > 0 ? ((completed + failed) / state.overall.total) * 100 : 0;

      return {
        ...state,
        files: updatedFiles,
        overall: {
          ...state.overall,
          completed,
          failed,
          inProgress,
          percentage: Math.round(percentage * 100) / 100
        },
        stats: {
          ...state.stats,
          processedFiles: completed + failed,
          successRate: (completed + failed) > 0 ? (completed / (completed + failed)) * 100 : 0
        }
      };
    }

    case actionTypes.UPDATE_OVERALL_PROGRESS: {
      return {
        ...state,
        overall: {
          ...state.overall,
          ...action.payload
        }
      };
    }

    case actionTypes.ADD_ERROR: {
      const error = {
        id: Date.now(),
        timestamp: new Date(),
        ...action.payload
      };

      return {
        ...state,
        errors: [...state.errors, error]
      };
    }

    case actionTypes.ADD_LOG: {
      const log = {
        id: Date.now(),
        timestamp: new Date(),
        level: 'info',
        ...action.payload
      };

      return {
        ...state,
        logs: [...state.logs, log].slice(-1000) // Keep only last 1000 logs
      };
    }

    case actionTypes.UPDATE_STATS: {
      return {
        ...state,
        stats: {
          ...state.stats,
          ...action.payload
        }
      };
    }

    case actionTypes.SET_ESTIMATED_TIME: {
      return {
        ...state,
        overall: {
          ...state.overall,
          estimatedTime: action.payload
        }
      };
    }

    case actionTypes.RESET_PROGRESS: {
      return initialState;
    }

    default:
      return state;
  }
};

// Create context
const ProgressContext = createContext();

// Custom hook to use progress context
export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

// Progress Provider Component
export const ProgressProvider = ({ children }) => {
  const [state, dispatch] = useReducer(progressReducer, initialState);

  // Action creators
  const initMigration = useCallback((albumList, fileList) => {
    dispatch({
      type: actionTypes.INIT_MIGRATION,
      payload: { albumList, fileList }
    });
  }, []);

  const startMigration = useCallback(() => {
    dispatch({ type: actionTypes.START_MIGRATION });
  }, []);

  const stopMigration = useCallback(() => {
    dispatch({ type: actionTypes.STOP_MIGRATION });
  }, []);

  const updateAlbumStatus = useCallback((albumId, status, error) => {
    dispatch({
      type: actionTypes.UPDATE_ALBUM_STATUS,
      payload: { albumId, status, error }
    });
  }, []);

  const updateFileStatus = useCallback((fileId, status, progress, error) => {
    dispatch({
      type: actionTypes.UPDATE_FILE_STATUS,
      payload: { fileId, status, progress, error }
    });
  }, []);

  const updateOverallProgress = useCallback((updates) => {
    dispatch({
      type: actionTypes.UPDATE_OVERALL_PROGRESS,
      payload: updates
    });
  }, []);

  const addError = useCallback((error) => {
    dispatch({
      type: actionTypes.ADD_ERROR,
      payload: error
    });
  }, []);

  const addLog = useCallback((message, level = 'info', details = {}) => {
    dispatch({
      type: actionTypes.ADD_LOG,
      payload: { message, level, details }
    });
  }, []);

  const updateStats = useCallback((stats) => {
    dispatch({
      type: actionTypes.UPDATE_STATS,
      payload: stats
    });
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: actionTypes.RESET_PROGRESS });
  }, []);

  // Calculate estimated time
  const calculateEstimatedTime = useCallback(() => {
    if (!state.overall.isRunning || state.overall.completed === 0) {
      return null;
    }

    const elapsedTime = new Date() - state.overall.startTime;
    const avgTimePerFile = elapsedTime / state.overall.completed;
    const remainingFiles = state.overall.total - state.overall.completed - state.overall.failed;
    const estimatedTime = remainingFiles * avgTimePerFile;

    dispatch({
      type: actionTypes.SET_ESTIMATED_TIME,
      payload: estimatedTime
    });

    return estimatedTime;
  }, [state.overall]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    state,
    actions: {
      initMigration,
      startMigration,
      stopMigration,
      updateAlbumStatus,
      updateFileStatus,
      updateOverallProgress,
      addError,
      addLog,
      updateStats,
      resetProgress,
      calculateEstimatedTime
    }
  }), [
    state,
    initMigration,
    startMigration,
    stopMigration,
    updateAlbumStatus,
    updateFileStatus,
    updateOverallProgress,
    addError,
    addLog,
    updateStats,
    resetProgress,
    calculateEstimatedTime
  ]);

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};

export default ProgressContext; 