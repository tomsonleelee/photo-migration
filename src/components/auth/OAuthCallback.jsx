import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { platform } = useParams();
  const { connectPlatform, setError, setLoading } = useAuth();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    handleOAuthCallback();
  }, [location, platform]);

  const handleOAuthCallback = async () => {
    try {
      setLoading(true);
      setStatus('processing');

      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // 檢查是否有錯誤
      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      // 檢查是否有授權碼
      if (!code) {
        throw new Error('未收到授權碼');
      }

      // 驗證狀態參數以防CSRF攻擊
      const savedState = sessionStorage.getItem(`${platform}_oauth_state`);
      if (state !== savedState) {
        throw new Error('狀態參數不匹配，可能存在安全風險');
      }

      // 根據平台處理不同的OAuth流程
      switch (platform) {
        case 'instagram':
          await handleInstagramCallback(code);
          break;
        case 'flickr':
          await handleFlickrCallback(code);
          break;
        default:
          throw new Error(`不支援的平台: ${platform}`);
      }

      setStatus('success');
      
      // 清理狀態
      sessionStorage.removeItem(`${platform}_oauth_state`);
      
      // 延遲重定向以顯示成功訊息
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (error) {
      console.error(`${platform} OAuth callback error:`, error);
      setError(error.message || `${platform}認證失敗`);
      setStatus('error');
      
      // 延遲重定向到認證頁面
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramCallback = async (code) => {
    // 注意：在實際應用中，這個token交換應該在後端進行
    // 這裡只是示範前端流程
    
    const response = await fetch('/api/auth/instagram/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${window.location.origin}/auth/instagram/callback`
      }),
    });

    if (!response.ok) {
      throw new Error('Instagram token交換失敗');
    }

    const data = await response.json();
    
    // 獲取用戶資訊
    const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${data.access_token}`);
    
    if (!userResponse.ok) {
      throw new Error('獲取Instagram用戶資訊失敗');
    }

    const userInfo = await userResponse.json();

    // 連接平台
    connectPlatform('instagram', data.access_token, {
      id: userInfo.id,
      username: userInfo.username
    });
  };

  const handleFlickrCallback = async (code) => {
    // 注意：在實際應用中，這個token交換應該在後端進行
    // 這裡只是示範前端流程
    
    const response = await fetch('/api/auth/flickr/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${window.location.origin}/auth/flickr/callback`
      }),
    });

    if (!response.ok) {
      throw new Error('Flickr token交換失敗');
    }

    const data = await response.json();
    
    // 獲取用戶資訊
    const userResponse = await fetch(`https://api.flickr.com/services/rest/?method=flickr.test.login&api_key=${import.meta.env.VITE_FLICKR_API_KEY}&format=json&nojsoncallback=1`, {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('獲取Flickr用戶資訊失敗');
    }

    const userInfo = await userResponse.json();

    // 連接平台
    connectPlatform('flickr', data.access_token, {
      id: userInfo.user.id,
      username: userInfo.user.username._content
    });
  };

  const renderStatus = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              處理{platform}認證中...
            </h2>
            <p className="text-gray-600">
              請稍候，我們正在驗證您的帳戶
            </p>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {platform}認證成功！
            </h2>
            <p className="text-gray-600">
              正在重定向到主頁面...
            </p>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              認證失敗
            </h2>
            <p className="text-gray-600">
              正在重定向到登入頁面...
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {renderStatus()}
      </div>
    </div>
  );
};

export default OAuthCallback; 