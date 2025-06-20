import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UserSettings from '../UserSettings';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock AuthContext
const mockAuthValue = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  },
  isAuthenticated: true
};

const TestWrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthValue}>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </AuthContext.Provider>
);

describe('UserSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render all main sections', () => {
    render(
      <TestWrapper>
        <UserSettings />
      </TestWrapper>
    );
    
    expect(screen.getByText('用戶設定')).toBeInTheDocument();
    expect(screen.getByText('一般設定')).toBeInTheDocument();
    expect(screen.getByText('通知設定')).toBeInTheDocument();
    expect(screen.getByText('遷移預設')).toBeInTheDocument();
    expect(screen.getByText('隱私設定')).toBeInTheDocument();
    expect(screen.getByText('帳戶管理')).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <UserSettings />
      </TestWrapper>
    );

    const notificationsTab = screen.getByText('通知設定');
    await user.click(notificationsTab);

    expect(screen.getByText('通知方式')).toBeInTheDocument();
    expect(screen.getByText('電子郵件通知')).toBeInTheDocument();
  });

  describe('General Settings', () => {
    it('should display theme options', () => {
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      expect(screen.getByText('☀️ 淺色模式')).toBeInTheDocument();
      expect(screen.getByText('🌙 深色模式')).toBeInTheDocument();
      expect(screen.getByText('🖥️ 跟隨系統')).toBeInTheDocument();
    });

    it('should display language options', () => {
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      expect(screen.getByText('繁體中文')).toBeInTheDocument();
      expect(screen.getByText('簡體中文')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
    });

    it('should allow changing theme', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const darkModeOption = screen.getByDisplayValue('dark');
      await user.click(darkModeOption);

      const saveButton = screen.getByText('儲存變更');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Notification Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const notificationsTab = screen.getByText('通知設定');
      await user.click(notificationsTab);
    });

    it('should display notification options', () => {
      expect(screen.getByText('電子郵件通知')).toBeInTheDocument();
      expect(screen.getByText('推送通知')).toBeInTheDocument();
      expect(screen.getByText('應用內通知')).toBeInTheDocument();
    });

    it('should allow toggling notification preferences', async () => {
      const user = userEvent.setup();
      
      const emailCheckbox = screen.getByLabelText('電子郵件通知');
      await user.click(emailCheckbox);

      const saveButton = screen.getByText('儲存變更');
      expect(saveButton).not.toBeDisabled();
    });

    it('should display notification types', () => {
      expect(screen.getByText('遷移完成通知')).toBeInTheDocument();
      expect(screen.getByText('遷移錯誤通知')).toBeInTheDocument();
      expect(screen.getByText('每週摘要')).toBeInTheDocument();
    });
  });

  describe('Migration Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const migrationTab = screen.getByText('遷移預設');
      await user.click(migrationTab);
    });

    it('should display migration default options', () => {
      expect(screen.getByText('預設遷移設定')).toBeInTheDocument();
      expect(screen.getByText('原始品質')).toBeInTheDocument();
      expect(screen.getByLabelText('批次大小')).toBeInTheDocument();
      expect(screen.getByLabelText('併發限制')).toBeInTheDocument();
    });

    it('should allow changing default migration settings', async () => {
      const user = userEvent.setup();
      
      const highQualityOption = screen.getByDisplayValue('high');
      await user.click(highQualityOption);

      const saveButton = screen.getByText('儲存變更');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Privacy Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const privacyTab = screen.getByText('隱私設定');
      await user.click(privacyTab);
    });

    it('should display privacy options', () => {
      expect(screen.getByText('隱私和安全')).toBeInTheDocument();
      expect(screen.getByText('分享使用統計')).toBeInTheDocument();
      expect(screen.getByText('公開個人檔案')).toBeInTheDocument();
      expect(screen.getByText('允許搜尋引擎索引')).toBeInTheDocument();
    });

    it('should allow toggling privacy settings', async () => {
      const user = userEvent.setup();
      
      const analyticsCheckbox = screen.getByLabelText('分享使用統計');
      await user.click(analyticsCheckbox);

      const saveButton = screen.getByText('儲存變更');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Account Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const accountTab = screen.getByText('帳戶管理');
      await user.click(accountTab);
    });

    it('should display account management options', () => {
      expect(screen.getByText('帳戶安全')).toBeInTheDocument();
      expect(screen.getByText('數據管理')).toBeInTheDocument();
      expect(screen.getByText('危險區域')).toBeInTheDocument();
    });

    it('should open change password modal', async () => {
      const user = userEvent.setup();
      
      const changePasswordButton = screen.getByText('更改密碼');
      await user.click(changePasswordButton);

      expect(screen.getByText('目前密碼')).toBeInTheDocument();
      expect(screen.getByText('新密碼')).toBeInTheDocument();
      expect(screen.getByText('確認新密碼')).toBeInTheDocument();
    });

    it('should open delete account modal', async () => {
      const user = userEvent.setup();
      
      const deleteAccountButton = screen.getByText('刪除帳戶');
      await user.click(deleteAccountButton);

      expect(screen.getByText('確認刪除帳戶')).toBeInTheDocument();
      expect(screen.getByText('您確定要刪除您的帳戶嗎？')).toBeInTheDocument();
    });
  });

  describe('Save and Reset functionality', () => {
    it('should save settings to localStorage', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const darkModeOption = screen.getByDisplayValue('dark');
      await user.click(darkModeOption);

      const saveButton = screen.getByText('儲存變更');
      await user.click(saveButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'user_settings',
          expect.stringContaining('"theme":"dark"')
        );
      });

      expect(screen.getByText('設定已成功儲存')).toBeInTheDocument();
    });

    it('should reset settings', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const darkModeOption = screen.getByDisplayValue('dark');
      await user.click(darkModeOption);

      const resetButton = screen.getByText('重設');
      await user.click(resetButton);

      const lightModeOption = screen.getByDisplayValue('light');
      expect(lightModeOption).toBeChecked();
    });

    it('should disable save button when not modified', () => {
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByText('儲存變更');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Export/Import functionality', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const accountTab = screen.getByText('帳戶管理');
      await user.click(accountTab);
    });

    it('should export settings', async () => {
      const user = userEvent.setup();
      
      // Mock DOM methods for file download
      global.URL.createObjectURL = jest.fn(() => 'blob:url');
      global.URL.revokeObjectURL = jest.fn();
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      
      global.document.createElement = jest.fn(() => ({
        href: '',
        download: '',
        click: mockClick
      }));
      global.document.body.appendChild = mockAppendChild;
      global.document.body.removeChild = mockRemoveChild;

      const exportButton = screen.getByText('匯出');
      await user.click(exportButton);

      expect(mockClick).toHaveBeenCalled();
    });

    it('should import settings', async () => {
      const user = userEvent.setup();
      
      const file = new File([JSON.stringify({
        settings: { theme: 'dark' }
      })], 'settings.json', { type: 'application/json' });

      const fileInput = screen.getByLabelText('匯入設定檔案');
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('設定已成功匯入')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );
      
      const tabs = screen.getAllByRole('button');
      expect(tabs.length).toBeGreaterThan(0);
      
      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      const firstTab = screen.getByText('一般設定');
      firstTab.focus();
      
      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('通知設定')).toHaveFocus();
    });
  });
});