import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const FlickrLogin = ({ onSuccess, onError, className = '' }) => {
  const { setLoading, setError } = useAuth();

  const handleFlickrLogin = () => {
    try {
      setLoading(true);
      
      // Flickr OAuth 2.0 參數
      const apiKey = import.meta.env.VITE_FLICKR_API_KEY || 'YOUR_FLICKR_API_KEY';
      const redirectUri = `${window.location.origin}/auth/flickr/callback`;
      const perms = 'read'; // 權限：read, write, delete
      
      // 建構Flickr授權URL
      const flickrAuthUrl = new URL('https://www.flickr.com/services/oauth/authorize');
      flickrAuthUrl.searchParams.append('oauth_consumer_key', apiKey);
      flickrAuthUrl.searchParams.append('perms', perms);
      flickrAuthUrl.searchParams.append('response_type', 'code');
      flickrAuthUrl.searchParams.append('redirect_uri', redirectUri);
      flickrAuthUrl.searchParams.append('state', generateState());
      
      // 儲存狀態以供驗證
      sessionStorage.setItem('flickr_oauth_state', flickrAuthUrl.searchParams.get('state'));
      
      // 重定向到Flickr授權頁面
      window.location.href = flickrAuthUrl.toString();
      
    } catch (error) {
      console.error('Flickr OAuth initiation error:', error);
      setError('Flickr登入初始化失敗');
      
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
      onClick={handleFlickrLogin}
      className={`
        flex items-center justify-center gap-3 px-6 py-3 
        bg-[#0063DC] text-white rounded-lg 
        hover:bg-[#0052B3] focus:outline-none focus:ring-2 
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
        <path d="M5.334 6.666c0-.92.747-1.667 1.667-1.667.92 0 1.666.747 1.666 1.667 0 .92-.746 1.666-1.666 1.666-.92 0-1.667-.746-1.667-1.666zm10 0c0-.92.747-1.667 1.667-1.667.92 0 1.666.747 1.666 1.667 0 .92-.746 1.666-1.666 1.666-.92 0-1.667-.746-1.667-1.666zM7.001 10c-.92 0-1.667.746-1.667 1.666 0 .92.747 1.667 1.667 1.667.92 0 1.666-.747 1.666-1.667 0-.92-.746-1.666-1.666-1.666zm10 0c-.92 0-1.667.746-1.667 1.666 0 .92.747 1.667 1.667 1.667.92 0 1.666-.747 1.666-1.667 0-.92-.746-1.666-1.666-1.666zM7.001 15c-.92 0-1.667.746-1.667 1.666 0 .92.747 1.667 1.667 1.667.92 0 1.666-.747 1.666-1.667 0-.92-.746-1.666-1.666-1.666zm10 0c-.92 0-1.667.746-1.667 1.666 0 .92.747 1.667 1.667 1.667.92 0 1.666-.747 1.666-1.667 0-.92-.746-1.666-1.666-1.666z"/>
      </svg>
      使用 Flickr 登入
    </button>
  );
};

export default FlickrLogin; 