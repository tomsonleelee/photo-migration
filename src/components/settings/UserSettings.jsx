import { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Download, 
  Upload,
  Monitor,
  Smartphone,
  Globe,
  Key,
  Trash2,
  Save,
  RotateCcw
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Form from '../ui/Form';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const UserSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // 一般設定
    theme: 'light',
    language: 'zh-TW',
    timezone: 'Asia/Taipei',
    
    // 通知設定
    notifications: {
      email: true,
      push: true,
      inApp: true,
      migrationComplete: true,
      migrationError: true,
      weeklyDigest: false
    },
    
    // 遷移預設值
    defaultMigration: {
      imageQuality: 'original',
      duplicateHandling: 'skip',
      batchSize: 50,
      concurrentLimit: 3
    },
    
    // 隱私設定
    privacy: {
      shareAnalytics: false,
      publicProfile: false,
      allowIndexing: false
    },
    
    // 數據和存儲
    storage: {
      autoCleanup: true,
      retentionDays: 30,
      maxStorageGB: 10
    }
  });

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const saved = localStorage.getItem('user_settings');
      if (saved) {
        setSettings({ ...settings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' 
        ? { ...prev[section], [key]: value }
        : value
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings));
      setSaveMessage('設定已成功儲存');
      setIsModified(false);
      
      // 應用主題變更
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      setSaveMessage('儲存失敗: ' + error.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleReset = () => {
    loadUserSettings();
    setIsModified(false);
  };

  const handleExportSettings = () => {
    const exportData = {
      settings,
      exportedAt: new Date().toISOString(),
      userId: user?.id,
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        if (importData.settings) {
          setSettings(importData.settings);
          setIsModified(true);
          setSaveMessage('設定已成功匯入');
        } else {
          setSaveMessage('無效的設定檔案格式');
        }
      } catch (error) {
        setSaveMessage('匯入失敗: ' + error.message);
      } finally {
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const tabs = [
    { id: 'general', label: '一般設定', icon: Settings },
    { id: 'notifications', label: '通知設定', icon: Bell },
    { id: 'migration', label: '遷移預設', icon: Database },
    { id: 'privacy', label: '隱私設定', icon: Shield },
    { id: 'account', label: '帳戶管理', icon: User }
  ];

  const themeOptions = [
    { value: 'light', label: '淺色模式', icon: '☀️' },
    { value: 'dark', label: '深色模式', icon: '🌙' },
    { value: 'system', label: '跟隨系統', icon: '🖥️' }
  ];

  const languageOptions = [
    { value: 'zh-TW', label: '繁體中文' },
    { value: 'zh-CN', label: '簡體中文' },
    { value: 'en-US', label: 'English' },
    { value: 'ja-JP', label: '日本語' }
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            外觀設定
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Form.Radio
            name="theme"
            label="主題模式"
            options={themeOptions.map(option => ({
              value: option.value,
              label: `${option.icon} ${option.label}`
            }))}
            value={settings.theme}
            onChange={(value) => handleSettingChange('theme', null, value)}
          />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            語言和地區
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Form.Radio
            name="language"
            label="顯示語言"
            options={languageOptions}
            value={settings.language}
            onChange={(value) => handleSettingChange('language', null, value)}
          />
          
          <Form.Input
            label="時區"
            value={settings.timezone}
            onChange={(e) => handleSettingChange('timezone', null, e.target.value)}
            helperText="影響時間顯示和排程功能"
          />
        </Card.Content>
      </Card>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            通知方式
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Form.Checkbox
            label="電子郵件通知"
            description="接收重要更新和通知"
            checked={settings.notifications.email}
            onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
          />
          
          <Form.Checkbox
            label="推送通知"
            description="瀏覽器推送通知"
            checked={settings.notifications.push}
            onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
          />
          
          <Form.Checkbox
            label="應用內通知"
            description="在應用內顯示通知"
            checked={settings.notifications.inApp}
            onChange={(e) => handleSettingChange('notifications', 'inApp', e.target.checked)}
          />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>通知類型</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Form.Checkbox
            label="遷移完成通知"
            checked={settings.notifications.migrationComplete}
            onChange={(e) => handleSettingChange('notifications', 'migrationComplete', e.target.checked)}
          />
          
          <Form.Checkbox
            label="遷移錯誤通知"
            checked={settings.notifications.migrationError}
            onChange={(e) => handleSettingChange('notifications', 'migrationError', e.target.checked)}
          />
          
          <Form.Checkbox
            label="每週摘要"
            checked={settings.notifications.weeklyDigest}
            onChange={(e) => handleSettingChange('notifications', 'weeklyDigest', e.target.checked)}
          />
        </Card.Content>
      </Card>
    </div>
  );

  const renderMigrationSettings = () => (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center">
          <Database className="w-5 h-5 mr-2" />
          預設遷移設定
        </Card.Title>
        <Card.Description>
          這些設定將作為新遷移任務的預設值
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        <Form.Radio
          name="defaultImageQuality"
          label="圖片品質"
          options={[
            { value: 'original', label: '原始品質' },
            { value: 'high', label: '高品質' },
            { value: 'standard', label: '標準品質' }
          ]}
          value={settings.defaultMigration.imageQuality}
          onChange={(value) => handleSettingChange('defaultMigration', 'imageQuality', value)}
        />
        
        <Form.Radio
          name="defaultDuplicateHandling"
          label="重複檔案處理"
          options={[
            { value: 'skip', label: '跳過' },
            { value: 'overwrite', label: '覆蓋' },
            { value: 'rename', label: '重新命名' }
          ]}
          value={settings.defaultMigration.duplicateHandling}
          onChange={(value) => handleSettingChange('defaultMigration', 'duplicateHandling', value)}
        />
        
        <Form.Row>
          <Form.Input
            type="number"
            label="批次大小"
            value={settings.defaultMigration.batchSize}
            onChange={(e) => handleSettingChange('defaultMigration', 'batchSize', parseInt(e.target.value))}
            min="1"
            max="200"
          />
          
          <Form.Input
            type="number"
            label="併發限制"
            value={settings.defaultMigration.concurrentLimit}
            onChange={(e) => handleSettingChange('defaultMigration', 'concurrentLimit', parseInt(e.target.value))}
            min="1"
            max="10"
          />
        </Form.Row>
      </Card.Content>
    </Card>
  );

  const renderPrivacySettings = () => (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          隱私和安全
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4">
        <Form.Checkbox
          label="分享使用統計"
          description="幫助我們改善服務品質"
          checked={settings.privacy.shareAnalytics}
          onChange={(e) => handleSettingChange('privacy', 'shareAnalytics', e.target.checked)}
        />
        
        <Form.Checkbox
          label="公開個人檔案"
          description="允許其他用戶查看您的公開資訊"
          checked={settings.privacy.publicProfile}
          onChange={(e) => handleSettingChange('privacy', 'publicProfile', e.target.checked)}
        />
        
        <Form.Checkbox
          label="允許搜尋引擎索引"
          description="允許搜尋引擎收錄您的公開內容"
          checked={settings.privacy.allowIndexing}
          onChange={(e) => handleSettingChange('privacy', 'allowIndexing', e.target.checked)}
        />
      </Card.Content>
    </Card>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            帳戶安全
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">密碼</h4>
              <p className="text-sm text-gray-600">上次更新：6個月前</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowChangePasswordModal(true)}
            >
              更改密碼
            </Button>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            數據管理
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">匯出設定</h4>
              <p className="text-sm text-gray-600">下載您的所有設定和偏好</p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportSettings}
            >
              <Download className="w-4 h-4 mr-2" />
              匯出
            </Button>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">匯入設定</h4>
              <p className="text-sm text-gray-600">從檔案還原您的設定</p>
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500">
                <Upload className="w-4 h-4 mr-2" />
                匯入
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
                aria-label="匯入設定檔案"
              />
            </label>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center text-red-600">
            <Trash2 className="w-5 h-5 mr-2" />
            危險區域
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-red-600">刪除帳戶</h4>
              <p className="text-sm text-gray-600">永久刪除您的帳戶和所有數據</p>
            </div>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              刪除帳戶
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'migration':
        return renderMigrationSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'account':
        return renderAccountSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">用戶設定</h1>
        <p className="text-gray-600">管理您的帳戶設定和應用偏好</p>
      </div>

      {/* 標籤導航 */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 內容區域 */}
      <div className="mb-8">
        {renderTabContent()}
      </div>

      {/* 操作按鈕 */}
      {activeTab !== 'account' && (
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
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!isModified}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重設
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isModified}
                loading={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                儲存變更
              </Button>
            </Form.Actions>
          </Card.Content>
        </Card>
      )}

      {/* 刪除帳戶確認對話框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="確認刪除帳戶"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            您確定要刪除您的帳戶嗎？這個動作無法復原，所有數據將被永久刪除。
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // 實際的刪除邏輯
                console.log('刪除帳戶');
                setShowDeleteModal(false);
              }}
            >
              確認刪除
            </Button>
          </div>
        </div>
      </Modal>

      {/* 更改密碼對話框 */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="更改密碼"
      >
        <div className="space-y-4">
          <Form.Input
            type="password"
            label="目前密碼"
            required
          />
          <Form.Input
            type="password"
            label="新密碼"
            required
          />
          <Form.Input
            type="password"
            label="確認新密碼"
            required
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowChangePasswordModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // 實際的密碼更改邏輯
                console.log('更改密碼');
                setShowChangePasswordModal(false);
              }}
            >
              更改密碼
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserSettings;