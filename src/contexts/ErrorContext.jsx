import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { PhotoMigrationError, ErrorFactory, categorizeError, getErrorSeverity } from '../services/errors/ErrorTypes.js';
import { defaultRetryManager } from '../services/retry/RetryManager.js';

// 初始狀態
const initialState = {
  errors: [],
  dismissedErrors: [],
  globalError: null,
  errorStats: {
    totalErrors: 0,
    errorsByCategory: {},
    errorsBySeverity: {},
    recentErrors: [],
    retryStats: {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0
    }
  },
  settings: {
    autoRetryEnabled: true,
    showErrorNotifications: true,
    maxErrorHistory: 1000,
    errorReportingEnabled: false
  }
};

// Action 類型
const actionTypes = {
  ADD_ERROR: 'ADD_ERROR',
  DISMISS_ERROR: 'DISMISS_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  SET_GLOBAL_ERROR: 'SET_GLOBAL_ERROR',
  CLEAR_GLOBAL_ERROR: 'CLEAR_GLOBAL_ERROR',
  UPDATE_ERROR_STATUS: 'UPDATE_ERROR_STATUS',
  UPDATE_RETRY_STATS: 'UPDATE_RETRY_STATS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  BULK_DISMISS_ERRORS: 'BULK_DISMISS_ERRORS'
};

// 錯誤條目創建函數
const createErrorEntry = (error, context = {}) => {
  const errorEntry = {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    error: error instanceof PhotoMigrationError ? error : ErrorFactory.fromApiError(error, context),
    context: {
      timestamp: new Date(),
      component: context.component || 'Unknown',
      operation: context.operation || 'Unknown',
      userId: context.userId || null,
      sessionId: context.sessionId || null,
      platform: context.platform || null,
      ...context
    },
    status: 'active', // active, dismissed, retrying, resolved
    retryCount: 0,
    lastRetryTime: null,
    dismissed: false,
    userNotified: false
  };

  // 添加錯誤分類和嚴重程度
  errorEntry.category = categorizeError(errorEntry.error);
  errorEntry.severity = getErrorSeverity(errorEntry.error);

  return errorEntry;
};

// Reducer 函數
const errorReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_ERROR: {
      const errorEntry = action.payload;
      const newErrors = [errorEntry, ...state.errors];

      // 限制錯誤歷史數量
      if (newErrors.length > state.settings.maxErrorHistory) {
        newErrors.splice(state.settings.maxErrorHistory);
      }

      // 更新統計
      const newStats = updateErrorStats(state.errorStats, errorEntry);

      return {
        ...state,
        errors: newErrors,
        errorStats: newStats
      };
    }

    case actionTypes.DISMISS_ERROR: {
      const { errorId } = action.payload;
      const errorIndex = state.errors.findIndex(e => e.id === errorId);
      
      if (errorIndex === -1) return state;

      const dismissedError = { ...state.errors[errorIndex], dismissed: true, status: 'dismissed' };
      const newErrors = [...state.errors];
      newErrors[errorIndex] = dismissedError;

      return {
        ...state,
        errors: newErrors,
        dismissedErrors: [...state.dismissedErrors, dismissedError]
      };
    }

    case actionTypes.BULK_DISMISS_ERRORS: {
      const { errorIds } = action.payload;
      const newErrors = state.errors.map(error => 
        errorIds.includes(error.id) 
          ? { ...error, dismissed: true, status: 'dismissed' }
          : error
      );

      const newDismissedErrors = newErrors.filter(e => errorIds.includes(e.id) && e.dismissed);

      return {
        ...state,
        errors: newErrors,
        dismissedErrors: [...state.dismissedErrors, ...newDismissedErrors]
      };
    }

    case actionTypes.CLEAR_ERRORS: {
      return {
        ...state,
        errors: [],
        dismissedErrors: [],
        errorStats: {
          ...state.errorStats,
          recentErrors: []
        }
      };
    }

    case actionTypes.SET_GLOBAL_ERROR: {
      return {
        ...state,
        globalError: action.payload
      };
    }

    case actionTypes.CLEAR_GLOBAL_ERROR: {
      return {
        ...state,
        globalError: null
      };
    }

    case actionTypes.UPDATE_ERROR_STATUS: {
      const { errorId, status, retryCount } = action.payload;
      const newErrors = state.errors.map(error => 
        error.id === errorId 
          ? { 
              ...error, 
              status, 
              retryCount: retryCount ?? error.retryCount,
              lastRetryTime: retryCount > error.retryCount ? new Date() : error.lastRetryTime
            }
          : error
      );

      return {
        ...state,
        errors: newErrors
      };
    }

    case actionTypes.UPDATE_RETRY_STATS: {
      const { totalRetries, successfulRetries, failedRetries } = action.payload;
      return {
        ...state,
        errorStats: {
          ...state.errorStats,
          retryStats: {
            totalRetries: totalRetries ?? state.errorStats.retryStats.totalRetries,
            successfulRetries: successfulRetries ?? state.errorStats.retryStats.successfulRetries,
            failedRetries: failedRetries ?? state.errorStats.retryStats.failedRetries
          }
        }
      };
    }

    case actionTypes.UPDATE_SETTINGS: {
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
    }

    default:
      return state;
  }
};

