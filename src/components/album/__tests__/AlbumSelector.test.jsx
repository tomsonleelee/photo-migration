import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlbumSelector from '../AlbumSelector';

// Mock components and contexts
jest.mock('../AlbumBrowser', () => ({
  default: ({ albums, selectedAlbums, onSelectionChange, platform }) => (
    <div data-testid="album-browser">
      <div>Platform: {platform}</div>
      <div>Albums: {albums.length}</div>
      <div>Selected: {selectedAlbums.length}</div>
      <button onClick={() => onSelectionChange([{ id: 'test', title: 'Test Album' }])}>
        Select Album
      </button>
    </div>
  )
}));

jest.mock('../../ui/Button', () => ({
  default: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    getAuthToken: jest.fn().mockResolvedValue('mock-token')
  })
}));

jest.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}));

describe('AlbumSelector', () => {
  const defaultProps = {
    onSelectionComplete: jest.fn(),
    onBack: jest.fn(),
    initialSelection: [],
    platforms: ['facebook', 'instagram']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('平台選擇', () => {
    it('應該渲染可用的平台', () => {
      render(<AlbumSelector {...defaultProps} />);

      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('應該允許切換平台', () => {
      render(<AlbumSelector {...defaultProps} />);

      const instagramButton = screen.getByText('Instagram');
      fireEvent.click(instagramButton);

      // 預設選擇第一個平台 (facebook)，切換後應該顯示 instagram
      expect(screen.getByText('Platform: instagram')).toBeInTheDocument();
    });
  });

  describe('統計資訊', () => {
    it('應該顯示正確的統計', () => {
      render(<AlbumSelector {...defaultProps} />);

      expect(screen.getByText('0')).toBeInTheDocument(); // 總相簿數
      expect(screen.getByText('總相簿數')).toBeInTheDocument();
      expect(screen.getByText('總照片數')).toBeInTheDocument();
      expect(screen.getByText('已選相簿')).toBeInTheDocument();
      expect(screen.getByText('將遷移照片')).toBeInTheDocument();
    });
  });

  describe('相簿選擇', () => {
    it('應該處理相簿選擇', () => {
      render(<AlbumSelector {...defaultProps} />);

      const selectButton = screen.getByText('Select Album');
      fireEvent.click(selectButton);

      // 統計應該更新
      expect(screen.getByText('Selected: 1')).toBeInTheDocument();
    });

    it('應該在沒有選擇相簿時禁用確認按鈕', () => {
      render(<AlbumSelector {...defaultProps} />);

      const confirmButton = screen.getByText('確認選擇');
      expect(confirmButton).toBeDisabled();
    });

    it('選擇相簿後應該啟用確認按鈕', () => {
      render(<AlbumSelector {...defaultProps} />);

      const selectButton = screen.getByText('Select Album');
      fireEvent.click(selectButton);

      const confirmButton = screen.getByText('確認選擇');
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('導航', () => {
    it('應該支援返回上一步', () => {
      render(<AlbumSelector {...defaultProps} />);

      const backButton = screen.getByText('上一步');
      fireEvent.click(backButton);

      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('應該在確認選擇時調用回調', () => {
      render(<AlbumSelector {...defaultProps} />);

      // 先選擇一個相簿
      const selectButton = screen.getByText('Select Album');
      fireEvent.click(selectButton);

      // 然後確認選擇
      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);

      expect(defaultProps.onSelectionComplete).toHaveBeenCalledWith([
        { id: 'test', title: 'Test Album' }
      ]);
    });
  });

  describe('初始狀態', () => {
    it('應該使用初始選擇', () => {
      const initialSelection = [{ id: 'initial', title: 'Initial Album' }];
      render(<AlbumSelector {...defaultProps} initialSelection={initialSelection} />);

      expect(screen.getByText('Selected: 1')).toBeInTheDocument();
    });

    it('應該選擇第一個平台作為預設', () => {
      render(<AlbumSelector {...defaultProps} />);

      expect(screen.getByText('Platform: facebook')).toBeInTheDocument();
    });
  });

  describe('錯誤處理', () => {
    it('應該處理沒有平台的情況', () => {
      render(<AlbumSelector {...defaultProps} platforms={[]} />);

      // 不應該崩潰，但也不應該有平台選項
      expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
      expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
    });
  });
});