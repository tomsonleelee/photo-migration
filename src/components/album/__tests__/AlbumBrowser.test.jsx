import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlbumBrowser from '../AlbumBrowser';

// Mock components
jest.mock('../AlbumCard', () => ({
  default: ({ album, isSelected, onSelect, onPreview }) => (
    <div data-testid={`album-card-${album.id}`}>
      <h3>{album.title}</h3>
      <span>{album.photoCount} 張照片</span>
      <button onClick={() => onSelect(album)}>
        {isSelected ? '已選擇' : '選擇'}
      </button>
      <button onClick={() => onPreview(album)}>預覽</button>
    </div>
  )
}));

jest.mock('../AlbumPreview', () => ({
  default: ({ album, isOpen, onClose }) => 
    isOpen ? (
      <div data-testid="album-preview">
        <h2>{album.title}</h2>
        <button onClick={onClose}>關閉</button>
      </div>
    ) : null
}));

jest.mock('../../ui/Dropdown', () => ({
  default: ({ options, value, onChange, placeholder }) => (
    <select 
      data-testid="dropdown"
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}));

jest.mock('../../ui/Button', () => ({
  default: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <div>{children}</div>
}));

describe('AlbumBrowser', () => {
  const mockAlbums = [
    {
      id: 'album_1',
      title: 'Facebook 相簿',
      description: 'Facebook 相簿描述',
      photoCount: 25,
      createdAt: '2023-01-15T10:00:00Z',
      isShared: true,
      metadata: { platform: 'facebook' }
    },
    {
      id: 'album_2',
      title: 'Instagram 相簿',
      description: 'Instagram 相簿描述',
      photoCount: 50,
      createdAt: '2023-02-20T15:30:00Z',
      isShared: false,
      metadata: { platform: 'instagram' }
    },
    {
      id: 'album_3',
      title: '空相簿',
      description: '沒有照片的相簿',
      photoCount: 0,
      createdAt: '2023-03-10T08:00:00Z',
      isShared: false,
      metadata: { platform: 'flickr' }
    }
  ];

  const defaultProps = {
    albums: mockAlbums,
    selectedAlbums: [],
    onSelectionChange: jest.fn(),
    onRefresh: jest.fn(),
    loading: false,
    error: null,
    platform: 'all'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染', () => {
    it('應該正確渲染所有相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      expect(screen.getByText('Facebook 相簿')).toBeInTheDocument();
      expect(screen.getByText('Instagram 相簿')).toBeInTheDocument();
      expect(screen.getByText('空相簿')).toBeInTheDocument();
    });

    it('應該顯示正確的統計資訊', () => {
      render(<AlbumBrowser {...defaultProps} />);

      expect(screen.getByText('共 3 個相簿')).toBeInTheDocument();
      expect(screen.getByText('顯示 3 個')).toBeInTheDocument();
      expect(screen.getByText('已選擇 0 個')).toBeInTheDocument();
      expect(screen.getByText('總計 75 張照片')).toBeInTheDocument();
    });

    it('應該顯示搜尋框和控制項', () => {
      render(<AlbumBrowser {...defaultProps} />);

      expect(screen.getByPlaceholderText('搜尋相簿...')).toBeInTheDocument();
      expect(screen.getByText('重新整理')).toBeInTheDocument();
      expect(screen.getByText('全選')).toBeInTheDocument();
    });
  });

  describe('搜尋功能', () => {
    it('應該根據標題搜尋相簿', async () => {
      render(<AlbumBrowser {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜尋相簿...');
      fireEvent.change(searchInput, { target: { value: 'Facebook' } });

      await waitFor(() => {
        expect(screen.getByText('Facebook 相簿')).toBeInTheDocument();
        expect(screen.queryByText('Instagram 相簿')).not.toBeInTheDocument();
        expect(screen.queryByText('空相簿')).not.toBeInTheDocument();
      });
    });

    it('應該根據描述搜尋相簿', async () => {
      render(<AlbumBrowser {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜尋相簿...');
      fireEvent.change(searchInput, { target: { value: '沒有照片' } });

      await waitFor(() => {
        expect(screen.getByText('空相簿')).toBeInTheDocument();
        expect(screen.queryByText('Facebook 相簿')).not.toBeInTheDocument();
        expect(screen.queryByText('Instagram 相簿')).not.toBeInTheDocument();
      });
    });

    it('搜尋不到結果時應該顯示空狀態', async () => {
      render(<AlbumBrowser {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜尋相簿...');
      fireEvent.change(searchInput, { target: { value: '不存在的相簿' } });

      await waitFor(() => {
        expect(screen.getByText('找不到符合條件的相簿')).toBeInTheDocument();
      });
    });
  });

  describe('過濾功能', () => {
    it('應該過濾已分享的相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const filterDropdown = screen.getByDisplayValue('全部相簿');
      fireEvent.change(filterDropdown, { target: { value: 'shared' } });

      expect(screen.getByText('Facebook 相簿')).toBeInTheDocument();
      expect(screen.queryByText('Instagram 相簿')).not.toBeInTheDocument();
      expect(screen.queryByText('空相簿')).not.toBeInTheDocument();
    });

    it('應該過濾私人相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const filterDropdown = screen.getByDisplayValue('全部相簿');
      fireEvent.change(filterDropdown, { target: { value: 'private' } });

      expect(screen.queryByText('Facebook 相簿')).not.toBeInTheDocument();
      expect(screen.getByText('Instagram 相簿')).toBeInTheDocument();
      expect(screen.getByText('空相簿')).toBeInTheDocument();
    });

    it('應該過濾有照片的相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const filterDropdown = screen.getByDisplayValue('全部相簿');
      fireEvent.change(filterDropdown, { target: { value: 'hasPhotos' } });

      expect(screen.getByText('Facebook 相簿')).toBeInTheDocument();
      expect(screen.getByText('Instagram 相簿')).toBeInTheDocument();
      expect(screen.queryByText('空相簿')).not.toBeInTheDocument();
    });

    it('應該過濾空相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const filterDropdown = screen.getByDisplayValue('全部相簿');
      fireEvent.change(filterDropdown, { target: { value: 'empty' } });

      expect(screen.queryByText('Facebook 相簿')).not.toBeInTheDocument();
      expect(screen.queryByText('Instagram 相簿')).not.toBeInTheDocument();
      expect(screen.getByText('空相簿')).toBeInTheDocument();
    });
  });

  describe('排序功能', () => {
    it('應該按建立日期排序', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const sortDropdown = screen.getByDisplayValue('建立日期');
      fireEvent.change(sortDropdown, { target: { value: 'createdAt' } });

      // 預設為降序，最新的應該在前面
      const albumCards = screen.getAllByTestId(/album-card-/);
      expect(albumCards[0]).toHaveAttribute('data-testid', 'album-card-album_3');
      expect(albumCards[1]).toHaveAttribute('data-testid', 'album-card-album_2');
      expect(albumCards[2]).toHaveAttribute('data-testid', 'album-card-album_1');
    });

    it('應該按照片數量排序', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const sortDropdown = screen.getByDisplayValue('建立日期');
      fireEvent.change(sortDropdown, { target: { value: 'photoCount' } });

      // 降序排列，照片數量多的在前面
      const albumCards = screen.getAllByTestId(/album-card-/);
      expect(albumCards[0]).toHaveAttribute('data-testid', 'album-card-album_2'); // 50 張
      expect(albumCards[1]).toHaveAttribute('data-testid', 'album-card-album_1'); // 25 張
      expect(albumCards[2]).toHaveAttribute('data-testid', 'album-card-album_3'); // 0 張
    });

    it('應該支援升序和降序切換', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const sortOrderButton = screen.getByText('↓');
      fireEvent.click(sortOrderButton);

      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  describe('選擇功能', () => {
    it('應該支援單選相簿', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const selectButton = screen.getAllByText('選擇')[0];
      fireEvent.click(selectButton);

      expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([mockAlbums[0]]);
    });

    it('應該支援全選功能', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const selectAllButton = screen.getByText('全選');
      fireEvent.click(selectAllButton);

      expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(mockAlbums);
    });

    it('全選後應該顯示取消全選', () => {
      render(<AlbumBrowser {...defaultProps} selectedAlbums={mockAlbums} />);

      expect(screen.getByText('取消全選')).toBeInTheDocument();
    });

    it('應該正確處理已選擇的相簿', () => {
      const selectedAlbums = [mockAlbums[0]];
      render(<AlbumBrowser {...defaultProps} selectedAlbums={selectedAlbums} />);

      const firstCard = screen.getByTestId('album-card-album_1');
      expect(firstCard).toHaveTextContent('已選擇');

      const otherCards = screen.getAllByTestId(/album-card-album_[23]/);
      otherCards.forEach(card => {
        expect(card).toHaveTextContent('選擇');
      });
    });
  });

  describe('預覽功能', () => {
    it('應該開啟相簿預覽', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const previewButton = screen.getAllByText('預覽')[0];
      fireEvent.click(previewButton);

      expect(screen.getByTestId('album-preview')).toBeInTheDocument();
      expect(screen.getByText('Facebook 相簿')).toBeInTheDocument();
    });

    it('應該關閉相簿預覽', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const previewButton = screen.getAllByText('預覽')[0];
      fireEvent.click(previewButton);

      const closeButton = screen.getByText('關閉');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('album-preview')).not.toBeInTheDocument();
    });
  });

  describe('載入和錯誤狀態', () => {
    it('應該顯示載入狀態', () => {
      render(<AlbumBrowser {...defaultProps} loading={true} />);

      expect(screen.getByText('載入相簿中...')).toBeInTheDocument();
      expect(screen.queryByText('Facebook 相簿')).not.toBeInTheDocument();
    });

    it('應該顯示錯誤狀態', () => {
      const error = '載入相簿時發生錯誤';
      render(<AlbumBrowser {...defaultProps} error={error} />);

      expect(screen.getByText(error)).toBeInTheDocument();
    });

    it('應該顯示空狀態', () => {
      render(<AlbumBrowser {...defaultProps} albums={[]} />);

      expect(screen.getByText('沒有相簿')).toBeInTheDocument();
    });
  });

  describe('重新整理功能', () => {
    it('應該調用 onRefresh', () => {
      render(<AlbumBrowser {...defaultProps} />);

      const refreshButton = screen.getByText('重新整理');
      fireEvent.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('載入時重新整理按鈕應該禁用', () => {
      render(<AlbumBrowser {...defaultProps} loading={true} />);

      const refreshButton = screen.getByText('重新整理');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('檢視模式', () => {
    it('應該支援網格和列表檢視模式切換', () => {
      render(<AlbumBrowser {...defaultProps} />);

      // 預設應該是網格模式
      const albumContainer = screen.getByTestId('album-card-album_1').parentElement;
      expect(albumContainer).toHaveClass('grid');

      // 切換到列表模式
      const listViewButton = screen.getByRole('button', { pressed: false });
      fireEvent.click(listViewButton);

      // 檢查是否切換到列表模式
      expect(albumContainer).toHaveClass('space-y-4');
    });
  });

  describe('統計更新', () => {
    it('選擇相簿後應該更新統計', () => {
      const selectedAlbums = [mockAlbums[0]];
      render(<AlbumBrowser {...defaultProps} selectedAlbums={selectedAlbums} />);

      expect(screen.getByText('已選擇 1 個')).toBeInTheDocument();
    });

    it('過濾後應該更新顯示數量', async () => {
      render(<AlbumBrowser {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('搜尋相簿...');
      fireEvent.change(searchInput, { target: { value: 'Facebook' } });

      await waitFor(() => {
        expect(screen.getByText('顯示 1 個')).toBeInTheDocument();
      });
    });
  });
});