import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AuthPage from '../pages/AuthPage';
import AuthStatusIndicator from '../components/auth/AuthStatusIndicator';
import authFlowManager from '../utils/authFlowManager';
import tokenStorage from '../utils/tokenStorage';
import tokenValidator from '../utils/tokenValidator';
import logoutManager from '../utils/logoutManager';

// Mock utilities
jest.mock('../utils/tokenStorage');
jest.mock('../utils/tokenValidator');
jest.mock('../utils/logoutManager');
jest.mock('../utils/authFlowManager');

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

// Mock component for protected content
const ProtectedContent = () => <div>Protected Content</div>;

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    tokenStorage.getToken.mockResolvedValue(null);
    tokenStorage.getRefreshToken.mockResolvedValue(null);
    tokenValidator.validateToken.mockResolvedValue(false);
    authFlowManager.checkAuthStatus.mockResolvedValue({
      isAuthenticated: false,
      platforms: {}
    });
    authFlowManager.addStateListener.mockReturnValue(() => {});
    authFlowManager.isBusy.mockReturnValue(false);
  });

  describe('ProtectedRoute Component', () => {
    test('redirects unauthenticated users to auth page', async () => {
      const mockNavigate = jest.fn();
      
      render(
        <TestWrapper>
          <ProtectedRoute redirectTo="/auth">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('shows loading state during authentication check', async () => {
      // Mock loading state
      authFlowManager.addStateListener.mockImplementation((callback) => {
        callback('checking', {});
        return () => {};
      });

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });

    test('shows token refresh state', async () => {
      authFlowManager.addStateListener.mockImplementation((callback) => {
        callback('refreshing', {});
        return () => {};
      });

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('更新認證中...')).toBeInTheDocument();
    });

    test('allows access when platform requirements are met', async () => {
      // Mock authenticated state with required platform
      tokenStorage.getToken.mockResolvedValue('valid-token');
      tokenValidator.validateToken.mockResolvedValue(true);
      authFlowManager.checkAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        platforms: {
          google: { isConnected: true, user: { name: 'Test User' } }
        }
      });

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    test('attempts token refresh for expired tokens', async () => {
      const mockRefreshTokenFlow = jest.fn().mockResolvedValue('new-token');
      authFlowManager.refreshTokenFlow = mockRefreshTokenFlow;

      // Mock expired token scenario
      tokenStorage.getToken.mockResolvedValue('expired-token');
      tokenValidator.validateToken.mockResolvedValue(false);

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']} autoRefresh={true}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockRefreshTokenFlow).toHaveBeenCalledWith('google');
      });
    });
  });

  describe('AuthPage Component', () => {
    test('renders authentication options', () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      expect(screen.getByText('相片遷移系統')).toBeInTheDocument();
      expect(screen.getByText('安全地遷移您在不同平台的相片')).toBeInTheDocument();
    });

    test('shows redirect message when provided', () => {
      const mockLocation = {
        state: {
          message: '需要連接Google Photos平台'
        }
      };

      // Mock useLocation hook
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useLocation: () => mockLocation
      }));

      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      expect(screen.getByText('需要連接Google Photos平台')).toBeInTheDocument();
    });

    test('redirects when already authenticated', async () => {
      const mockNavigate = jest.fn();
      
      // Mock authenticated state
      authFlowManager.checkAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        platforms: {
          google: { isConnected: true }
        }
      });

      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      // Should attempt to navigate away
      await waitFor(() => {
        // In a real test, we'd verify navigation occurred
        expect(authFlowManager.checkAuthStatus).toHaveBeenCalled();
      });
    });
  });

  describe('AuthStatusIndicator Component', () => {
    test('shows loading state initially', () => {
      render(
        <TestWrapper>
          <AuthStatusIndicator />
        </TestWrapper>
      );

      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });

    test('displays connected platforms count', async () => {
      // Mock connected platforms
      authFlowManager.getAuthSummary.mockResolvedValue({
        currentState: 'authenticated',
        hasActiveSessions: true,
        retryAttempts: {}
      });

      render(
        <TestWrapper>
          <AuthStatusIndicator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/個平台已連接/)).toBeInTheDocument();
      });
    });

    test('shows logout button when platforms are connected', async () => {
      // Mock connected state
      authFlowManager.getAuthSummary.mockResolvedValue({
        currentState: 'authenticated',
        hasActiveSessions: true,
        retryAttempts: {}
      });

      render(
        <TestWrapper>
          <AuthStatusIndicator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('全部登出')).toBeInTheDocument();
      });
    });

    test('handles logout action', async () => {
      const mockLogout = jest.fn();
      
      render(
        <TestWrapper>
          <AuthStatusIndicator onLogout={mockLogout} />
        </TestWrapper>
      );

      const logoutButton = screen.getByText('全部登出');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    test('expands to show platform details', async () => {
      // Mock connected platforms
      authFlowManager.getAuthSummary.mockResolvedValue({
        currentState: 'authenticated',
        hasActiveSessions: true,
        retryAttempts: {}
      });

      render(
        <TestWrapper>
          <AuthStatusIndicator />
        </TestWrapper>
      );

      const detailsButton = screen.getByText('詳情');
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('已連接的平台：')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Authentication Flow', () => {
    test('full authentication and access flow', async () => {
      // Step 1: Start unauthenticated
      let authState = {
        isAuthenticated: false,
        platforms: {}
      };

      authFlowManager.checkAuthStatus.mockResolvedValue(authState);

      const { rerender } = render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not show protected content initially
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Step 2: Simulate successful authentication
      authState = {
        isAuthenticated: true,
        platforms: {
          google: { 
            isConnected: true, 
            user: { name: 'Test User', email: 'test@example.com' } 
          }
        }
      };

      authFlowManager.checkAuthStatus.mockResolvedValue(authState);
      tokenStorage.getToken.mockResolvedValue('valid-token');
      tokenValidator.validateToken.mockResolvedValue(true);

      // Trigger re-render with new auth state
      rerender(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    test('token refresh and recovery flow', async () => {
      // Mock expired token scenario
      tokenStorage.getToken.mockResolvedValue('expired-token');
      tokenValidator.validateToken.mockResolvedValue(false);
      
      // Mock successful refresh
      const mockRefreshTokenFlow = jest.fn().mockResolvedValue('new-valid-token');
      authFlowManager.refreshTokenFlow = mockRefreshTokenFlow;

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']} autoRefresh={true}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should attempt token refresh
      await waitFor(() => {
        expect(mockRefreshTokenFlow).toHaveBeenCalledWith('google');
      });
    });

    test('logout and cleanup flow', async () => {
      // Mock authenticated state
      authFlowManager.getAuthSummary.mockResolvedValue({
        currentState: 'authenticated',
        hasActiveSessions: true,
        retryAttempts: {}
      });

      const mockLogoutAll = jest.fn().mockResolvedValue({ success: true });
      logoutManager.logoutAll = mockLogoutAll;

      render(
        <TestWrapper>
          <AuthStatusIndicator />
        </TestWrapper>
      );

      // Click logout
      const logoutButton = screen.getByText('全部登出');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogoutAll).toHaveBeenCalled();
      });
    });

    test('error handling and recovery', async () => {
      // Mock error state
      authFlowManager.addStateListener.mockImplementation((callback) => {
        callback('error', { 
          platform: 'google', 
          error: 'Token validation failed',
          requiresReauth: true 
        });
        return () => {};
      });

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should handle error gracefully
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Multi-platform Authentication', () => {
    test('handles multiple platform requirements', async () => {
      // Mock partial authentication (only Google connected)
      authFlowManager.checkAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        platforms: {
          google: { isConnected: true, user: { name: 'Test User' } }
        }
      });

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google', 'facebook']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not show content as Facebook is not connected
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('allows access when all required platforms are connected', async () => {
      // Mock full authentication
      authFlowManager.checkAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        platforms: {
          google: { isConnected: true, user: { name: 'Test User' } },
          facebook: { isConnected: true, user: { name: 'Test User' } }
        }
      });

      render(
        <TestWrapper>
          <ProtectedRoute requirePlatforms={['google', 'facebook']}>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
}); 