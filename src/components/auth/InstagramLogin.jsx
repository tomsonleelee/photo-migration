import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const InstagramLogin = ({ onSuccess, onError, className = '' }) => {
  const { setLoading, setError } = useAuth();

  const handleInstagramLogin = () => {
    try {
      setLoading(true);
      
      // Instagram OAuth 2.0 參數
      const clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID';
      const redirectUri = `${window.location.origin}/auth/instagram/callback`;
      const scope = 'user_profile,user_media';
      
      // 建構Instagram授權URL
      const instagramAuthUrl = new URL('https://api.instagram.com/oauth/authorize');
      instagramAuthUrl.searchParams.append('client_id', clientId);
      instagramAuthUrl.searchParams.append('redirect_uri', redirectUri);
      instagramAuthUrl.searchParams.append('scope', scope);
      instagramAuthUrl.searchParams.append('response_type', 'code');
      instagramAuthUrl.searchParams.append('state', generateState());
      
      // 儲存狀態以供驗證
      sessionStorage.setItem('instagram_oauth_state', instagramAuthUrl.searchParams.get('state'));
      
      // 重定向到Instagram授權頁面
      window.location.href = instagramAuthUrl.toString();
      
    } catch (error) {
      console.error('Instagram OAuth initiation error:', error);
      setError('Instagram登入初始化失敗');
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // 生成隨機狀態字串以防CSRF攻擊
  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  return (
    <button
      onClick={handleInstagramLogin}
      className={`
        flex items-center justify-center gap-3 px-6 py-3 
        bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg 
        hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 
        focus:ring-purple-500 focus:ring-offset-2 
        transition-all duration-200 font-medium
        ${className}
      `}
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
      使用 Instagram 登入
    </button>
  );
};

export default InstagramLogin; 