import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlbumCard from '../AlbumCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

describe('AlbumCard', () => {
  const mockAlbum = {
    id: 'album_1',
    title: '測試相簿',
    description: '這是一個測試相簿的描述',
    photoCount: 25,
    coverPhotoUrl: 'https://example.com/cover.jpg',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2023-01-20T15:30:00Z',
    isShared: true,
    privacy: 'public',
    url: 'https://example.com/album/1',
    metadata: { platform: 'facebook' }
  };

  const defaultProps = {
    album: mockAlbum,
    isSelected: false,
    onSelect: jest.fn(),
    onPreview: jest.fn(),
    showStats: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染', () => {
    it('應該正確渲染相簿資訊', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.getByText('測試相簿')).toBeInTheDocument();
      expect(screen.getByText('這是一個測試相簿的描述')).toBeInTheDocument();
      expect(screen.getByText('25 張照片')).toBeInTheDocument();
      expect(screen.getByText('FACEBOOK')).toBeInTheDocument();
    });

    it('應該顯示正確的日期格式', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.getByText(/2023年1月15日/)).toBeInTheDocument();
    });

    it('應該顯示平台標章', () => {
      render(<AlbumCard {...defaultProps} />);

      const platformBadge = screen.getByText('FACEBOOK');
      expect(platformBadge).toBeInTheDocument();
      expect(platformBadge.previousSibling?.textContent).toBe('📘');
    });

    it('應該顯示分享狀態圖標', () => {
      render(<AlbumCard {...defaultProps} />);

      // 檢查是否有分享圖標
      const sharedIcon = screen.getByTestId('users-icon') || 
                        document.querySelector('[data-lucide="users"]');
      expect(sharedIcon).toBeInTheDocument();
    });

    it('選中狀態應該顯示不同樣式', () => {
      const { rerender } = render(<AlbumCard {...defaultProps} />);
      
      const card = screen.getByText('測試相簿').closest('div');
      expect(card).not.toHaveClass('ring-2', 'ring-blue-500');

      rerender(<AlbumCard {...defaultProps} isSelected={true} />);
      expect(card).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('用戶交互', () => {
    it('點擊選擇按鈕應該調用 onSelect', () => {
      render(<AlbumCard {...defaultProps} />);

      const selectButton = screen.getByText('選擇');
      fireEvent.click(selectButton);

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockAlbum);
    });

    it('點擊預覽按鈕應該調用 onPreview', () => {
      render(<AlbumCard {...defaultProps} />);

      const previewButton = screen.getByText('預覽內容');
      fireEvent.click(previewButton);

      expect(defaultProps.onPreview).toHaveBeenCalledWith(mockAlbum);
    });

    it('點擊封面圖片應該調用 onPreview', () => {
      render(<AlbumCard {...defaultProps} />);

      const coverImage = screen.getByAltText('測試相簿');
      fireEvent.click(coverImage);

      expect(defaultProps.onPreview).toHaveBeenCalledWith(mockAlbum);
    });

    it('點擊外部連結應該不調用其他回調', () => {
      render(<AlbumCard {...defaultProps} />);

      const externalLink = screen.getByTitle('在原平台查看');
      fireEvent.click(externalLink);

      expect(defaultProps.onSelect).not.toHaveBeenCalled();
      expect(defaultProps.onPreview).not.toHaveBeenCalled();
    });
  });

  describe('圖片處理', () => {
    it('圖片載入失敗時應該顯示預設圖標', async () => {
      render(<AlbumCard {...defaultProps} />);

      const image = screen.getByAltText('測試相簿');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByTestId('image-icon') || 
               document.querySelector('[data-lucide="image"]')).toBeInTheDocument();
      });
    });

    it('沒有封面圖片時應該顯示預設圖標', () => {
      const albumWithoutCover = { ...mockAlbum, coverPhotoUrl: null };
      render(<AlbumCard {...defaultProps} album={albumWithoutCover} />);

      expect(screen.getByTestId('image-icon') || 
             document.querySelector('[data-lucide="image"]')).toBeInTheDocument();
    });
  });

  describe('邊緣情況', () => {
    it('應該處理缺少標題的相簿', () => {
      const albumWithoutTitle = { ...mockAlbum, title: null };
      render(<AlbumCard {...defaultProps} album={albumWithoutTitle} />);

      expect(screen.getByText('未命名相簿')).toBeInTheDocument();
    });

    it('應該處理缺少描述的相簿', () => {
      const albumWithoutDescription = { ...mockAlbum, description: null };
      render(<AlbumCard {...defaultProps} album={albumWithoutDescription} />);

      expect(screen.queryByText('這是一個測試相簿的描述')).not.toBeInTheDocument();
    });

    it('應該處理缺少照片數量的相簿', () => {
      const albumWithoutPhotoCount = { ...mockAlbum, photoCount: null };
      render(<AlbumCard {...defaultProps} album={albumWithoutPhotoCount} />);

      expect(screen.getByText('0 張照片')).toBeInTheDocument();
    });

    it('應該處理未知平台', () => {
      const albumWithUnknownPlatform = { 
        ...mockAlbum, 
        metadata: { platform: 'unknown' } 
      };
      render(<AlbumCard {...defaultProps} album={albumWithUnknownPlatform} />);

      expect(screen.getByText('📁')).toBeInTheDocument();
      expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    });
  });

  describe('可選功能', () => {
    it('showStats 為 false 時不應該顯示統計資訊', () => {
      render(<AlbumCard {...defaultProps} showStats={false} />);

      expect(screen.queryByText('25 張照片')).not.toBeInTheDocument();
      expect(screen.queryByText(/2023年1月15日/)).not.toBeInTheDocument();
    });

    it('應該支援自定義 className', () => {
      render(<AlbumCard {...defaultProps} className="custom-class" />);

      const card = screen.getByText('測試相簿').closest('div');
      expect(card).toHaveClass('custom-class');
    });

    it('已選擇狀態應該顯示正確的按鈕文字', () => {
      render(<AlbumCard {...defaultProps} isSelected={true} />);

      expect(screen.getByText('已選擇')).toBeInTheDocument();
      expect(screen.queryByText('選擇')).not.toBeInTheDocument();
    });
  });

  describe('隱私設定', () => {
    it('私人相簿應該顯示鎖定圖標', () => {
      const privateAlbum = { ...mockAlbum, privacy: 'private' };
      render(<AlbumCard {...defaultProps} album={privateAlbum} />);

      expect(screen.getByTestId('lock-icon') || 
             document.querySelector('[data-lucide="lock"]')).toBeInTheDocument();
    });

    it('公開相簿不應該顯示鎖定圖標', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
    });
  });

  describe('可訪問性', () => {
    it('圖片應該有適當的 alt 文字', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.getByAltText('測試相簿')).toBeInTheDocument();
    });

    it('按鈕應該有適當的文字', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: '選擇' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '預覽內容' })).toBeInTheDocument();
    });

    it('外部連結應該有適當的 title', () => {
      render(<AlbumCard {...defaultProps} />);

      expect(screen.getByTitle('在原平台查看')).toBeInTheDocument();
    });
  });
});