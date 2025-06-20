// 用戶同意管理組件
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import TermsOfService from './TermsOfService.jsx';

// 同意狀態
export const CONSENT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired'
};

// 同意類型
export const CONSENT_TYPES = {
  PRIVACY_POLICY: 'privacy_policy',
  TERMS_OF_SERVICE: 'terms_of_service',
  MARKETING: 'marketing',
  ANALYTICS: 'analytics',
  COOKIES: 'cookies'
};

export const ConsentManager = ({ 
  userId,
  onConsentUpdate,
  showOnMount = true,
  requiredConsents = [CONSENT_TYPES.PRIVACY_POLICY, CONSENT_TYPES.TERMS_OF_SERVICE],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // overview, privacy, terms, cookies
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasRequiredConsents, setHasRequiredConsents] = useState(false);

  // 載入用戶同意狀態
  useEffect(() => {
    loadUserConsents();
  }, [userId]);

  // 檢查是否需要顯示同意對話框
  useEffect(() => {
    if (showOnMount && !hasRequiredConsents) {
      setIsOpen(true);
    }
  }, [showOnMount, hasRequiredConsents]);

  // 載入用戶同意狀態
  const loadUserConsents = useCallback(async () => {
    if (!userId) return;

    try {
      const savedConsents = localStorage.getItem(`user_consents_${userId}`);
      if (savedConsents) {
        const parsedConsents = JSON.parse(savedConsents);
        setConsents(parsedConsents);
        
        // 檢查是否有所有必需的同意
        const hasAll = requiredConsents.every(type => 
          parsedConsents[type]?.status === CONSENT_STATUS.ACCEPTED &&
          !isConsentExpired(parsedConsents[type])
        );
        setHasRequiredConsents(hasAll);
      }
    } catch (error) {
      console.error('Failed to load user consents:', error);
    }
  }, [userId, requiredConsents]);

  // 檢查同意是否過期
  const isConsentExpired = useCallback((consent) => {
    if (!consent.expiresAt) return false;
    return new Date(consent.expiresAt) <= new Date();
  }, []);

  // 更新同意狀態
  const updateConsent = useCallback(async (type, status, options = {}) => {
    const consentData = {
      type,
      status,
      timestamp: new Date().toISOString(),
      version: options.version || '1.0',
      expiresAt: options.expiresAt,
      ipAddress: options.ipAddress,
      userAgent: navigator.userAgent
    };

    const newConsents = {
      ...consents,
      [type]: consentData
    };

    setConsents(newConsents);

    // 保存到本地存儲
    try {
      localStorage.setItem(`user_consents_${userId}`, JSON.stringify(newConsents));
      
      // 檢查是否完成所有必需同意
      const hasAll = requiredConsents.every(reqType => 
        newConsents[reqType]?.status === CONSENT_STATUS.ACCEPTED &&
        !isConsentExpired(newConsents[reqType])
      );
      setHasRequiredConsents(hasAll);

      // 通知父組件
      onConsentUpdate?.(type, status, consentData);

      // 如果完成所有必需同意，關閉對話框
      if (hasAll) {
        setIsOpen(false);
      }

    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }, [consents, userId, requiredConsents, isConsentExpired, onConsentUpdate]);

  // 處理隱私政策同意
  const handlePrivacyAccept = useCallback(() => {
    updateConsent(CONSENT_TYPES.PRIVACY_POLICY, CONSENT_STATUS.ACCEPTED, {
      version: '1.0',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後過期
    });
    setCurrentView('overview');
  }, [updateConsent]);

  // 處理服務條款同意
  const handleTermsAccept = useCallback(() => {
    updateConsent(CONSENT_TYPES.TERMS_OF_SERVICE, CONSENT_STATUS.ACCEPTED, {
      version: '1.0',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後過期
    });
    setCurrentView('overview');
  }, [updateConsent]);

  // 處理 Cookie 同意
  const handleCookieConsent = useCallback((cookieTypes) => {
    const consentData = {
      necessary: true, // 必要 cookies 總是接受
      functional: cookieTypes.includes('functional'),
      analytics: cookieTypes.includes('analytics'),
      marketing: cookieTypes.includes('marketing')
    };

    updateConsent(CONSENT_TYPES.COOKIES, CONSENT_STATUS.ACCEPTED, {
      version: '1.0',
      details: consentData,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }, [updateConsent]);

  // 拒絕所有非必要同意
  const handleDeclineAll = useCallback(() => {
    requiredConsents.forEach(type => {
      updateConsent(type, CONSENT_STATUS.DECLINED);
    });
    setIsOpen(false);
  }, [requiredConsents, updateConsent]);

  // 獲取同意狀態圖標
  const getConsentIcon = useCallback((type) => {
    const consent = consents[type];
    if (!consent) return '⏳';
    
    switch (consent.status) {
      case CONSENT_STATUS.ACCEPTED:
        return isConsentExpired(consent) ? '⏰' : '✅';
      case CONSENT_STATUS.DECLINED:
        return '❌';
      default:
        return '⏳';
    }
  }, [consents, isConsentExpired]);

  // 渲染概覽頁面
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          歡迎使用照片遷移系統
        </h2>
        <p className="text-gray-600">
          為了為您提供最佳的服務體驗，我們需要您的同意以處理您的個人資料。
        </p>
      </div>

      <div className="space-y-4">
        {/* 隱私政策 */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getConsentIcon(CONSENT_TYPES.PRIVACY_POLICY)}</span>
              <div>
                <h3 className="font-medium">隱私政策</h3>
                <p className="text-sm text-gray-600">
                  了解我們如何收集、使用和保護您的個人資訊
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('privacy')}
            >
              查看詳情
            </Button>
          </div>
        </Card>

        {/* 服務條款 */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getConsentIcon(CONSENT_TYPES.TERMS_OF_SERVICE)}</span>
              <div>
                <h3 className="font-medium">服務條款</h3>
                <p className="text-sm text-gray-600">
                  使用我們服務時需要遵守的條款和條件
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('terms')}
            >
              查看詳情
            </Button>
          </div>
        </Card>

        {/* Cookie 設定 */}
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getConsentIcon(CONSENT_TYPES.COOKIES)}</span>
              <div>
                <h3 className="font-medium">Cookie 偏好設定</h3>
                <p className="text-sm text-gray-600">
                  管理我們如何使用 cookies 來改善您的體驗
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('cookies')}
            >
              設定偏好
            </Button>
          </div>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <Button
          onClick={() => {
            // 接受所有必要同意
            requiredConsents.forEach(type => {
              updateConsent(type, CONSENT_STATUS.ACCEPTED, {
                version: '1.0',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              });
            });
            // 接受所有 Cookie
            handleCookieConsent(['functional', 'analytics', 'marketing']);
          }}
          className="w-full"
          loading={loading}
        >
          接受全部並繼續
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            // 只接受必要的
            requiredConsents.forEach(type => {
              updateConsent(type, CONSENT_STATUS.ACCEPTED, {
                version: '1.0',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              });
            });
            // 只接受必要 Cookie
            handleCookieConsent([]);
          }}
          className="w-full"
        >
          只接受必要項目
        </Button>

        <Button
          variant="ghost"
          onClick={handleDeclineAll}
          className="w-full text-gray-500"
        >
          全部拒絕
        </Button>
      </div>
    </div>
  );

  // 渲染 Cookie 設定頁面
  const renderCookieSettings = () => {
    const [selectedCookies, setSelectedCookies] = useState(['functional']);

    const cookieCategories = [
      {
        id: 'necessary',
        name: '必要 Cookies',
        description: '這些 cookies 是網站正常運作所必需的，無法禁用。',
        required: true,
        enabled: true
      },
      {
        id: 'functional',
        name: '功能性 Cookies',
        description: '這些 cookies 用於記住您的偏好和選擇。',
        required: false,
        enabled: selectedCookies.includes('functional')
      },
      {
        id: 'analytics',
        name: '分析 Cookies',
        description: '這些 cookies 幫助我們了解網站使用情況（匿名化）。',
        required: false,
        enabled: selectedCookies.includes('analytics')
      },
      {
        id: 'marketing',
        name: '行銷 Cookies',
        description: '這些 cookies 用於向您顯示相關的廣告和內容。',
        required: false,
        enabled: selectedCookies.includes('marketing')
      }
    ];

    const toggleCookie = (cookieId) => {
      if (cookieId === 'necessary') return; // 無法切換必要 cookies

      setSelectedCookies(prev => 
        prev.includes(cookieId)
          ? prev.filter(id => id !== cookieId)
          : [...prev, cookieId]
      );
    };

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cookie 偏好設定
          </h2>
          <p className="text-gray-600">
            您可以選擇接受或拒絕不同類型的 cookies。
          </p>
        </div>

        <div className="space-y-4">
          {cookieCategories.map(category => (
            <Card key={category.id}>
              <div className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{category.name}</h3>
                    {category.required && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        必要
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {category.description}
                  </p>
                </div>
                <button
                  onClick={() => toggleCookie(category.id)}
                  disabled={category.required}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    category.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  } ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      category.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={() => {
              handleCookieConsent(selectedCookies.filter(id => id !== 'necessary'));
              setCurrentView('overview');
            }}
            className="flex-1"
          >
            保存偏好設定
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('overview')}
            className="flex-1"
          >
            返回
          </Button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => hasRequiredConsents && setIsOpen(false)}
      title=""
      size="large"
      closeButton={hasRequiredConsents}
      className={className}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'overview' && renderOverview()}
          
          {currentView === 'privacy' && (
            <PrivacyPolicy
              onAccept={handlePrivacyAccept}
              onDecline={() => setCurrentView('overview')}
              showActions={true}
            />
          )}
          
          {currentView === 'terms' && (
            <TermsOfService
              onAccept={handleTermsAccept}
              onDecline={() => setCurrentView('overview')}
              showActions={true}
            />
          )}
          
          {currentView === 'cookies' && renderCookieSettings()}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
};

