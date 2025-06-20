import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserSettings from '../UserSettings';

// Mock contexts
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    },
    isAuthenticated: true
  })
}));

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

describe('UserSettings - Basic Tests', () => {
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

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        style: {
          setProperty: jest.fn()
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render main title and tabs', () => {
    render(<UserSettings />);
    
    expect(screen.getByText('用戶設定')).toBeInTheDocument();
    expect(screen.getByText('一般設定')).toBeInTheDocument();
    expect(screen.getByText('通知設定')).toBeInTheDocument();
    expect(screen.getByText('遷移預設')).toBeInTheDocument();
    expect(screen.getByText('隱私設定')).toBeInTheDocument();
    expect(screen.getByText('帳戶管理')).toBeInTheDocument();
  });

  it('should display theme options in general settings', () => {
    render(<UserSettings />);
    
    expect(screen.getByText('☀️ 淺色模式')).toBeInTheDocument();
    expect(screen.getByText('🌙 深色模式')).toBeInTheDocument();
    expect(screen.getByText('🖥️ 跟隨系統')).toBeInTheDocument();
  });

  it('should switch to notifications tab', () => {
    render(<UserSettings />);

    const notificationsTab = screen.getByText('通知設定');
    fireEvent.click(notificationsTab);

    expect(screen.getByText('通知方式')).toBeInTheDocument();
  });

  it('should switch to migration tab', () => {
    render(<UserSettings />);

    const migrationTab = screen.getByText('遷移預設');
    fireEvent.click(migrationTab);

    expect(screen.getByText('預設遷移設定')).toBeInTheDocument();
  });

  it('should switch to privacy tab', () => {
    render(<UserSettings />);

    const privacyTab = screen.getByText('隱私設定');
    fireEvent.click(privacyTab);

    expect(screen.getByText('隱私和安全')).toBeInTheDocument();
  });

  it('should switch to account tab', () => {
    render(<UserSettings />);

    const accountTab = screen.getByText('帳戶管理');
    fireEvent.click(accountTab);

    expect(screen.getByText('帳戶安全')).toBeInTheDocument();
    expect(screen.getByText('數據管理')).toBeInTheDocument();
    expect(screen.getByText('危險區域')).toBeInTheDocument();
  });

  it('should enable save button when settings change', () => {
    render(<UserSettings />);

    const saveButton = screen.getByText('儲存變更');
    expect(saveButton).toBeDisabled();

    const darkModeOption = screen.getByDisplayValue('dark');
    fireEvent.click(darkModeOption);

    expect(saveButton).not.toBeDisabled();
  });

  it('should show change password modal', () => {
    render(<UserSettings />);

    const accountTab = screen.getByText('帳戶管理');
    fireEvent.click(accountTab);

    const changePasswordButton = screen.getByText('更改密碼');
    fireEvent.click(changePasswordButton);

    expect(screen.getByText('目前密碼')).toBeInTheDocument();
  });

  it('should show delete account modal', () => {
    render(<UserSettings />);

    const accountTab = screen.getByText('帳戶管理');
    fireEvent.click(accountTab);

    const deleteAccountButton = screen.getByText('刪除帳戶');
    fireEvent.click(deleteAccountButton);

    expect(screen.getByText('確認刪除帳戶')).toBeInTheDocument();
  });

  it('should handle export settings', () => {
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

    render(<UserSettings />);

    const accountTab = screen.getByText('帳戶管理');
    fireEvent.click(accountTab);

    const exportButton = screen.getByText('匯出');
    fireEvent.click(exportButton);

    expect(mockClick).toHaveBeenCalled();
  });
});