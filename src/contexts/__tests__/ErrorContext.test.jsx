import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorProvider, useError } from '../ErrorContext';
import { NetworkError, AuthenticationError } from '../../services/errors/ErrorTypes.js';

// 測試組件
const TestErrorComponent = ({ onError, onRetry }) => {
  const { 
    state, 
    addError, 
    handleError, 
    retryError, 
    dismissError, 
    clearErrors,
    getFilteredErrors
  } = useError();

  const handleAddError = () => {
    const error = new NetworkError('測試網路錯誤');
    const errorId = addError(error, { component: 'TestComponent', operation: 'testOperation' });
    onError?.(errorId);
  };

  const handleAddAuthError = () => {
    const error = new AuthenticationError('認證失敗', 'facebook');
    addError(error, { component: 'TestComponent', operation: 'auth' });
  };

  const handleRetryError = async () => {
    if (state.errors.length > 0) {
      const success = await retryError(state.errors[0].id, onRetry);
      return success;
    }
  };

  const handleGetFilteredErrors = () => {
    return getFilteredErrors({ severity: 'error' });
  };

  return (
    <div>
      <div data-testid="error-count">{state.errors.length}</div>
      <div data-testid="dismissed-count">{state.dismissedErrors.length}</div>
      <div data-testid="total-errors">{state.errorStats.totalErrors}</div>
      <div data-testid="global-error">
        {state.globalError ? state.globalError.error.message : 'none'}
      </div>
      
      <button onClick={handleAddError} data-testid="add-error">
        添加錯誤
      </button>
      <button onClick={handleAddAuthError} data-testid="add-auth-error">
        添加認證錯誤
      </button>
      <button onClick={handleRetryError} data-testid="retry-error">
        重試錯誤
      </button>
      <button onClick={() => dismissError(state.errors[0]?.id)} data-testid="dismiss-error">
        忽略錯誤
      </button>
      <button onClick={clearErrors} data-testid="clear-errors">
        清除錯誤
      </button>
      <button onClick={handleGetFilteredErrors} data-testid="filter-errors">
        過濾錯誤
      </button>
      
      {state.errors.map((error) => (
        <div key={error.id} data-testid={`error-${error.id}`}>
          {error.error.message} - {error.status}
        </div>
      ))}
    </div>
  );
};

// Mock RetryManager
const mockRetryManager = {
  executeWithRetry: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    totalOperations: 0,
    successRate: 0,
    totalRetries: 0,
    activeRetries: []
  })
};

describe('ErrorContext', () => {
  const renderWithProvider = (component, retryManager = mockRetryManager) => {
    return render(
      <ErrorProvider retryManager={retryManager}>
        {component}
      </ErrorProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addError', () => {
    it('應該添加錯誤到狀態', () => {
      const onError = jest.fn();
      renderWithProvider(<TestErrorComponent onError={onError} />);

      fireEvent.click(screen.getByTestId('add-error'));

      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total-errors')).toHaveTextContent('1');
      expect(onError).toHaveBeenCalled();
    });

    it('應該設置關鍵錯誤為全域錯誤', () => {
      renderWithProvider(<TestErrorComponent />);

      fireEvent.click(screen.getByTestId('add-auth-error'));

      expect(screen.getByTestId('global-error')).toHaveTextContent('認證失敗');
    });

    it('應該更新錯誤統計', () => {
      renderWithProvider(<TestErrorComponent />);

      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-auth-error'));

      expect(screen.getByTestId('total-errors')).toHaveTextContent('2');
    });
  });

  describe('dismissError', () => {
    it('應該忽略錯誤', async () => {
      renderWithProvider(<TestErrorComponent />);

      // 添加錯誤
      fireEvent.click(screen.getByTestId('add-error'));
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');

      // 忽略錯誤
      fireEvent.click(screen.getByTestId('dismiss-error'));

      await waitFor(() => {
        expect(screen.getByTestId('dismissed-count')).toHaveTextContent('1');
      });
    });
  });

  describe('clearErrors', () => {
    it('應該清除所有錯誤', () => {
      renderWithProvider(<TestErrorComponent />);

      // 添加多個錯誤
      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-auth-error'));
      expect(screen.getByTestId('error-count')).toHaveTextContent('2');

      // 清除錯誤
      fireEvent.click(screen.getByTestId('clear-errors'));

      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      expect(screen.getByTestId('dismissed-count')).toHaveTextContent('0');
    });
  });

  describe('retryError', () => {
    it('應該成功重試錯誤', async () => {
      const onRetry = jest.fn().mockResolvedValue('success');
      renderWithProvider(<TestErrorComponent onRetry={onRetry} />);

      // 添加錯誤
      fireEvent.click(screen.getByTestId('add-error'));

      // 重試錯誤
      fireEvent.click(screen.getByTestId('retry-error'));

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });
    });

    it('應該處理重試失敗', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('重試失敗'));
      renderWithProvider(<TestErrorComponent onRetry={onRetry} />);

      // 添加錯誤
      fireEvent.click(screen.getByTestId('add-error'));

      // 重試錯誤（應該失敗）
      fireEvent.click(screen.getByTestId('retry-error'));

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
        // 應該添加新的重試失敗錯誤
        expect(screen.getByTestId('error-count')).toHaveTextContent('2');
      });
    });
  });

  describe('handleError', () => {
    it('應該處理帶有重試配置的錯誤', async () => {
      const mockRetryOperation = jest.fn().mockResolvedValue('success');
      
      mockRetryManager.executeWithRetry.mockResolvedValue('success');

      const TestComponent = () => {
        const { handleError } = useError();

        const handleTestError = async () => {
          const error = new NetworkError('網路錯誤');
          await handleError(error, {
            retryConfig: { maxAttempts: 3 },
            retryOperation: mockRetryOperation
          });
        };

        return (
          <button onClick={handleTestError} data-testid="handle-error">
            處理錯誤
          </button>
        );
      };

      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId('handle-error'));

      await waitFor(() => {
        expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
      });
    });
  });

  describe('getFilteredErrors', () => {
    it('應該根據條件過濾錯誤', () => {
      const TestComponent = () => {
        const { addError, getFilteredErrors } = useError();

        const handleAddErrors = () => {
          addError(new NetworkError('網路錯誤1'), { component: 'Test' });
          addError(new AuthenticationError('認證錯誤', 'facebook'), { component: 'Test' });
          addError(new NetworkError('網路錯誤2'), { component: 'Test' });
        };

        const handleFilterBySeverity = () => {
          const filtered = getFilteredErrors({ severity: 'critical' });
          return filtered.length;
        };

        return (
          <div>
            <button onClick={handleAddErrors} data-testid="add-multiple-errors">
              添加多個錯誤
            </button>
            <div data-testid="filtered-count">
              {handleFilterBySeverity()}
            </div>
          </div>
        );
      };

      renderWithProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId('add-multiple-errors'));

      // 應該只有認證錯誤（severity: 'critical'）被過濾出來
      expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
    });
  });

  describe('錯誤統計', () => {
    it('應該正確計算錯誤統計', () => {
      renderWithProvider(<TestErrorComponent />);

      // 添加不同類型的錯誤
      fireEvent.click(screen.getByTestId('add-error')); // NetworkError (warning)
      fireEvent.click(screen.getByTestId('add-auth-error')); // AuthenticationError (error)

      expect(screen.getByTestId('total-errors')).toHaveTextContent('2');
    });
  });

  describe('設定管理', () => {
    it('應該更新設定', () => {
      const TestComponent = () => {
        const { state, updateSettings } = useError();

        return (
          <div>
            <div data-testid="auto-retry">
              {state.settings.autoRetryEnabled ? 'enabled' : 'disabled'}
            </div>
            <button 
              onClick={() => updateSettings({ autoRetryEnabled: false })}
              data-testid="disable-auto-retry"
            >
              禁用自動重試
            </button>
          </div>
        );
      };

      renderWithProvider(<TestComponent />);

      expect(screen.getByTestId('auto-retry')).toHaveTextContent('enabled');

      fireEvent.click(screen.getByTestId('disable-auto-retry'));

      expect(screen.getByTestId('auto-retry')).toHaveTextContent('disabled');
    });
  });

  describe('錯誤界限檢測', () => {
    it('應該在沒有 Provider 時拋出錯誤', () => {
      // 抑制 console.error 以避免測試輸出污染
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestErrorComponent />);
      }).toThrow('useError must be used within an ErrorProvider');

      console.error = originalError;
    });
  });
});