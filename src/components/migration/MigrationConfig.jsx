import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Sliders, Calendar, FileImage, Copy, Clock, Shield, Download, Upload } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Form from '../ui/Form';
import configStorage from '../../utils/configStorage';

const MigrationConfig = ({ onConfigChange, onSave, initialConfig = {} }) => {
  const [config, setConfig] = useState({
    imageQuality: 'original',
    duplicateHandling: 'skip',
    batchSize: 50,
    concurrentLimit: 3,
    scheduling: 'immediate',
    scheduledTime: '',
    showAdvanced: false,
    presets: 'custom',
    ...initialConfig
  });

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await configStorage.loadConfig('default');
      if (savedConfig && savedConfig.config) {
        setConfig({ ...config, ...savedConfig.config });
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
    }
  };

  const imageQualityOptions = [
    { value: 'original', label: '原始品質', description: '保持照片原始解析度和品質' },
    { value: 'high', label: '高品質', description: '高解析度，適合打印' },
    { value: 'standard', label: '標準品質', description: '平衡品質與檔案大小' }
  ];

  const duplicateHandlingOptions = [
    { value: 'skip', label: '跳過', description: '略過重複的檔案' },
    { value: 'overwrite', label: '覆蓋', description: '用新檔案覆蓋舊檔案' },
    { value: 'rename', label: '重新命名', description: '為重複檔案添加編號' }
  ];

  const schedulingOptions = [
    { value: 'immediate', label: '立即執行', description: '立即開始遷移' },
    { value: 'scheduled', label: '排程執行', description: '在指定時間執行' }
  ];

  const presetOptions = [
    { value: 'custom', label: '自訂設定' },
    { value: 'fast', label: '快速遷移' },
    { value: 'quality', label: '品質優先' },
    { value: 'safe', label: '安全模式' }
  ];

  const handleConfigChange = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setIsModified(true);
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const handlePresetChange = (preset) => {
    let presetConfig = { ...config, presets: preset };
    
    switch (preset) {
      case 'fast':
        presetConfig = {
          ...presetConfig,
          imageQuality: 'standard',
          duplicateHandling: 'skip',
          batchSize: 100,
          concurrentLimit: 5,
          scheduling: 'immediate'
        };
        break;
      case 'quality':
        presetConfig = {
          ...presetConfig,
          imageQuality: 'original',
          duplicateHandling: 'rename',
          batchSize: 25,
          concurrentLimit: 2,
          scheduling: 'immediate'
        };
        break;
      case 'safe':
        presetConfig = {
          ...presetConfig,
          imageQuality: 'high',
          duplicateHandling: 'skip',
          batchSize: 20,
          concurrentLimit: 1,
          scheduling: 'immediate'
        };
        break;
    }
    
    setConfig(presetConfig);
    setIsModified(true);
    
    if (onConfigChange) {
      onConfigChange(presetConfig);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const result = await configStorage.saveConfig(config, 'default');
      setSaveMessage(result.message);
      setIsModified(false);
      
      if (onSave) {
        onSave(config);
      }
    } catch (error) {
      setSaveMessage('儲存失敗: ' + error.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await configStorage.exportConfig('default');
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setSaveMessage('匯出失敗: ' + error.message);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await configStorage.importConfig(e.target.result, 'default');
        setSaveMessage(result.message);
        await loadSavedConfig();
        setIsModified(true);
      } catch (error) {
        setSaveMessage('匯入失敗: ' + error.message);
      } finally {
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleReset = () => {
    setConfig(initialConfig);
    setIsModified(false);
  };

  const getConfigSummary = () => {
    const quality = imageQualityOptions.find(opt => opt.value === config.imageQuality)?.label;
    const handling = duplicateHandlingOptions.find(opt => opt.value === config.duplicateHandling)?.label;
    const schedule = schedulingOptions.find(opt => opt.value === config.scheduling)?.label;
    
    return {
      quality,
      handling,
      schedule,
      batchSize: config.batchSize,
      concurrentLimit: config.concurrentLimit
    };
  };

  return (
    <div className="space-y-6">
      {/* 配置預設 */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Sliders className="w-5 h-5 mr-2" />
            配置預設
          </Card.Title>
          <Card.Description>
            選擇預設配置或自訂您的設定
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form.Radio
            name="presets"
            options={presetOptions}
            value={config.presets}
            onChange={handlePresetChange}
            direction="horizontal"
          />
        </Card.Content>
      </Card>

      {/* 基本設定 */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <FileImage className="w-5 h-5 mr-2" />
            圖片品質設定
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Form.Radio
            name="imageQuality"
            options={imageQualityOptions}
            value={config.imageQuality}
            onChange={(value) => handleConfigChange('imageQuality', value)}
          />
        </Card.Content>
      </Card>

      {/* 重複檔案處理 */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Copy className="w-5 h-5 mr-2" />
            重複檔案處理
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Form.Radio
            name="duplicateHandling"
            options={duplicateHandlingOptions}
            value={config.duplicateHandling}
            onChange={(value) => handleConfigChange('duplicateHandling', value)}
          />
        </Card.Content>
      </Card>

      {/* 排程設定 */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            執行排程
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Form.Radio
            name="scheduling"
            options={schedulingOptions}
            value={config.scheduling}
            onChange={(value) => handleConfigChange('scheduling', value)}
          />
          
          {config.scheduling === 'scheduled' && (
            <Form.Input
              type="datetime-local"
              label="排程時間"
              value={config.scheduledTime}
              onChange={(e) => handleConfigChange('scheduledTime', e.target.value)}
              leftIcon={<Clock className="w-4 h-4" />}
            />
          )}
        </Card.Content>
      </Card>

      {/* 進階選項 */}
      <Card>
        <Card.Header>
          <Card.Title 
            className="flex items-center cursor-pointer"
            onClick={() => handleConfigChange('showAdvanced', !config.showAdvanced)}
          >
            <Settings className="w-5 h-5 mr-2" />
            進階選項
            <span className="ml-auto text-sm text-gray-500">
              {config.showAdvanced ? '隱藏' : '顯示'}
            </span>
          </Card.Title>
        </Card.Header>
        
        {config.showAdvanced && (
          <Card.Content className="space-y-4">
            <Form.Row>
              <Form.Input
                type="number"
                label="批次大小"
                value={config.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                min="1"
                max="200"
                helperText="每批處理的檔案數量"
              />
              
              <Form.Input
                type="number"
                label="併發限制"
                value={config.concurrentLimit}
                onChange={(e) => handleConfigChange('concurrentLimit', parseInt(e.target.value))}
                min="1"
                max="10"
                helperText="同時處理的檔案數量"
              />
            </Form.Row>
          </Card.Content>
        )}
      </Card>

      {/* 配置摘要 */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            配置摘要
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">圖片品質:</span>
                <span className="text-sm font-medium">{getConfigSummary().quality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">重複處理:</span>
                <span className="text-sm font-medium">{getConfigSummary().handling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">執行方式:</span>
                <span className="text-sm font-medium">{getConfigSummary().schedule}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">批次大小:</span>
                <span className="text-sm font-medium">{getConfigSummary().batchSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">併發限制:</span>
                <span className="text-sm font-medium">{getConfigSummary().concurrentLimit}</span>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* 操作按鈕 */}
      <Card>
        <Card.Content>
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              saveMessage.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {saveMessage}
            </div>
          )}
          
          <Form.Actions align="between">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!isModified}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重設
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                匯出配置
              </Button>
              
              <label className="inline-flex cursor-pointer">
                <span className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:ring-gray-500">
                  <Upload className="w-4 h-4 mr-2" />
                  匯入配置
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  aria-label="匯入配置檔案"
                />
              </label>
            </div>
            
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!isModified}
              loading={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              儲存設定
            </Button>
          </Form.Actions>
        </Card.Content>
      </Card>
    </div>
  );
};

export default MigrationConfig;