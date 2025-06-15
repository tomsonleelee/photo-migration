import React, { useState } from 'react';
import { Camera, Upload, Download, Settings, Check, Play, Pause, Eye, Clock, AlertCircle, ExternalLink, Plus } from 'lucide-react';
import './App.css';

const PhotoMigrationSystem = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [migrationTasks, setMigrationTasks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [albumScope, setAlbumScope] = useState('personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

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

  const mockAlbums = {
    personal: {
      facebook: [
        { id: 1, name: '2023年旅遊照片', count: 156, date: '2023-12-01', thumbnail: '🏖️', owner: '我' },
        { id: 2, name: '生日派對', count: 89, date: '2023-11-15', thumbnail: '🎂', owner: '我' }
      ],
      instagram: [
        { id: 4, name: 'Stories Highlights', count: 67, date: '2023-11-30', thumbnail: '✨', owner: '我' },
        { id: 5, name: '美食記錄', count: 123, date: '2023-11-25', thumbnail: '🍕', owner: '我' }
      ]
    },
    friends: {
      facebook: [
        { id: 6, name: '婚禮紀錄', count: 234, date: '2023-12-15', thumbnail: '💒', owner: '張小美', privacy: 'friends' },
        { id: 7, name: '畢業典禮', count: 156, date: '2023-06-20', thumbnail: '🎓', owner: '李大明', privacy: 'friends' }
      ],
      instagram: [
        { id: 8, name: '歐洲之旅', count: 189, date: '2023-09-10', thumbnail: '🗼', owner: '@travel_buddy', privacy: 'followers' }
      ]
    },
    public: {
      facebook: [
        { id: 9, name: '攝影作品集', count: 78, date: '2023-11-01', thumbnail: '📸', owner: '專業攝影師', privacy: 'public' }
      ],
      instagram: [
        { id: 10, name: '街頭藝術', count: 145, date: '2023-10-15', thumbnail: '🎨', owner: '@street_artist', privacy: 'public' },
        { id: 11, name: '自然風景', count: 267, date: '2023-12-01', thumbnail: '🌄', owner: '@nature_lover', privacy: 'public' }
      ]
    }
  };

  const mockFriends = {
    facebook: [
      { id: 'f1', name: '張小美', avatar: '👩', albumCount: 12, mutual: 45 },
      { id: 'f2', name: '李大明', avatar: '👨', albumCount: 8, mutual: 23 },
      { id: 'f3', name: '陳小華', avatar: '👦', albumCount: 15, mutual: 67 }
    ],
    instagram: [
      { id: 'i1', name: '@travel_buddy', avatar: '✈️', albumCount: 25, followers: '12.5K' },
      { id: 'i2', name: '@food_explorer', avatar: '🍜', albumCount: 18, followers: '8.9K' }
    ]
  };

  const connectPlatform = (platformId) => {
    setConnectedPlatforms(prev => ({
      ...prev,
      [platformId]: { status: 'connected', connectedAt: new Date() }
    }));
  };

  const toggleAlbumSelection = (album) => {
    setSelectedAlbums(prev => {
      const isSelected = prev.find(a => a.id === album.id);
      if (isSelected) {
        return prev.filter(a => a.id !== album.id);
      } else {
        return [...prev, album];
      }
    });
  };

  const startMigration = () => {
    setIsProcessing(true);
    const tasks = selectedAlbums.map(album => ({
      id: `task_${album.id}`,
      albumName: album.name,
      totalPhotos: album.count,
      processedPhotos: 0,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      errors: []
    }));
    setMigrationTasks(tasks);
    setCurrentStep(6);
    
    tasks.forEach((task, index) => {
      setTimeout(() => {
        simulateProgress(task.id);
      }, index * 1000);
    });
  };

  const simulateProgress = (taskId) => {
    const interval = setInterval(() => {
      setMigrationTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          const newProcessed = Math.min(task.processedPhotos + Math.floor(Math.random() * 5) + 1, task.totalPhotos);
          const newProgress = Math.floor((newProcessed / task.totalPhotos) * 100);
          const isCompleted = newProcessed >= task.totalPhotos;
          
          return {
            ...task,
            processedPhotos: newProcessed,
            progress: newProgress,
            status: isCompleted ? 'completed' : 'processing',
            endTime: isCompleted ? new Date() : task.endTime
          };
        }
        return task;
      }));
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
    }, 15000);
  };

  // Component implementations would continue here...
  // [All the step components from the previous artifact]

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep />;
      case 1: return <PlatformConnectionStep />;
      case 2: return <AlbumScopeStep />;
      case 3: return <UserSearchStep />;
      case 4: return <AlbumSelectionStep />;
      case 5: return <MigrationSettingsStep />;
      case 6: return <MigrationExecutionStep />;
      case 7: return <CompletionReportStep />;
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
