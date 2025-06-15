import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const FacebookLogin = ({ onSuccess, onError, className = '' }) => {
  const { connectPlatform, setLoading, setError } = useAuth();

  // 初始化Facebook SDK
  useEffect(() => {
    // 檢查是否已經載入Facebook SDK
    if (window.FB) {
      return;
    }

    // 動態載入Facebook SDK
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/zh_TW/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
    };

    document.body.appendChild(script);

    return () => {
      // 清理腳本
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleFacebookLogin = () => {
    if (!window.FB) {
      setError('Facebook SDK未載入');
      return;
    }

    setLoading(true);

    window.FB.login((response) => {
      if (response.authResponse) {
        // 登入成功，獲取用戶資訊
        window.FB.api('/me', { fields: 'name,email,picture' }, (userInfo) => {
          try {
            // 連接Facebook平台
            connectPlatform('facebook', response.authResponse.accessToken, {
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture?.data?.url
            });

            // 調用成功回調
            if (onSuccess) {
              onSuccess({
                platform: 'facebook',
                token: response.authResponse.accessToken,
                user: userInfo
              });
            }

            console.log('Facebook login successful:', userInfo);
          } catch (error) {
            console.error('Facebook user info error:', error);
            setError('獲取Facebook用戶資訊失敗');
            
            if (onError) {
              onError(error);
            }
          } finally {
            setLoading(false);
          }
        });
      } else {
        // 登入失敗或用戶取消
        console.log('Facebook login failed or cancelled');
        setError('Facebook登入失敗或已取消');
        
        if (onError) {
          onError(new Error('Login failed or cancelled'));
        }
        
        setLoading(false);
      }
    }, {
      scope: 'email,public_profile,user_photos',
      return_scopes: true
    });
  };

  return (
    <button
      onClick={handleFacebookLogin}
      className={`
        flex items-center justify-center gap-3 px-6 py-3 
        bg-[#1877F2] text-white rounded-lg 
        hover:bg-[#166FE5] focus:outline-none focus:ring-2 
        focus:ring-blue-500 focus:ring-offset-2 
        transition-colors duration-200 font-medium
        ${className}
      `}
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      使用 Facebook 登入
    </button>
  );
};

export default FacebookLogin; 