// 簡單的同意橫幅組件
export const ConsentBanner = ({ 
  onAccept, 
  onDecline, 
  onManagePreferences,
  message = "我們使用 cookies 來改善您的體驗。",
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 檢查用戶是否已經同意
    const hasConsent = localStorage.getItem('cookie_consent');
    if (hasConsent) {
      setIsVisible(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setIsVisible(false);
    onDecline?.();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 ${className}`}
    >
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-gray-700">
              {message}
              <a 
                href="/privacy" 
                className="text-blue-600 hover:underline ml-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                了解更多
              </a>
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onManagePreferences}
            >
              管理偏好
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
            >
              拒絕
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
            >
              接受
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Hook 用於管理用戶同意狀態
export const useConsent = (userId) => {
  const [consents, setConsents] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsents();
  }, [userId]);

  const loadConsents = async () => {
    if (!userId) return;

    try {
      const savedConsents = localStorage.getItem(`user_consents_${userId}`);
      if (savedConsents) {
        setConsents(JSON.parse(savedConsents));
      }
    } catch (error) {
      console.error('Failed to load consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasConsent = (type) => {
    const consent = consents[type];
    if (!consent || consent.status !== CONSENT_STATUS.ACCEPTED) {
      return false;
    }
    
    // 檢查是否過期
    if (consent.expiresAt && new Date(consent.expiresAt) <= new Date()) {
      return false;
    }
    
    return true;
  };

  const updateConsent = (type, status, options = {}) => {
    const consentData = {
      type,
      status,
      timestamp: new Date().toISOString(),
      version: options.version || '1.0',
      expiresAt: options.expiresAt,
      details: options.details
    };

    const newConsents = {
      ...consents,
      [type]: consentData
    };

    setConsents(newConsents);
    localStorage.setItem(`user_consents_${userId}`, JSON.stringify(newConsents));
  };

  return {
    consents,
    loading,
    hasConsent,
    updateConsent
  };
};

export default ConsentManager;