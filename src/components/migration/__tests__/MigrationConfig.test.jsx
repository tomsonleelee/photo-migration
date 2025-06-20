import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MigrationConfig from '../MigrationConfig';
import configStorage from '../../../utils/configStorage';

jest.mock('../../../utils/configStorage');

describe('MigrationConfig', () => {
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
    configStorage.exportConfig.mockResolvedValue(JSON.stringify({ config: defaultConfig }));
    configStorage.importConfig.mockResolvedValue({ success: true, message: '配置已成功匯入' });
  });

  it('should render all configuration sections', () => {
    render(<MigrationConfig />);
    
    expect(screen.getByText('配置預設')).toBeInTheDocument();
    expect(screen.getByText('圖片品質設定')).toBeInTheDocument();
    expect(screen.getByText('重複檔案處理')).toBeInTheDocument();
    expect(screen.getByText('執行排程')).toBeInTheDocument();
    expect(screen.getByText('進階選項')).toBeInTheDocument();
    expect(screen.getByText('配置摘要')).toBeInTheDocument();
  });

  it('should load saved configuration on mount', async () => {
    const savedConfig = {
      imageQuality: 'high',
      duplicateHandling: 'rename',
      batchSize: 25,
      concurrentLimit: 2
    };
    
    configStorage.loadConfig.mockResolvedValue({ config: savedConfig });
    
    render(<MigrationConfig onConfigChange={mockOnConfigChange} />);
    
    await waitFor(() => {
      expect(configStorage.loadConfig).toHaveBeenCalledWith('default');
    });
  });

  describe('Image Quality Selection', () => {
    it('should allow selecting different image quality options', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ imageQuality: 'high' })
      );
    });

    it('should display correct image quality descriptions', () => {
      render(<MigrationConfig />);
      
      expect(screen.getByText('保持照片原始解析度和品質')).toBeInTheDocument();
      expect(screen.getByText('高解析度，適合打印')).toBeInTheDocument();
      expect(screen.getByText('平衡品質與檔案大小')).toBeInTheDocument();
    });
  });

  describe('Duplicate Handling', () => {
    it('should allow selecting duplicate handling options', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const overwriteOption = screen.getByLabelText('覆蓋');
      await user.click(overwriteOption);

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ duplicateHandling: 'overwrite' })
      );
    });
  });

  describe('Scheduling Options', () => {
    it('should show datetime input when scheduled option is selected', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const scheduledOption = screen.getByLabelText('排程執行');
      await user.click(scheduledOption);

      expect(screen.getByLabelText('排程時間')).toBeInTheDocument();
    });

    it('should hide datetime input when immediate option is selected', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const immediateOption = screen.getByLabelText('立即執行');
      await user.click(immediateOption);

      expect(screen.queryByLabelText('排程時間')).not.toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should toggle advanced options visibility', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const advancedToggle = screen.getByText('進階選項');
      await user.click(advancedToggle);

      expect(screen.getByLabelText('批次大小')).toBeInTheDocument();
      expect(screen.getByLabelText('併發限制')).toBeInTheDocument();
    });

    it('should allow changing batch size', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const advancedToggle = screen.getByText('進階選項');
      await user.click(advancedToggle);

      const batchSizeInput = screen.getByLabelText('批次大小');
      await user.clear(batchSizeInput);
      await user.type(batchSizeInput, '100');

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ batchSize: 100 })
      );
    });

    it('should allow changing concurrent limit', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const advancedToggle = screen.getByText('進階選項');
      await user.click(advancedToggle);

      const concurrentLimitInput = screen.getByLabelText('併發限制');
      await user.clear(concurrentLimitInput);
      await user.type(concurrentLimitInput, '5');

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ concurrentLimit: 5 })
      );
    });
  });

  describe('Preset Configurations', () => {
    it('should apply fast preset configuration', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const fastPreset = screen.getByLabelText('快速遷移');
      await user.click(fastPreset);

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

    it('should apply quality preset configuration', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const qualityPreset = screen.getByLabelText('品質優先');
      await user.click(qualityPreset);

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          presets: 'quality',
          imageQuality: 'original',
          duplicateHandling: 'rename',
          batchSize: 25,
          concurrentLimit: 2
        })
      );
    });

    it('should apply safe preset configuration', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onConfigChange={mockOnConfigChange} />);

      const safePreset = screen.getByLabelText('安全模式');
      await user.click(safePreset);

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          presets: 'safe',
          imageQuality: 'high',
          duplicateHandling: 'skip',
          batchSize: 20,
          concurrentLimit: 1
        })
      );
    });
  });

  describe('Configuration Summary', () => {
    it('should display current configuration summary', () => {
      render(<MigrationConfig />);
      
      expect(screen.getByText('原始品質')).toBeInTheDocument();
      expect(screen.getByText('跳過')).toBeInTheDocument();
      expect(screen.getByText('立即執行')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should save configuration when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig onSave={mockOnSave} />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      const saveButton = screen.getByText('儲存設定');
      await user.click(saveButton);

      expect(configStorage.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({ imageQuality: 'high' }),
        'default'
      );
      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should show success message after saving', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      const saveButton = screen.getByText('儲存設定');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('配置已成功儲存')).toBeInTheDocument();
      });
    });

    it('should disable save button when not modified', () => {
      render(<MigrationConfig />);
      
      const saveButton = screen.getByText('儲存設定');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when configuration is modified', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      const saveButton = screen.getByText('儲存設定');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset configuration to initial state', async () => {
      const user = userEvent.setup();
      const initialConfig = { imageQuality: 'standard' };
      render(<MigrationConfig initialConfig={initialConfig} />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      const resetButton = screen.getByText('重設');
      await user.click(resetButton);

      const standardQualityOption = screen.getByLabelText('標準品質');
      expect(standardQualityOption).toBeChecked();
    });
  });

  describe('Export/Import Functionality', () => {
    it('should export configuration', async () => {
      const user = userEvent.setup();
      
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

      render(<MigrationConfig />);

      const exportButton = screen.getByText('匯出配置');
      await user.click(exportButton);

      expect(configStorage.exportConfig).toHaveBeenCalledWith('default');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should import configuration', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig />);

      const file = new File([JSON.stringify({ config: { imageQuality: 'high' } })], 'config.json', {
        type: 'application/json'
      });

      const fileInput = screen.getByLabelText(/匯入配置檔案/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(configStorage.importConfig).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when save fails', async () => {
      const user = userEvent.setup();
      configStorage.saveConfig.mockRejectedValue(new Error('Storage error'));
      
      render(<MigrationConfig />);

      const highQualityOption = screen.getByLabelText('高品質');
      await user.click(highQualityOption);

      const saveButton = screen.getByText('儲存設定');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('儲存失敗: Storage error')).toBeInTheDocument();
      });
    });

    it('should show error message when export fails', async () => {
      const user = userEvent.setup();
      configStorage.exportConfig.mockRejectedValue(new Error('Export error'));
      
      render(<MigrationConfig />);

      const exportButton = screen.getByText('匯出配置');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('匯出失敗: Export error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MigrationConfig />);
      
      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups).toHaveLength(3);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MigrationConfig />);

      const firstRadio = screen.getByLabelText('原始品質');
      firstRadio.focus();
      
      await user.keyboard('{ArrowDown}');
      expect(screen.getByLabelText('高品質')).toHaveFocus();
    });
  });
});