// 統計更新函數
const updateErrorStats = (currentStats, errorEntry) => {
  const category = errorEntry.category;
  const severity = errorEntry.severity;

  return {
    ...currentStats,
    totalErrors: currentStats.totalErrors + 1,
    errorsByCategory: {
      ...currentStats.errorsByCategory,
      [category]: (currentStats.errorsByCategory[category] || 0) + 1
    },
    errorsBySeverity: {
      ...currentStats.errorsBySeverity,
      [severity]: (currentStats.errorsBySeverity[severity] || 0) + 1
    },
    recentErrors: [errorEntry, ...currentStats.recentErrors.slice(0, 9)] // 保留最近10個錯誤
  };
};

// 創建 Context
const ErrorContext = createContext();

// Custom Hook
export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

// Error Provider 組件
export const ErrorProvider = ({ children, retryManager = defaultRetryManager }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // 添加錯誤
  const addError = useCallback((error, context = {}) => {
    const errorEntry = createErrorEntry(error, context);
    dispatch({ type: actionTypes.ADD_ERROR, payload: errorEntry });
    
    // 如果是關鍵錯誤，設置為全域錯誤
    if (errorEntry.severity === 'critical') {
      dispatch({ type: actionTypes.SET_GLOBAL_ERROR, payload: errorEntry });
    }

    return errorEntry.id;
  }, []);

  // 處理錯誤（包含自動重試邏輯）
  const handleError = useCallback(async (error, context = {}) => {
    const errorId = addError(error, context);
    
    // 自動重試邏輯
    if (state.settings.autoRetryEnabled && error.retryable && context.retryConfig) {
      try {
        dispatch({ 
          type: actionTypes.UPDATE_ERROR_STATUS, 
          payload: { errorId, status: 'retrying' }
        });

        await retryManager.executeWithRetry(
          context.retryOperation,
          {
            retryConfig: context.retryConfig,
            operationId: errorId,
            onRetry: (retryError, attempt) => {
              dispatch({
                type: actionTypes.UPDATE_ERROR_STATUS,
                payload: { errorId, status: 'retrying', retryCount: attempt }
              });
            }
          }
        );

        dispatch({ 
          type: actionTypes.UPDATE_ERROR_STATUS, 
          payload: { errorId, status: 'resolved' }
        });

        // 更新重試統計
        dispatch({
          type: actionTypes.UPDATE_RETRY_STATS,
          payload: { successfulRetries: state.errorStats.retryStats.successfulRetries + 1 }
        });

      } catch (retryError) {
        dispatch({ 
          type: actionTypes.UPDATE_ERROR_STATUS, 
          payload: { errorId, status: 'failed' }
        });

        dispatch({
          type: actionTypes.UPDATE_RETRY_STATS,
          payload: { failedRetries: state.errorStats.retryStats.failedRetries + 1 }
        });
      }
    }

    return errorId;
  }, [addError, state.settings.autoRetryEnabled, state.errorStats.retryStats, retryManager]);

  // 手動重試錯誤
  const retryError = useCallback(async (errorId, retryOperation) => {
    const error = state.errors.find(e => e.id === errorId);
    if (!error || !retryOperation) return false;

    try {
      dispatch({ 
        type: actionTypes.UPDATE_ERROR_STATUS, 
        payload: { errorId, status: 'retrying', retryCount: error.retryCount + 1 }
      });

      await retryOperation();

      dispatch({ 
        type: actionTypes.UPDATE_ERROR_STATUS, 
        payload: { errorId, status: 'resolved' }
      });

      dispatch({
        type: actionTypes.UPDATE_RETRY_STATS,
        payload: { 
          totalRetries: state.errorStats.retryStats.totalRetries + 1,
          successfulRetries: state.errorStats.retryStats.successfulRetries + 1 
        }
      });

      return true;
    } catch (retryError) {
      dispatch({ 
        type: actionTypes.UPDATE_ERROR_STATUS, 
        payload: { errorId, status: 'failed' }
      });

      dispatch({
        type: actionTypes.UPDATE_RETRY_STATS,
        payload: { 
          totalRetries: state.errorStats.retryStats.totalRetries + 1,
          failedRetries: state.errorStats.retryStats.failedRetries + 1 
        }
      });

      // 添加重試失敗的新錯誤
      addError(retryError, { 
        component: 'ErrorRetry', 
        operation: 'Manual Retry',
        originalErrorId: errorId 
      });

      return false;
    }
  }, [state.errors, state.errorStats.retryStats, addError]);

  // 忽略錯誤
  const dismissError = useCallback((errorId) => {
    dispatch({ type: actionTypes.DISMISS_ERROR, payload: { errorId } });
  }, []);

  // 批量忽略錯誤
  const dismissErrors = useCallback((errorIds) => {
    dispatch({ type: actionTypes.BULK_DISMISS_ERRORS, payload: { errorIds } });
  }, []);

  // 清除所有錯誤
  const clearErrors = useCallback(() => {
    dispatch({ type: actionTypes.CLEAR_ERRORS });
  }, []);

  // 設置全域錯誤
  const setGlobalError = useCallback((error, context = {}) => {
    const errorEntry = createErrorEntry(error, context);
    dispatch({ type: actionTypes.SET_GLOBAL_ERROR, payload: errorEntry });
  }, []);

  // 清除全域錯誤
  const clearGlobalError = useCallback(() => {
    dispatch({ type: actionTypes.CLEAR_GLOBAL_ERROR });
  }, []);

  // 更新設定
  const updateSettings = useCallback((newSettings) => {
    dispatch({ type: actionTypes.UPDATE_SETTINGS, payload: newSettings });
  }, []);

  // 取得錯誤過濾器
  const getFilteredErrors = useCallback((filters = {}) => {
    let filtered = state.errors;

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.severity) {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }

    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    if (filters.platform) {
      filtered = filtered.filter(e => e.context.platform === filters.platform);
    }

    if (filters.timeRange) {
      const cutoff = new Date(Date.now() - filters.timeRange);
      filtered = filtered.filter(e => e.context.timestamp > cutoff);
    }

    if (!filters.includeDismissed) {
      filtered = filtered.filter(e => !e.dismissed);
    }

    return filtered;
  }, [state.errors]);

  // Context 值
  const contextValue = useMemo(() => ({
    // 狀態
    state,
    
    // 錯誤管理方法
    addError,
    handleError,
    retryError,
    dismissError,
    dismissErrors,
    clearErrors,
    
    // 全域錯誤管理
    setGlobalError,
    clearGlobalError,
    
    // 設定管理
    updateSettings,
    
    // 查詢方法
    getFilteredErrors,
    
    // 重試管理器
    retryManager
  }), [
    state,
    addError,
    handleError,
    retryError,
    dismissError,
    dismissErrors,
    clearErrors,
    setGlobalError,
    clearGlobalError,
    updateSettings,
    getFilteredErrors,
    retryManager
  ]);

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

export default ErrorContext;