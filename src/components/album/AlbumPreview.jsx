import { useState, useEffect } from 'react';
import { X, Image, Calendar, Lock, Users, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const AlbumPreview = ({ 
  album, 
  isOpen, 
  onClose, 
  onSelect, 
  isSelected = false,
  onLoadPhotos
}) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const loadAlbumPhotos = async () => {
    if (!album || !onLoadPhotos) return;

    setLoading(true);
    setError(null);
    try {
      const albumPhotos = await onLoadPhotos(album.id, album.metadata?.platform);
      setPhotos(albumPhotos || []);
    } catch (err) {
      setError('載入相簿照片時發生錯誤');
      console.error('Error loading album photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && album && onLoadPhotos) {
      loadAlbumPhotos();
    }
  }, [isOpen, album, onLoadPhotos, loadAlbumPhotos]);

  const formatDate = (dateString) => {
    if (!dateString) return '未知日期';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const handlePhotoSelect = (photo) => {
    const isPhotoSelected = selectedPhotos.some(p => p.id === photo.id);
    if (isPhotoSelected) {
      setSelectedPhotos(selectedPhotos.filter(p => p.id !== photo.id));
    } else {
      setSelectedPhotos([...selectedPhotos, photo]);
    }
  };

  const handleSelectAllPhotos = () => {
    if (selectedPhotos.length === photos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos([...photos]);
    }
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

    const platform = album?.metadata?.platform || 'unknown';
    const icon = platformIcons[platform] || '📁';
    const colorClass = platformColors[platform] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <span className="mr-1">{icon}</span>
        {platform.toUpperCase()}
      </span>
    );
  };

  const renderPhotoGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">載入失敗</div>
          <Button variant="outline" size="sm" onClick={loadAlbumPhotos}>
            重試
          </Button>
        </div>
      );
    }

    if (photos.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Image className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>此相簿沒有照片</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
              selectedPhotos.some(p => p.id === photo.id)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => handlePhotoSelect(photo)}
          >
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.title || '照片'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {selectedPhotos.some(p => p.id === photo.id) && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <div className="text-white text-xs truncate">{photo.title || '未命名'}</div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (!album) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {album.title || '未命名相簿'}
            </h2>
            {renderPlatformBadge()}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 相簿資訊 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {album.description && (
                <p className="text-gray-700 mb-3">{album.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Image className="w-4 h-4 mr-2" />
                  {album.photoCount || 0} 張照片
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  建立於 {formatDate(album.createdAt)}
                </div>
                {album.updatedAt && album.updatedAt !== album.createdAt && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    更新於 {formatDate(album.updatedAt)}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                {album.privacy === 'private' ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-gray-600">私人相簿</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2 text-green-500" />
                    <span className="text-gray-600">
                      {album.isShared ? '已分享' : '公開'}
                    </span>
                  </>
                )}
              </div>
              {album.url && (
                <div className="flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2 text-blue-500" />
                  <a
                    href={album.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    在原平台查看
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 照片選擇工具列 */}
        {photos.length > 0 && (
          <div className="px-6 py-3 border-b bg-white flex items-center justify-between">
            <div className="text-sm text-gray-600">
              已選擇 {selectedPhotos.length} / {photos.length} 張照片
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllPhotos}
              >
                {selectedPhotos.length === photos.length ? '取消全選' : '全選照片'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAlbumPhotos}
                disabled={loading}
              >
                重新載入
              </Button>
            </div>
          </div>
        )}

        {/* 照片網格 */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderPhotoGrid()}
        </div>

        {/* 動作按鈕 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={() => {
              onSelect?.(album);
              onClose();
            }}
            disabled={loading}
            className={isSelected ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isSelected ? '已選擇此相簿' : '選擇此相簿'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AlbumPreview;