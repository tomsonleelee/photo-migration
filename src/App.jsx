import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ProgressProvider } from './contexts/ProgressContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import ErrorManagement from './pages/ErrorManagement';
import PhotoMigrationSystem from './components/PhotoMigrationSystem';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OAuthCallback from './components/auth/OAuthCallback';
import './App.css';

function App() {
  return (
    <ErrorBoundary
      name="App"
      errorReportingConfig={{
        enableConsoleLog: true,
        enableLocalStorage: true,
        enableRemoteReporting: process.env.NODE_ENV === 'production'
      }}
    >
      <ErrorProvider>
        <AuthProvider>
          <ProgressProvider>
            <Router>
              <div className="App">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/:platform/callback" element={<OAuthCallback />} />
                  <Route 
                    path="/migration" 
                    element={
                      <ProtectedRoute requirePlatforms={['google']}>
                        <ErrorBoundary name="PhotoMigrationSystem">
                          <PhotoMigrationSystem />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/errors" 
                    element={
                      <ErrorBoundary name="ErrorManagement">
                        <ErrorManagement />
                      </ErrorBoundary>
                    } 
                  />
                </Routes>
              </div>
            </Router>
          </ProgressProvider>
        </AuthProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
