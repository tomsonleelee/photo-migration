import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthenticationPanel from '../components/auth/AuthenticationPanel';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { platforms } = useAuth();

  // 從location state獲取重定向資訊
  const from = location.state?.from?.pathname || '/';
  const message = location.state?.message;

  // 檢查是否已有平台連接，如果有則重定向
  useEffect(() => {
    const connectedPlatforms = Object.values(platforms).some(p => p.isConnected);
    if (connectedPlatforms && !message) {
      navigate(from, { replace: true });
    }
  }, [platforms, navigate, from, message]);

  const handleAuthSuccess = (authData) => {
    console.log('Authentication successful:', authData);
    
    // 短暫延遲後重定向，讓用戶看到成功狀態
    setTimeout(() => {
      navigate(from, { replace: true });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            相片遷移系統
          </h1>
          <p className="text-gray-600">
            安全地遷移您在不同平台的相片
          </p>
        </div>

        {/* 重定向訊息 */}
        {message && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-yellow-500 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-yellow-700">{message}</p>
            </div>
          </div>
        )}

        {/* 認證面板 */}
        <AuthenticationPanel 
          onAuthSuccess={handleAuthSuccess}
          className="mb-6"
        />

        {/* 功能介紹 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            為什麼選擇我們？
          </h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-medium text-gray-900">安全可靠</h4>
                <p className="text-gray-600 text-sm">
                  使用OAuth 2.0標準協議，不儲存您的密碼
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-medium text-gray-900">多平台支援</h4>
                <p className="text-gray-600 text-sm">
                  支援Google Photos、Facebook等主流平台
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="font-medium text-gray-900">簡單易用</h4>
                <p className="text-gray-600 text-sm">
                  直觀的介面，幾步驟完成相片遷移
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 隱私聲明 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            繼續使用即表示您同意我們的
            <a href="#" className="text-blue-600 hover:underline mx-1">
              服務條款
            </a>
            和
            <a href="#" className="text-blue-600 hover:underline mx-1">
              隱私政策
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 