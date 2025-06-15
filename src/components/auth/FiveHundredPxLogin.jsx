import React from 'react';

const FiveHundredPxLogin = ({ className = '' }) => {
  const handleUnavailableClick = () => {
    alert('500px API 目前不再對新應用程式開放。如果您有現有的API存取權限，請聯繫開發團隊進行整合。');
  };

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={handleUnavailableClick}
        disabled
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed transition-colors duration-200 font-medium"
      >
        <div className="w-5 h-5 bg-black rounded opacity-50"></div>
        500px (API 不可用)
      </button>
      
      {/* 說明提示 */}
      <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
        <div className="flex items-start">
          <svg
            className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium">API 存取限制</p>
            <p className="mt-1">
              500px 已停止為新應用程式提供 API 存取權限。
              現有的整合可能仍然有效，但新的開發者無法獲得 API 金鑰。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiveHundredPxLogin; 