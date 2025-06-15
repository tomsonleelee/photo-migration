import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import PhotoMigrationSystem from './components/PhotoMigrationSystem';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OAuthCallback from './components/auth/OAuthCallback';
import './App.css';

function App() {
  return (
    <AuthProvider>
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
                  <PhotoMigrationSystem />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
