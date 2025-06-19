import { useState } from 'react';
import { Calendar, Image, Lock, Users, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const AlbumCard = ({ 
  album, 
  isSelected, 
  onSelect, 
  onPreview, 
  showStats = true,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const formatDate = (dateString) => {
    if (!dateString) return '未知日期';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPhotoCount = (count) => {
    if (typeof count !== 'number') return '0';
    return count.toLocaleString('zh-TW');
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const renderCoverImage = () => {
    if (imageError || !album.coverPhotoUrl) {
      return (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          <Image className="w-12 h-12 text-gray-400" />
        </div>
      );
    }

    return (
      <div className="relative w-full h-48 overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img
          src={album.coverPhotoUrl}
          alt={album.title || '相簿封面'}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {album.isShared && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
            <Users className="w-4 h-4 text-white" />
          </div>
        )}
        {album.privacy === 'private' && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded-full p-1">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    );
  };

  const renderPlatformBadge = () => {
    const platformIcons = {
      google: '🔵',
      facebook: '📘',
      instagram: '📷',
      flickr: '🌟',
      '500px': '📸'
    };

    const platformColors = {
      google: 'bg-blue-100 text-blue-800',
      facebook: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      flickr: 'bg-purple-100 text-purple-800',
      '500px': 'bg-gray-100 text-gray-800'
    };

    const platform = album.metadata?.platform || 'unknown';
    const icon = platformIcons[platform] || '📁';
    const colorClass = platformColors[platform] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <span className="mr-1">{icon}</span>
        {platform.toUpperCase()}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
      } ${className}`}
    >
      {/* 封面圖片 */}
      <div className="cursor-pointer" onClick={() => onPreview?.(album)}>
        {renderCoverImage()}
      </div>

      {/* 相簿資訊 */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2"
            title={album.title}
          >
            {album.title || '未命名相簿'}
          </h3>
          {renderPlatformBadge()}
        </div>

        {album.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={album.description}>
            {album.description}
          </p>
        )}

        {/* 統計資訊 */}
        {showStats && (
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Image className="w-4 h-4 mr-1" />
                {formatPhotoCount(album.photoCount)} 張照片
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(album.createdAt)}
              </div>
            </div>
            {album.url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(album.url, '_blank');
                }}
                className="text-blue-600 hover:text-blue-700"
                title="在原平台查看"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 選擇按鈕 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPreview?.(album)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            預覽內容
          </button>
          <button
            onClick={() => onSelect?.(album)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelected ? '已選擇' : '選擇'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AlbumCard;