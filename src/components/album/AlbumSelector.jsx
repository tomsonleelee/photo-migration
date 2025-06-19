import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import AlbumBrowser from './AlbumBrowser';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const AlbumSelector = ({ 
  onSelectionComplete, 
  onBack, 
  initialSelection = [],
  platforms = ['facebook', 'instagram', 'flickr', '500px'] 
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]);
  const [albums, setAlbums] = useState({});
  const [selectedAlbums, setSelectedAlbums] = useState(initialSelection);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [stats, setStats] = useState({
    totalAlbums: 0,
    totalPhotos: 0,
    selectedAlbums: 0,
    selectedPhotos: 0
  });

  const { getAuthToken } = useAuth();
  const { showToast } = useToast();

  // 平台配置
  const platformConfigs = {
    facebook: {
      name: 'Facebook',
      icon: '📘',
      color: 'blue',
      description: '從 Facebook 選擇相簿'
    },
    instagram: {
      name: 'Instagram',
      icon: '📷',
      color: 'pink',
      description: '從 Instagram 選擇相簿'
    },
    flickr: {
      name: 'Flickr',
      icon: '🌟',
      color: 'purple',
      description: '從 Flickr 選擇相簿'
    },
    '500px': {
      name: '500px',
      icon: '📸',
      color: 'gray',
      description: '從 500px 選擇相簿'
    }
  };

  const updateStats = useCallback(() => {
    const allAlbums = Object.values(albums).flat();
    const totalPhotos = allAlbums.reduce((sum, album) => sum + (album.photoCount || 0), 0);
    const selectedPhotos = selectedAlbums.reduce((sum, album) => sum + (album.photoCount || 0), 0);

    setStats({
      totalAlbums: allAlbums.length,
      totalPhotos,
      selectedAlbums: selectedAlbums.length,
      selectedPhotos
    });
  }, [albums, selectedAlbums]);

  const loadAlbums = useCallback(async (platform) => {
    setLoading(true);
    setErrors(prev => ({ ...prev, [platform]: null }));

    try {
      const token = await getAuthToken(platform);
      if (!token) {
        throw new Error(`請先連接 ${platformConfigs[platform]?.name} 帳戶`);
      }

      // 這裡應該調用實際的 API 服務
      // 暫時使用模擬數據
      const mockAlbums = await simulateApiCall(platform);
      
      setAlbums(prev => ({
        ...prev,
        [platform]: mockAlbums
      }));

      showToast(`成功載入 ${mockAlbums.length} 個相簿`, 'success');
    } catch (error) {
      const errorMessage = error.message || `載入 ${platformConfigs[platform]?.name} 相簿時發生錯誤`;
      setErrors(prev => ({ ...prev, [platform]: errorMessage }));
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, showToast]);

  useEffect(() => {
    if (selectedPlatform) {
      loadAlbums(selectedPlatform);
    }
  }, [selectedPlatform, loadAlbums]);

  useEffect(() => {
    updateStats();
  }, [updateStats]);


  // 模擬 API 調用（在實際實現中應該替換為真實的 API 調用）
  const simulateApiCall = async (platform) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData = {
      facebook: [
        {
          id: 'fb_1',
          title: '家庭聚會',
          description: '2023年春節家庭聚會照片',
          photoCount: 45,
          coverPhotoUrl: 'https://via.placeholder.com/300x200?text=Family+Gathering',
          createdAt: '2023-02-01T10:00:00Z',
          updatedAt: '2023-02-01T15:30:00Z',
          isShared: true,
          privacy: 'public',
          url: 'https://facebook.com/album/1',
          metadata: { platform: 'facebook' }
        },
        {
          id: 'fb_2',
          title: '旅遊回憶',
          description: '日本旅遊照片集',
          photoCount: 120,
          coverPhotoUrl: 'https://via.placeholder.com/300x200?text=Japan+Travel',
          createdAt: '2023-03-15T08:00:00Z',
          updatedAt: '2023-03-20T20:00:00Z',
          isShared: false,
          privacy: 'private',
          url: 'https://facebook.com/album/2',
          metadata: { platform: 'facebook' }
        }
      ],
      instagram: [
        {
          id: 'ig_1',
          title: '日常生活',
          description: '日常生活記錄',
          photoCount: 80,
          coverPhotoUrl: 'https://via.placeholder.com/300x200?text=Daily+Life',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-06-01T12:00:00Z',
          isShared: true,
          privacy: 'public',
          url: 'https://instagram.com/album/1',
          metadata: { platform: 'instagram' }
        }
      ],
      flickr: [
        {
          id: 'flickr_1',
          title: '風景攝影',
          description: '自然風景攝影作品',
          photoCount: 200,
          coverPhotoUrl: 'https://via.placeholder.com/300x200?text=Landscape',
          createdAt: '2022-12-01T10:00:00Z',
          updatedAt: '2023-05-01T16:00:00Z',
          isShared: true,
          privacy: 'public',
          url: 'https://flickr.com/album/1',
          metadata: { platform: 'flickr' }
        }
      ],
      '500px': [
        {
          id: '500px_1',
          title: '街頭攝影',
          description: '城市街頭攝影集',
          photoCount: 65,
          coverPhotoUrl: 'https://via.placeholder.com/300x200?text=Street+Photography',
          createdAt: '2023-04-01T09:00:00Z',
          updatedAt: '2023-04-15T18:00:00Z',
          isShared: true,
          privacy: 'public',
          url: 'https://500px.com/album/1',
          metadata: { platform: '500px' }
        }
      ]
    };

    return mockData[platform] || [];
  };


  const handlePlatformChange = (platform) => {
    setSelectedPlatform(platform);
  };

  const handleAlbumSelectionChange = (newSelection) => {
    setSelectedAlbums(newSelection);
  };

  const handleComplete = () => {
    if (selectedAlbums.length === 0) {
      showToast('請至少選擇一個相簿', 'warning');
      return;
    }

    onSelectionComplete?.(selectedAlbums);
  };

  const handleRefresh = () => {
    if (selectedPlatform) {
      loadAlbums(selectedPlatform);
    }
  };

  const currentPlatformAlbums = albums[selectedPlatform] || [];
  const currentError = errors[selectedPlatform];

  return (
    <div className="space-y-6">
      {/* 平台選擇器 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">選擇來源平台</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const config = platformConfigs[platform];
            const isSelected = selectedPlatform === platform;
            const hasError = errors[platform];
            const albumCount = (albums[platform] || []).length;

            return (
              <motion.button
                key={platform}
                onClick={() => handlePlatformChange(platform)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-${config.color}-500 bg-${config.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                } ${hasError ? 'border-red-300 bg-red-50' : ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <h3 className="font-medium text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                  {albumCount > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {albumCount} 個相簿
                    </div>
                  )}
                  {hasError && (
                    <div className="mt-2 text-xs text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      載入失敗
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalAlbums}</div>
            <div className="text-sm text-gray-600">總相簿數</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalPhotos.toLocaleString()}</div>
            <div className="text-sm text-gray-600">總照片數</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.selectedAlbums}</div>
            <div className="text-sm text-gray-600">已選相簿</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.selectedPhotos.toLocaleString()}</div>
            <div className="text-sm text-gray-600">將遷移照片</div>
          </div>
        </div>
      </div>

      {/* 相簿瀏覽器 */}
      {selectedPlatform && (
        <AlbumBrowser
          albums={currentPlatformAlbums}
          selectedAlbums={selectedAlbums}
          onSelectionChange={handleAlbumSelectionChange}
          onRefresh={handleRefresh}
          loading={loading}
          error={currentError}
          platform={selectedPlatform}
        />
      )}

      {/* 動作按鈕 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            已選擇 {selectedAlbums.length} 個相簿，共 {stats.selectedPhotos.toLocaleString()} 張照片
          </div>
          <Button
            onClick={handleComplete}
            disabled={selectedAlbums.length === 0}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>確認選擇</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlbumSelector;