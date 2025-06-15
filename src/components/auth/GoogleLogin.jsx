import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';

const GoogleLogin = ({ onSuccess, onError, className = '' }) => {
  const { connectPlatform, setLoading, setError } = useAuth();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        
        // 使用access token獲取用戶資訊
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`
        );
        
        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }
        
        const userInfo = await userInfoResponse.json();
        
        // 連接Google平台
        connectPlatform('google', tokenResponse.access_token, {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          verified_email: userInfo.verified_email
        });
        
        // 調用成功回調
        if (onSuccess) {
          onSuccess({
            platform: 'google',
            token: tokenResponse.access_token,
            user: userInfo
          });
        }
        
        console.log('Google login successful:', userInfo);
      } catch (error) {
        console.error('Google login error:', error);
        setError('Google登入失敗');
        
        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      setError('Google OAuth認證失敗');
      
      if (onError) {
        onError(error);
      }
    },
    scope: 'openid profile email https://www.googleapis.com/auth/photoslibrary.readonly',
    flow: 'implicit'
  });

  return (
    <button
      onClick={() => login()}
      className={`
        flex items-center justify-center gap-3 px-6 py-3 
        bg-white border border-gray-300 rounded-lg 
        hover:bg-gray-50 focus:outline-none focus:ring-2 
        focus:ring-blue-500 focus:ring-offset-2 
        transition-colors duration-200 font-medium text-gray-700
        ${className}
      `}
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      使用 Google 登入
    </button>
  );
};

export default GoogleLogin; 