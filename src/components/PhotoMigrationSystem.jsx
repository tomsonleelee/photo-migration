import { useState } from 'react';
import { Camera, Upload, Settings, Eye } from 'lucide-react';

const PhotoMigrationSystem = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});

  const steps = [
    { id: 0, title: '歡迎使用', desc: '開始設定您的相簿遷移' },
    { id: 1, title: '帳戶連接', desc: '連接您的社群平台帳戶' },
    { id: 2, title: '相簿範圍', desc: '選擇相簿存取範圍' },
    { id: 3, title: '目標搜尋', desc: '搜尋用戶或輸入連結' },
    { id: 4, title: '相簿選擇', desc: '選擇要遷移的相簿' },
    { id: 5, title: '遷移設定', desc: '配置遷移參數' },
    { id: 6, title: '執行遷移', desc: '開始遷移並監控進度' },
    { id: 7, title: '完成報告', desc: '查看遷移結果' }
  ];

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘', status: 'disconnected' },
    { id: 'instagram', name: 'Instagram', icon: '📷', status: 'disconnected' },
    { id: 'flickr', name: 'Flickr', icon: '🌟', status: 'disconnected' },
    { id: 'google', name: 'Google Photos', icon: '🔵', status: 'connected', required: true }
  ];

  const connectPlatform = (platformId) => {
    setConnectedPlatforms(prev => ({
      ...prev,
      [platformId]: { status: 'connected', connectedAt: new Date() }
    }));
  };

  // 基本的步驟組件
  const WelcomeStep = () => (
    <div className="text-center">
      <Camera className="w-16 h-16 text-blue-600 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-gray-900 mb-4">歡迎使用相簿遷移系統</h2>
      <p className="text-lg text-gray-600 mb-8">
        輕鬆將您的照片從各大社群平台遷移到 Google Photos
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-blue-50 rounded-lg">
          <Upload className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">多平台支援</h3>
          <p className="text-sm text-gray-600">支援 Facebook、Instagram、Flickr 等平台</p>
        </div>
        <div className="p-6 bg-green-50 rounded-lg">
          <Settings className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">智能配置</h3>
          <p className="text-sm text-gray-600">自動處理重複檔案和品質設定</p>
        </div>
        <div className="p-6 bg-purple-50 rounded-lg">
          <Eye className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">即時監控</h3>
          <p className="text-sm text-gray-600">詳細的進度追蹤和錯誤報告</p>
        </div>
      </div>
    </div>
  );

  const PlatformConnectionStep = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">連接您的帳戶</h2>
      <div className="space-y-4">
        {platforms.map(platform => (
          <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <h3 className="font-medium text-gray-900">{platform.name}</h3>
                {platform.required && (
                  <span className="text-xs text-blue-600">必須連接</span>
                )}
              </div>
            </div>
            <button
              onClick={() => connectPlatform(platform.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                connectedPlatforms[platform.id] || platform.status === 'connected'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {connectedPlatforms[platform.id] || platform.status === 'connected' ? '已連接' : '連接'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const StepNavigation = () => (
    <div className="flex justify-between mt-8 pt-6 border-t">
      <button
        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
        disabled={currentStep === 0}
        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一步
      </button>
      <button
        onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
        disabled={currentStep === steps.length - 1}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一步
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep />;
      case 1: return <PlatformConnectionStep />;
      default: return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">相簿遷移系統</h1>
            </div>
            <div className="text-sm text-gray-600">
              步驟 {currentStep + 1} / {steps.length}: {steps[currentStep]?.title}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderCurrentStep()}
          <StepNavigation />
        </div>
      </main>
    </div>
  );
};

export default PhotoMigrationSystem; 