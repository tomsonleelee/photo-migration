// 隱私政策頁面組件
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

export const PrivacyPolicy = ({ onAccept, onDecline, showActions = false }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const lastUpdated = '2024年6月20日';

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    {
      id: 'overview',
      title: '概述',
      content: (
        <div className="space-y-4">
          <p>
            歡迎使用照片遷移系統（以下簡稱「本服務」）。本隱私政策說明我們如何收集、使用、存儲和保護您的個人資訊。
          </p>
          <p>
            我們承諾保護您的隱私，並遵循最高的安全標準處理您的個人資料。本政策適用於您使用本服務的所有情況。
          </p>
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">重點摘要</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 我們僅收集提供服務所必需的資訊</li>
              <li>• 您的照片和資料經過加密保護</li>
              <li>• 我們不會出售您的個人資訊</li>
              <li>• 您可以隨時刪除您的資料</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'collection',
      title: '資訊收集',
      content: (
        <div className="space-y-4">
          <h4 className="font-medium">我們收集的資訊類型：</h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-sm">帳戶資訊</h5>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 電子郵件地址（用於帳戶驗證和通知）</li>
                <li>• 用戶名稱（可選）</li>
                <li>• 密碼（加密存儲）</li>
                <li>• 雙因子認證設定</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-sm">第三方平台授權</h5>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• OAuth 授權令牌（用於存取您的照片）</li>
                <li>• 平台用戶 ID（Google Photos, Flickr, Instagram 等）</li>
                <li>• 授權範圍和權限</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-sm">照片和媒體</h5>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 照片檔案和中繼資料</li>
                <li>• EXIF 資訊（日期、位置、設備資訊）</li>
                <li>• 相簿和標籤資訊</li>
                <li>• 檔案大小和格式資訊</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-sm">使用資訊</h5>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• IP 地址（用於安全和地理位置服務）</li>
                <li>• 瀏覽器類型和版本</li>
                <li>• 使用時間和頻率</li>
                <li>• 錯誤日誌和性能資料</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'usage',
      title: '資訊使用',
      content: (
        <div className="space-y-4">
          <h4 className="font-medium">我們使用您的資訊用於：</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-md">
              <h5 className="font-medium text-green-900">核心服務</h5>
              <ul className="text-sm text-green-800 space-y-1 mt-2">
                <li>• 執行照片遷移和同步</li>
                <li>• 管理您的帳戶和偏好設定</li>
                <li>• 提供技術支援</li>
                <li>• 監控服務性能和可靠性</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h5 className="font-medium text-blue-900">安全保護</h5>
              <ul className="text-sm text-blue-800 space-y-1 mt-2">
                <li>• 防止欺詐和濫用</li>
                <li>• 執行安全措施</li>
                <li>• 驗證身份和授權</li>
                <li>• 檢測異常活動</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-md">
              <h5 className="font-medium text-purple-900">溝通</h5>
              <ul className="text-sm text-purple-800 space-y-1 mt-2">
                <li>• 發送服務通知</li>
                <li>• 回應您的查詢</li>
                <li>• 提供重要更新</li>
                <li>• 安全警報和提醒</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-md">
              <h5 className="font-medium text-orange-900">改進服務</h5>
              <ul className="text-sm text-orange-800 space-y-1 mt-2">
                <li>• 分析使用模式（匿名化）</li>
                <li>• 改善功能和性能</li>
                <li>• 開發新功能</li>
                <li>• 修復錯誤和問題</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sharing',
      title: '資訊分享',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <h4 className="font-medium text-red-900 mb-2">我們不會出售您的個人資訊</h4>
            <p className="text-sm text-red-800">
              我們承諾不會將您的個人資訊出售給第三方用於商業目的。
            </p>
          </div>
          
          <h4 className="font-medium">有限的資訊分享情況：</h4>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-sm">服務提供商</h5>
              <p className="text-sm text-gray-600">
                我們可能與信任的第三方服務提供商分享必要資訊，以提供以下服務：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 雲端存儲服務（加密存儲）</li>
                <li>• 身份驗證服務</li>
                <li>• 監控和分析服務</li>
                <li>• 客戶支援服務</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-sm">法律要求</h5>
              <p className="text-sm text-gray-600">
                在以下情況下，我們可能被要求披露您的資訊：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 遵守法律義務</li>
                <li>• 回應法院命令或政府要求</li>
                <li>• 保護我們的權利和財產</li>
                <li>• 防止非法活動</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-sm">業務轉移</h5>
              <p className="text-sm text-gray-600">
                如果我們被收購或合併，您的資訊可能會轉移給新的所有者，但仍受本隱私政策約束。
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: '安全措施',
      content: (
        <div className="space-y-4">
          <p>我們實施了多層安全措施來保護您的資料：</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">傳輸安全</h5>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• TLS 1.3 加密</li>
                <li>• HTTPS 強制重定向</li>
                <li>• 證書固定</li>
                <li>• HSTS 標頭</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">存儲安全</h5>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• AES-256 加密</li>
                <li>• 安全密鑰管理</li>
                <li>• 定期備份</li>
                <li>• 存取控制</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">應用安全</h5>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• 雙因子認證</li>
                <li>• CSRF 保護</li>
                <li>• 輸入驗證</li>
                <li>• 會話管理</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">監控安全</h5>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• 異常檢測</li>
                <li>• 安全日誌</li>
                <li>• 漏洞掃描</li>
                <li>• 事件回應</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'rights',
      title: '您的權利',
      content: (
        <div className="space-y-4">
          <p>根據適用的隱私法律，您享有以下權利：</p>
          
          <div className="space-y-3">
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">存取權</h5>
              <p className="text-sm text-gray-600">
                您有權要求查看我們持有的關於您的個人資訊。
              </p>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">更正權</h5>
              <p className="text-sm text-gray-600">
                您可以要求更正不準確或不完整的個人資訊。
              </p>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">刪除權</h5>
              <p className="text-sm text-gray-600">
                您可以要求刪除您的個人資訊（「被遺忘權」）。
              </p>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">可攜性權</h5>
              <p className="text-sm text-gray-600">
                您可以要求以結構化、常用的格式接收您的資料。
              </p>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">限制處理權</h5>
              <p className="text-sm text-gray-600">
                在某些情況下，您可以要求限制我們對您資料的處理。
              </p>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium">反對權</h5>
              <p className="text-sm text-gray-600">
                您可以反對基於合法利益的資料處理。
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <h5 className="font-medium text-blue-900">如何行使您的權利</h5>
            <p className="text-sm text-blue-800 mt-2">
              要行使任何這些權利，請通過以下方式聯繫我們：
            </p>
            <ul className="text-sm text-blue-800 space-y-1 mt-2">
              <li>• 電子郵件：privacy@photomigration.com</li>
              <li>• 在線表單：設定 → 隱私控制</li>
              <li>• 我們將在30天內回應您的請求</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'retention',
      title: '資料保留',
      content: (
        <div className="space-y-4">
          <p>我們只在必要的時間內保留您的個人資訊：</p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="font-medium">帳戶資訊</span>
              <span className="text-sm text-gray-600">帳戶期間 + 1年</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="font-medium">照片和媒體</span>
              <span className="text-sm text-gray-600">用戶刪除後立即清除</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="font-medium">使用日誌</span>
              <span className="text-sm text-gray-600">90天</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="font-medium">安全日誌</span>
              <span className="text-sm text-gray-600">1年</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="font-medium">匿名化分析資料</span>
              <span className="text-sm text-gray-600">3年</span>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-md">
            <h5 className="font-medium text-yellow-900">自動刪除</h5>
            <p className="text-sm text-yellow-800 mt-2">
              我們實施了自動化系統來確保資料在保留期限後被安全刪除。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'international',
      title: '國際轉移',
      content: (
        <div className="space-y-4">
          <p>
            我們的服務可能涉及跨國界的資料轉移。我們確保所有轉移都符合適用的法律要求。
          </p>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <h5 className="font-medium text-blue-900">保護措施</h5>
            <ul className="text-sm text-blue-800 space-y-1 mt-2">
              <li>• 歐盟標準合約條款</li>
              <li>• 充分性決定</li>
              <li>• 認證機制</li>
              <li>• 綁定企業規則</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-medium">資料處理地點</h5>
            <div className="text-sm text-gray-600">
              <p>• 主要處理：歐盟（GDPR 保護）</p>
              <p>• 備份存儲：美國（隱私框架）</p>
              <p>• 分析處理：加拿大（PIPEDA 保護）</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cookies',
      title: 'Cookies 和追蹤',
      content: (
        <div className="space-y-4">
          <p>我們使用 cookies 和類似技術來改善您的體驗：</p>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium">必要 Cookies</h5>
              <p className="text-sm text-gray-600">
                這些 cookies 是網站正常運作所必需的，無法禁用。
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 會話管理</li>
                <li>• 安全驗證</li>
                <li>• 表單數據</li>
                <li>• 語言偏好</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium">功能性 Cookies</h5>
              <p className="text-sm text-gray-600">
                這些 cookies 用於記住您的偏好和選擇。
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 用戶偏好設定</li>
                <li>• 主題選擇</li>
                <li>• 版面配置</li>
                <li>• 通知設定</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium">分析 Cookies</h5>
              <p className="text-sm text-gray-600">
                這些 cookies 幫助我們了解網站使用情況（匿名化）。
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 頁面瀏覽統計</li>
                <li>• 使用模式分析</li>
                <li>• 性能監控</li>
                <li>• 錯誤追蹤</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-md">
            <h5 className="font-medium text-green-900">Cookie 控制</h5>
            <p className="text-sm text-green-800 mt-2">
              您可以通過瀏覽器設定或我們的 Cookie 偏好中心管理 cookies。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'changes',
      title: '政策更新',
      content: (
        <div className="space-y-4">
          <p>
            我們可能會不時更新本隱私政策以反映我們實踐的變化或法律要求的變化。
          </p>
          
          <div className="space-y-3">
            <div>
              <h5 className="font-medium">重大變更通知</h5>
              <p className="text-sm text-gray-600">
                對於重大變更，我們將：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 通過電子郵件通知您</li>
                <li>• 在網站上顯示明顯通知</li>
                <li>• 提前30天發出通知</li>
                <li>• 解釋變更的原因和影響</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium">輕微變更</h5>
              <p className="text-sm text-gray-600">
                對於輕微變更（如澄清措辭），我們將：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 更新頁面上的「最後更新」日期</li>
                <li>• 在變更日誌中記錄修改</li>
                <li>• 通過應用內通知告知</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <h5 className="font-medium text-blue-900">建議行動</h5>
            <p className="text-sm text-blue-800 mt-2">
              我們建議您定期查看本隱私政策，以了解我們如何保護您的資訊。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: '聯繫我們',
      content: (
        <div className="space-y-4">
          <p>如果您對本隱私政策有任何疑問或關切，請聯繫我們：</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">隱私事務</h5>
              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>電子郵件：privacy@photomigration.com</p>
                <p>回應時間：48小時內</p>
                <p>語言：中文、英文</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">資料保護官</h5>
              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>電子郵件：dpo@photomigration.com</p>
                <p>專用於：GDPR 相關查詢</p>
                <p>管轄區：歐盟</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">郵政地址</h5>
              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>Photo Migration System</p>
                <p>隱私部門</p>
                <p>123 Privacy Street</p>
                <p>Taipei, Taiwan 10001</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="font-medium">監管機構</h5>
              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>如有投訴，您也可以聯繫：</p>
                <p>國家發展委員會</p>
                <p>個人資料保護專區</p>
                <p>https://www.ndc.gov.tw</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">隱私政策</h1>
        <div className="text-sm text-gray-600">
          <p>最後更新：{lastUpdated}</p>
          <p>生效日期：{lastUpdated}</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  {section.title}
                </h2>
                <motion.div
                  animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ↓
                </motion.div>
              </button>
              
              <motion.div
                initial={false}
                animate={{
                  height: expandedSections.has(section.id) ? 'auto' : 0,
                  opacity: expandedSections.has(section.id) ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 text-gray-700">
                  {section.content}
                </div>
              </motion.div>
            </Card>
          </motion.div>
        ))}
      </div>

      {showActions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex space-x-4 justify-center"
        >
          <Button
            onClick={onAccept}
            className="px-8"
          >
            我同意此隱私政策
          </Button>
          <Button
            variant="outline"
            onClick={onDecline}
            className="px-8"
          >
            我不同意
          </Button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-sm text-gray-500"
      >
        <p>本文件也有其他語言版本：</p>
        <div className="space-x-4 mt-2">
          <button className="text-blue-600 hover:underline">English</button>
          <button className="text-blue-600 hover:underline">日本語</button>
          <button className="text-blue-600 hover:underline">한국어</button>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;