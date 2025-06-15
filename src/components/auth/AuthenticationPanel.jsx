import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleLogin from './GoogleLogin';
import FacebookLogin from './FacebookLogin';
import InstagramLogin from './InstagramLogin';
import FlickrLogin from './FlickrLogin';
import FiveHundredPxLogin from './FiveHundredPxLogin';
import { useAuth } from '../../contexts/AuthContext';

const AuthenticationPanel = ({ onAuthSuccess, className = '' }) => {
  const { loading, error, clearError, platforms } = useAuth();

  const handleLoginSuccess = (authData) => {
    console.log(`${authData.platform} login successful:`, authData);
    
    if (onAuthSuccess) {
      onAuthSuccess(authData);
    }
  };

  const handleLoginError = (error) => {
    console.error('Login error:', error);
  };

  // 獲取已連接的平台
  const connectedPlatforms = Object.entries(platforms)
    .filter(([_, data]) => data.isConnected)
    .map(([platform, _]) => platform);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          連接您的相片平台
        </h2>
        <p className="text-gray-600">
          選擇要連接的平台以開始遷移您的相片
        </p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 已連接平台狀態 */}
      {connectedPlatforms.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-green-800 font-medium mb-2">已連接的平台：</h3>
          <div className="flex flex-wrap gap-2">
            {connectedPlatforms.map(platform => (
              <span
                key={platform}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {platform === 'google' ? 'Google Photos' : 
                 platform === 'facebook' ? 'Facebook' : platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 登入按鈕 */}
      <div className="space-y-4">
        {/* Google登入 */}
        <GoogleOAuthProvider 
          clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'}
        >
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            className={`w-full ${platforms.google.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </GoogleOAuthProvider>

        {/* Facebook登入 */}
        <FacebookLogin
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          className={`w-full ${platforms.facebook.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {/* 其他平台 */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 text-center mb-4">
            其他支援的平台
          </p>
          
          {/* Instagram */}
          <InstagramLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            className={`w-full mb-3 ${platforms.instagram.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          />

          {/* Flickr */}
          <FlickrLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            className={`w-full mb-3 ${platforms.flickr.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          />

          {/* 500px */}
          <FiveHundredPxLogin className="w-full" />
        </div>
      </div>

      {/* 載入狀態 */}
      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">連接中...</span>
        </div>
      )}

      {/* 安全提示 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-blue-800 font-medium">安全保證</h4>
            <p className="text-blue-700 text-sm mt-1">
              我們使用業界標準的OAuth 2.0協議確保您的帳戶安全。
              我們不會儲存您的密碼，只會獲得必要的相片存取權限。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationPanel; 