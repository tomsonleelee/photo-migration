import { useState, useMemo } from 'react';
import { Search, Filter, Grid, List, RefreshCw, AlertCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AlbumCard from './AlbumCard';
import AlbumPreview from './AlbumPreview';
import Dropdown from '../ui/Dropdown';
import Button from '../ui/Button';

const AlbumBrowser = ({ 
  albums = [], 
  selectedAlbums = [], 
  onSelectionChange,
  onRefresh,
  loading = false,
  error = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [previewAlbum, setPreviewAlbum] = useState(null);

  // 搜尋和過濾邏輯
  const filteredAndSortedAlbums = useMemo(() => {
    let filtered = albums;

    // 搜尋過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(album =>
        album.title?.toLowerCase().includes(term) ||
        album.description?.toLowerCase().includes(term)
      );
    }

    // 類型過濾
    switch (filterBy) {
      case 'shared':
        filtered = filtered.filter(album => album.isShared);
        break;
      case 'private':
        filtered = filtered.filter(album => !album.isShared);
        break;
      case 'hasPhotos':
        filtered = filtered.filter(album => album.photoCount > 0);
        break;
      case 'empty':
        filtered = filtered.filter(album => album.photoCount === 0);
        break;
      default:
        break;
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // 處理日期排序
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      // 處理數字排序
      if (sortBy === 'photoCount') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // 處理字串排序
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [albums, searchTerm, sortBy, sortOrder, filterBy]);

  // 選擇處理
  const handleAlbumSelect = (album) => {
    const isSelected = selectedAlbums.some(selected => selected.id === album.id);
    let newSelection;

    if (isSelected) {
      newSelection = selectedAlbums.filter(selected => selected.id !== album.id);
    } else {
      newSelection = [...selectedAlbums, album];
    }

    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedAlbums.length === filteredAndSortedAlbums.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(filteredAndSortedAlbums);
    }
  };

  // 排序選項
  const sortOptions = [
    { value: 'createdAt', label: '建立日期' },
    { value: 'updatedAt', label: '更新日期' },
    { value: 'title', label: '標題' },
    { value: 'photoCount', label: '照片數量' }
  ];

  // 過濾選項
  const filterOptions = [
    { value: 'all', label: '全部相簿' },
    { value: 'shared', label: '已分享' },
    { value: 'private', label: '私人' },
    { value: 'hasPhotos', label: '有照片' },
    { value: 'empty', label: '空相簿' }
  ];

  // 統計資訊
  const stats = {
    total: albums.length,
    filtered: filteredAndSortedAlbums.length,
    selected: selectedAlbums.length,
    totalPhotos: albums.reduce((sum, album) => sum + (album.photoCount || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* 工具列 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 搜尋和過濾 */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜尋相簿..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              />
            </div>

            {/* 排序 */}
            <div className="flex space-x-2">
              <Dropdown
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                placeholder="排序方式"
                className="w-32"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* 過濾 */}
            <Dropdown
              options={filterOptions}
              value={filterBy}
              onChange={setFilterBy}
              placeholder="過濾條件"
              className="w-32"
            />
          </div>

          {/* 檢視模式和動作 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>重新整理</span>
            </Button>

            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-l ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>共 {stats.total} 個相簿</span>
            <span>顯示 {stats.filtered} 個</span>
            <span>已選擇 {stats.selected} 個</span>
            <span>總計 {stats.totalPhotos.toLocaleString()} 張照片</span>
          </div>
          {stats.filtered > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedAlbums.length === filteredAndSortedAlbums.length ? '取消全選' : '全選'}
            </Button>
          )}
        </div>
      </div>

      {/* 錯誤狀態 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* 載入狀態 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">載入相簿中...</span>
        </div>
      )}

      {/* 相簿列表 */}
      {!loading && filteredAndSortedAlbums.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          <AnimatePresence>
            {filteredAndSortedAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                isSelected={selectedAlbums.some(selected => selected.id === album.id)}
                onSelect={handleAlbumSelect}
                onPreview={setPreviewAlbum}
                className={viewMode === 'list' ? 'flex' : ''}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 空狀態 */}
      {!loading && filteredAndSortedAlbums.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterBy !== 'all' ? '找不到符合條件的相簿' : '沒有相簿'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterBy !== 'all' 
              ? '請嘗試調整搜尋條件或過濾設定'
              : '請確認已連接平台並有相簿資料'
            }
          </p>
        </div>
      )}

      {/* 相簿預覽模態框 */}
      {previewAlbum && (
        <AlbumPreview
          album={previewAlbum}
          isOpen={!!previewAlbum}
          onClose={() => setPreviewAlbum(null)}
          onSelect={() => handleAlbumSelect(previewAlbum)}
          isSelected={selectedAlbums.some(selected => selected.id === previewAlbum.id)}
        />
      )}
    </div>
  );
};

export default AlbumBrowser;