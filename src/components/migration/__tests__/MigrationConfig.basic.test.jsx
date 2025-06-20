import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MigrationConfig from '../MigrationConfig';
import configStorage from '../../../utils/configStorage';

jest.mock('../../../utils/configStorage');

describe('MigrationConfig - Basic Tests', () => {
  const mockOnConfigChange = jest.fn();
  const mockOnSave = jest.fn();
  
  const defaultConfig = {
    imageQuality: 'original',
    duplicateHandling: 'skip',
    batchSize: 50,
    concurrentLimit: 3,
    scheduling: 'immediate',
    scheduledTime: '',
    showAdvanced: false,
    presets: 'custom'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configStorage.loadConfig.mockResolvedValue({ config: defaultConfig });
    configStorage.saveConfig.mockResolvedValue({ success: true, message: '配置已成功儲存' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render all main sections', () => {
    render(<MigrationConfig />);
    
    expect(screen.getByText('配置預設')).toBeInTheDocument();
    expect(screen.getByText('圖片品質設定')).toBeInTheDocument();
    expect(screen.getByText('重複檔案處理')).toBeInTheDocument();
    expect(screen.getByText('執行排程')).toBeInTheDocument();
    expect(screen.getByText('進階選項')).toBeInTheDocument();
    expect(screen.getByText('配置摘要')).toBeInTheDocument();
  });

  it('should load saved configuration on mount', async () => {
    render(<MigrationConfig onConfigChange={mockOnConfigChange} />);
    
    await waitFor(() => {
      expect(configStorage.loadConfig).toHaveBeenCalledWith('default');
    });
  });

  it('should display image quality options', () => {
    render(<MigrationConfig />);
    
    expect(screen.getByText('保持照片原始解析度和品質')).toBeInTheDocument();
    expect(screen.getByText('高解析度，適合打印')).toBeInTheDocument();
    expect(screen.getByText('平衡品質與檔案大小')).toBeInTheDocument();
  });

  it('should apply preset configurations', () => {
    render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

    const fastPreset = screen.getByDisplayValue('fast');
    fireEvent.click(fastPreset);

    expect(mockOnConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        presets: 'fast',
        imageQuality: 'standard',
        duplicateHandling: 'skip',
        batchSize: 100,
        concurrentLimit: 5,
        scheduling: 'immediate'
      })
    );
  });

  it('should show/hide advanced options', () => {
    render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

    const advancedToggle = screen.getByText('進階選項');
    fireEvent.click(advancedToggle);

    expect(screen.getByLabelText('批次大小')).toBeInTheDocument();
    expect(screen.getByLabelText('併發限制')).toBeInTheDocument();
  });

  it('should display configuration summary', () => {
    render(<MigrationConfig />);
    
    expect(screen.getByText('原始品質')).toBeInTheDocument();
    expect(screen.getByText('跳過')).toBeInTheDocument();
    expect(screen.getByText('立即執行')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should save configuration', async () => {
    render(<MigrationConfig onSave={mockOnSave} />);

    const qualityRadio = screen.getByDisplayValue('high');
    fireEvent.click(qualityRadio);

    const saveButton = screen.getByText('儲存設定');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(configStorage.saveConfig).toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should show/hide datetime input based on scheduling', () => {
    render(<MigrationConfig />);

    const scheduledOption = screen.getByDisplayValue('scheduled');
    fireEvent.click(scheduledOption);

    expect(screen.getByLabelText('排程時間')).toBeInTheDocument();

    const immediateOption = screen.getByDisplayValue('immediate');
    fireEvent.click(immediateOption);

    expect(screen.queryByLabelText('排程時間')).not.toBeInTheDocument();
  });

  it('should handle export configuration', () => {
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

    configStorage.exportConfig.mockResolvedValue(JSON.stringify({ config: defaultConfig }));

    render(<MigrationConfig />);

    const exportButton = screen.getByText('匯出配置');
    fireEvent.click(exportButton);

    expect(configStorage.exportConfig).toHaveBeenCalledWith('default');
  });
});