import { Link } from 'react-router-dom';
import { 
  Button, 
  Card, 
  ProgressBar, 
  Layout 
} from '../components';
import { 
  Camera, 
  Shield, 
  Zap, 
  Users, 
  ArrowRight,
  Facebook,
  Instagram,
  Image,
  Globe
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: '安全可靠',
      description: '採用業界標準的加密技術，確保您的照片在傳輸過程中的安全性。',
    },
    {
      icon: Zap,
      title: '快速高效',
      description: '智能批次處理技術，大幅縮短遷移時間，讓您快速完成照片轉移。',
    },
    {
      icon: Users,
      title: '簡單易用',
      description: '直觀的用戶界面，無需技術背景，幾個步驟即可完成照片遷移。',
    },
  ];

  const platforms = [
    {
      name: 'Facebook',
      icon: Facebook,
      description: '從 Facebook 相簿匯出照片',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      description: '匯出 Instagram 貼文和限時動態',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      name: 'Flickr',
      icon: Globe,
      description: '從 Flickr 下載高品質照片',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: '500px',
      icon: Image,
      description: '匯出 500px 作品集',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  const stats = [
    { label: '成功遷移照片', value: '1,000,000+' },
    { label: '滿意用戶', value: '50,000+' },
    { label: '支援平台', value: '4+' },
    { label: '平均評分', value: '4.9/5' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              輕鬆遷移您的
              <span className="text-blue-600"> 珍貴照片</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              安全、快速地將照片從 Facebook、Instagram、Flickr 等平台遷移到 Google Photos，
              讓您的回憶永遠安全保存。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8">
                <Camera className="w-5 h-5 mr-2" />
                開始遷移
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                了解更多
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              為什麼選擇我們？
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              我們提供最安全、最快速、最簡單的照片遷移解決方案
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center" hover>
                  <Card.Content>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              支援的平台
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              我們支援主流社群平台，讓您輕鬆遷移所有珍貴照片
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {platforms.map((platform, index) => {
              const Icon = platform.icon;
              return (
                <Card key={index} className="text-center" hover>
                  <Card.Content>
                    <div className={`w-16 h-16 ${platform.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${platform.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {platform.description}
                    </p>
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-blue-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            準備開始遷移您的照片了嗎？
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            只需幾個簡單步驟，就能將您的珍貴回憶安全地遷移到 Google Photos
          </p>
          
          {/* Progress Demo */}
          <div className="max-w-md mx-auto mb-8">
            <ProgressBar 
              value={75} 
              showLabel 
              label="遷移進度示例" 
              variant="success"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/migrate">
              <Button size="lg" className="px-8">
                立即開始
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8">
              查看說明
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home; 