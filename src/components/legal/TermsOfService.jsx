// 服務條款頁面組件
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

export const TermsOfService = ({ onAccept, onDecline, showActions = false }) => {
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
      id: 'acceptance',
      title: '服務條款接受',
      content: (
        <div className="space-y-4">
          <p>
            歡迎使用照片遷移系統（以下簡稱「本服務」、「我們的服務」或「平台」）。本服務由 Photo Migration System 公司（以下簡稱「我們」、「我們的」或「公司」）提供。
          </p>
          <p>
            通過存取或使用本服務，您同意受本服務條款（以下簡稱「條款」）的約束。如果您不同意這些條款的任何部分，請不要使用本服務。
          </p>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">重要注意事項</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 這些條款構成您與我們之間具有法律約束力的協議</li>
              <li>• 使用本服務即表示您已閱讀、理解並同意這些條款</li>
              <li>• 我們可能會不時更新這些條款</li>
              <li>• 繼續使用服務表示您接受任何修改</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">適用性</h4>
            <p className="text-sm text-gray-600 mt-2">
              這些條款適用於所有訪問或使用本服務的用戶，包括但不限於瀏覽者、註冊用戶和貢獻內容的用戶。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'service-description',
      title: '服務描述',
      content: (
        <div className="space-y-4">
          <p>
            照片遷移系統是一個自動化平台，幫助用戶在不同的照片存儲和分享服務之間轉移其數字照片和相關媒體內容。
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">核心功能</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 多平台照片同步（Google Photos、Flickr、Instagram、Facebook、500px）</li>
                <li>• 批量照片轉移和備份</li>
                <li>• 元數據保留和轉換</li>
                <li>• 相簿組織和管理</li>
                <li>• 進度追蹤和報告</li>
                <li>• 錯誤處理和重試機制</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">技術特性</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1">
                <li>• 端到端加密傳輸</li>
                <li>• OAuth 2.0 安全授權</li>
                <li>• 即時進度更新</li>
                <li>• 自動重試和錯誤恢復</li>
                <li>• 多線程並行處理</li>
                <li>• 智能去重和檔案檢查</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">支援格式</h4>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <h5 className="font-medium text-sm">圖片格式</h5>
                  <p className="text-sm text-gray-600">JPEG, PNG, GIF, TIFF, BMP, WebP, HEIC, RAW</p>
                </div>
                <div>
                  <h5 className="font-medium text-sm">影片格式</h5>
                  <p className="text-sm text-gray-600">MP4, AVI, MOV, MKV, WebM, 3GP</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <h4 className="font-medium text-yellow-900 mb-2">服務限制</h4>
            <p className="text-sm text-yellow-800">
              我們的服務受到第三方平台的 API 限制和政策約束。某些功能可能因平台政策變更而受到影響。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-accounts',
      title: '用戶帳戶',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">帳戶註冊</h4>
            <p className="text-sm text-gray-600 mt-2">
              要使用本服務的完整功能，您需要創建一個帳戶。註冊時，您必須：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 提供準確、最新和完整的資訊</li>
              <li>• 保持您的帳戶資訊更新</li>
              <li>• 選擇強密碼並保護帳戶安全</li>
              <li>• 不與他人分享您的帳戶憑證</li>
              <li>• 立即通知我們任何未經授權的使用</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">帳戶責任</h4>
            <div className="space-y-2 mt-2">
              <p className="text-sm text-gray-600">
                您對您帳戶下發生的所有活動負責，包括：
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-md">
                  <h5 className="font-medium text-red-900">您的責任</h5>
                  <ul className="text-sm text-red-800 space-y-1 mt-1">
                    <li>• 保護登入憑證</li>
                    <li>• 監控帳戶活動</li>
                    <li>• 報告可疑行為</li>
                    <li>• 遵守使用條款</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <h5 className="font-medium text-green-900">我們的責任</h5>
                  <ul className="text-sm text-green-800 space-y-1 mt-1">
                    <li>• 提供安全措施</li>
                    <li>• 監控異常活動</li>
                    <li>• 及時安全通知</li>
                    <li>• 協助帳戶恢復</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">帳戶終止</h4>
            <p className="text-sm text-gray-600 mt-2">
              您可以隨時刪除您的帳戶。我們也保留在以下情況下暫停或終止帳戶的權利：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 違反服務條款</li>
              <li>• 從事欺詐或非法活動</li>
              <li>• 濫用或誤用服務</li>
              <li>• 長期不活躍（超過2年）</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'acceptable-use',
      title: '可接受使用政策',
      content: (
        <div className="space-y-4">
          <p>使用本服務時，您同意：</p>
          
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 p-4 rounded-md">
              <h4 className="font-medium text-green-900">允許的使用</h4>
              <ul className="text-sm text-green-800 space-y-1 mt-2">
                <li>• 轉移您擁有權利的照片和媒體</li>
                <li>• 為個人或商業目的組織您的內容</li>
                <li>• 在法律範圍內備份您的數字資產</li>
                <li>• 與朋友和家人分享您的內容</li>
                <li>• 使用我們提供的工具和功能</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <h4 className="font-medium text-red-900">禁止的使用</h4>
              <ul className="text-sm text-red-800 space-y-1 mt-2">
                <li>• 上傳或轉移您沒有權利的內容</li>
                <li>• 侵犯他人的知識產權</li>
                <li>• 發佈非法、有害或攻擊性內容</li>
                <li>• 使用服務進行垃圾郵件或惡意活動</li>
                <li>• 嘗試破壞或干擾服務運作</li>
                <li>• 規避任何安全措施</li>
                <li>• 進行自動化的大量操作（除非明確允許）</li>
                <li>• 逆向工程或試圖提取源代碼</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium">內容責任</h4>
            <p className="text-sm text-gray-600 mt-2">
              您對通過我們服務傳輸的所有內容負完全責任。這包括確保：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 您擁有必要的權利或許可</li>
              <li>• 內容不侵犯任何法律或第三方權利</li>
              <li>• 內容適合在我們的平台上處理</li>
              <li>• 您遵守所有適用的隱私法律</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">違規後果</h4>
            <p className="text-sm text-gray-600 mt-2">
              違反可接受使用政策可能導致：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="text-center p-3 bg-yellow-50 rounded-md">
                <div className="text-2xl mb-1">⚠️</div>
                <h5 className="font-medium text-yellow-900">警告</h5>
                <p className="text-sm text-yellow-800">首次輕微違規</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-md">
                <div className="text-2xl mb-1">⏸️</div>
                <h5 className="font-medium text-orange-900">暫停</h5>
                <p className="text-sm text-orange-800">重複或嚴重違規</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-md">
                <div className="text-2xl mb-1">🚫</div>
                <h5 className="font-medium text-red-900">終止</h5>
                <p className="text-sm text-red-800">嚴重或持續違規</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'intellectual-property',
      title: '知識產權',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">我們的知識產權</h4>
            <p className="text-sm text-gray-600 mt-2">
              本服務及其原始內容、功能和特性由 Photo Migration System 擁有，並受國際版權、商標、專利、商業秘密和其他知識產權法律保護。
            </p>
            
            <div className="bg-blue-50 p-4 rounded-md mt-3">
              <h5 className="font-medium text-blue-900">包括但不限於</h5>
              <ul className="text-sm text-blue-800 space-y-1 mt-2">
                <li>• 軟體源代碼和架構</li>
                <li>• 用戶介面設計和體驗</li>
                <li>• 商標、標誌和品牌元素</li>
                <li>• 專有算法和處理邏輯</li>
                <li>• 文檔和技術規範</li>
                <li>• 數據庫結構和內容</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium">您的內容權利</h4>
            <p className="text-sm text-gray-600 mt-2">
              您保留對您上傳、存儲或通過我們服務處理的所有內容的所有權和知識產權。
            </p>
            
            <div className="space-y-3 mt-3">
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">您擁有的權利</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 完全的所有權和控制權</li>
                  <li>• 決定內容的使用和分發</li>
                  <li>• 隨時刪除或修改內容</li>
                  <li>• 轉移到其他服務</li>
                </ul>
              </div>
              
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">授予我們的有限許可</h5>
                <p className="text-sm text-gray-600 mt-1">
                  為了提供服務，您授予我們有限的、非獨家的、可撤銷的許可來：
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 存儲和處理您的內容</li>
                  <li>• 在服務之間傳輸內容</li>
                  <li>• 創建必要的技術副本</li>
                  <li>• 進行格式轉換以確保相容性</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">第三方內容</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們的服務可能包含或連結到第三方內容。我們不擁有、控制或認可這些內容，您使用此類內容需遵守相應的條款和條件。
            </p>
          </div>

          <div>
            <h4 className="font-medium">DMCA 政策</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們遵守《數字千年版權法》(DMCA) 的規定。如果您認為有內容侵犯了您的版權，請聯繫我們的指定代理：
            </p>
            <div className="bg-gray-50 p-3 rounded-md mt-2">
              <p className="text-sm">
                <strong>DMCA 代理：</strong> legal@photomigration.com<br/>
                <strong>地址：</strong> 123 Legal Street, Taipei, Taiwan<br/>
                <strong>電話：</strong> +886-2-1234-5678
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'privacy-security',
      title: '隱私與安全',
      content: (
        <div className="space-y-4">
          <p>
            您的隱私和資料安全是我們的首要任務。詳細的隱私實踐請參閱我們的<a href="/privacy" className="text-blue-600 hover:underline">隱私政策</a>。
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">資料保護承諾</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-green-50 p-4 rounded-md">
                  <h5 className="font-medium text-green-900">技術保護</h5>
                  <ul className="text-sm text-green-800 space-y-1 mt-2">
                    <li>• 端到端加密</li>
                    <li>• 安全的數據傳輸</li>
                    <li>• 定期安全審計</li>
                    <li>• 存取控制和監控</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <h5 className="font-medium text-blue-900">法律保護</h5>
                  <ul className="text-sm text-blue-800 space-y-1 mt-2">
                    <li>• GDPR 合規</li>
                    <li>• CCPA 合規</li>
                    <li>• 本地資料保護法</li>
                    <li>• 行業標準遵循</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium">安全事件回應</h4>
              <p className="text-sm text-gray-600 mt-2">
                如果發生安全事件，我們將：
              </p>
              <ol className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>1. 立即調查和控制事件</li>
                <li>2. 評估影響和風險</li>
                <li>3. 在72小時內通知受影響用戶</li>
                <li>4. 與相關監管機構合作</li>
                <li>5. 實施改進措施防止再次發生</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium">您的安全責任</h4>
              <p className="text-sm text-gray-600 mt-2">為了保護您的帳戶安全，請：</p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 使用強密碼並定期更新</li>
                <li>• 啟用雙因子認證</li>
                <li>• 不在公共設備上保存登入資訊</li>
                <li>• 立即報告可疑活動</li>
                <li>• 保持軟體和瀏覽器更新</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'payment-billing',
      title: '付款和計費',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">服務計劃</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="border border-gray-200 p-4 rounded-md">
                <h5 className="font-medium">免費方案</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-2">
                  <li>• 每月最多 100 張照片</li>
                  <li>• 基本遷移功能</li>
                  <li>• 社群支援</li>
                  <li>• 標準安全功能</li>
                </ul>
              </div>
              <div className="border border-blue-200 p-4 rounded-md bg-blue-50">
                <h5 className="font-medium text-blue-900">專業方案</h5>
                <ul className="text-sm text-blue-800 space-y-1 mt-2">
                  <li>• 無限照片遷移</li>
                  <li>• 高級功能</li>
                  <li>• 優先支援</li>
                  <li>• 批量處理</li>
                </ul>
              </div>
              <div className="border border-purple-200 p-4 rounded-md bg-purple-50">
                <h5 className="font-medium text-purple-900">企業方案</h5>
                <ul className="text-sm text-purple-800 space-y-1 mt-2">
                  <li>• 多用戶管理</li>
                  <li>• API 存取</li>
                  <li>• 專屬支援</li>
                  <li>• 客製化功能</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">計費政策</h4>
            <div className="space-y-3 mt-2">
              <div>
                <h5 className="font-medium text-sm">付款方式</h5>
                <p className="text-sm text-gray-600">
                  我們接受主要信用卡、PayPal 和銀行轉帳。付款由我們的安全支付處理器處理。
                </p>
              </div>
              
              <div>
                <h5 className="font-medium text-sm">計費週期</h5>
                <ul className="text-sm text-gray-600 ml-4 space-y-1">
                  <li>• 月度訂閱：每月自動扣款</li>
                  <li>• 年度訂閱：每年自動扣款（享有折扣）</li>
                  <li>• 一次性購買：立即扣款</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-sm">取消和退款</h5>
                <ul className="text-sm text-gray-600 ml-4 space-y-1">
                  <li>• 您可以隨時取消訂閱</li>
                  <li>• 取消後服務持續到當前計費週期結束</li>
                  <li>• 30天內無條件退款保證</li>
                  <li>• 特殊情況下的部分退款</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">價格變更</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們可能會不時調整價格。對於現有用戶：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 價格變更前30天通知</li>
              <li>• 當前訂閱週期內維持原價</li>
              <li>• 可選擇取消或接受新價格</li>
              <li>• 長期訂閱享有價格保護</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'disclaimers',
      title: '免責聲明',
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <h4 className="font-medium text-yellow-900">重要法律聲明</h4>
            <p className="text-sm text-yellow-800 mt-2">
              本服務按「現況」提供，不提供任何明示或暗示的保證。請仔細閱讀以下免責聲明。
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium">服務可用性</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 我們努力保持服務可用，但不保證100%正常運行時間</li>
                <li>• 可能因維護、更新或技術問題而暫時中斷</li>
                <li>• 第三方服務的中斷可能影響我們的服務</li>
                <li>• 我們不對服務中斷造成的損失負責</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">資料完整性</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 我們盡力確保資料傳輸的準確性</li>
                <li>• 不保證所有檔案都能完美遷移</li>
                <li>• 建議您保留原始資料的備份</li>
                <li>• 某些元數據可能在轉換過程中遺失</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">第三方服務</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 我們依賴第三方平台的API和服務</li>
                <li>• 這些平台的政策變更可能影響我們的功能</li>
                <li>• 我們不控制第三方服務的可用性或性能</li>
                <li>• 第三方服務的問題不在我們的責任範圍內</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">技術限制</h4>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 某些檔案格式可能不受支援</li>
                <li>• 大型檔案的處理可能需要更長時間</li>
                <li>• 網路條件可能影響傳輸速度和穩定性</li>
                <li>• 設備兼容性可能存在限制</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <h4 className="font-medium text-red-900">免責範圍</h4>
            <p className="text-sm text-red-800 mt-2">
              在法律允許的最大範圍內，我們不對以下情況承擔責任：
            </p>
            <ul className="text-sm text-red-800 ml-4 space-y-1 mt-2">
              <li>• 直接、間接、偶然或後果性損害</li>
              <li>• 利潤損失、資料遺失或業務中斷</li>
              <li>• 第三方的行為或疏忽</li>
              <li>• 不可抗力事件</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'limitation-liability',
      title: '責任限制',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <h4 className="font-medium text-blue-900">責任限制原則</h4>
            <p className="text-sm text-blue-800 mt-2">
              在法律允許的最大範圍內，我們的總責任限制如下：
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium">金額限制</h4>
              <p className="text-sm text-gray-600 mt-2">
                我們對您的總責任不超過：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 免費用戶：新台幣 1,000 元</li>
                <li>• 付費用戶：您在過去12個月內支付的費用總額</li>
                <li>• 企業用戶：年度訂閱費用或新台幣 100,000 元（以較低者為準）</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">排除的損害類型</h4>
              <p className="text-sm text-gray-600 mt-2">我們不對以下類型的損害承擔責任：</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-gray-50 p-3 rounded-md">
                  <h5 className="font-medium">間接損害</h5>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    <li>• 利潤損失</li>
                    <li>• 商譽損害</li>
                    <li>• 機會成本</li>
                    <li>• 預期收益損失</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <h5 className="font-medium">後果性損害</h5>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    <li>• 業務中斷</li>
                    <li>• 第三方索賠</li>
                    <li>• 替代服務成本</li>
                    <li>• 懲罰性損害</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium">時效限制</h4>
              <p className="text-sm text-gray-600 mt-2">
                任何針對我們的法律行動必須在以下時間內提起：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 一般索賠：發現問題後1年內</li>
                <li>• 資料相關索賠：事件發生後6個月內</li>
                <li>• 合約爭議：違約後2年內</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">例外情況</h4>
              <p className="text-sm text-gray-600 mt-2">
                以下情況不受責任限制約束：
              </p>
              <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
                <li>• 故意不當行為或重大過失</li>
                <li>• 人身傷害或死亡</li>
                <li>• 欺詐或虛假陳述</li>
                <li>• 法律明確禁止限制的責任</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
            <h4 className="font-medium text-green-900">風險分擔</h4>
            <p className="text-sm text-green-800 mt-2">
              這些限制反映了我們服務的免費或低成本性質，以及風險在我們和用戶之間的合理分配。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'termination',
      title: '服務終止',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">用戶主動終止</h4>
            <p className="text-sm text-gray-600 mt-2">您可以隨時終止使用我們的服務：</p>
            <div className="space-y-3 mt-3">
              <div className="bg-blue-50 p-3 rounded-md">
                <h5 className="font-medium text-blue-900">如何終止</h5>
                <ul className="text-sm text-blue-800 space-y-1 mt-1">
                  <li>• 登入帳戶設定頁面</li>
                  <li>• 點擊「刪除帳戶」</li>
                  <li>• 確認刪除操作</li>
                  <li>• 我們將在48小時內處理</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-3 rounded-md">
                <h5 className="font-medium text-green-900">終止後果</h5>
                <ul className="text-sm text-green-800 space-y-1 mt-1">
                  <li>• 立即停止存取服務</li>
                  <li>• 30天內刪除所有個人資料</li>
                  <li>• 取消所有進行中的任務</li>
                  <li>• 退還未使用的付費金額</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">我們主動終止</h4>
            <p className="text-sm text-gray-600 mt-2">在以下情況下，我們可能暫停或終止您的帳戶：</p>
            
            <div className="space-y-3 mt-3">
              <div className="bg-yellow-50 p-3 rounded-md">
                <h5 className="font-medium text-yellow-900">立即終止情況</h5>
                <ul className="text-sm text-yellow-800 space-y-1 mt-1">
                  <li>• 嚴重違反服務條款</li>
                  <li>• 從事非法活動</li>
                  <li>• 威脅其他用戶或員工</li>
                  <li>• 嘗試破壞系統安全</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-3 rounded-md">
                <h5 className="font-medium text-orange-900">通知後終止</h5>
                <ul className="text-sm text-orange-800 space-y-1 mt-1">
                  <li>• 重複違反使用政策</li>
                  <li>• 長期未付款（付費用戶）</li>
                  <li>• 帳戶長期不活躍（2年以上）</li>
                  <li>• 濫用免費方案</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">服務停止</h4>
            <p className="text-sm text-gray-600 mt-2">
              如果我們決定停止提供服務，我們將：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 提前90天發出通知</li>
              <li>• 提供資料導出工具</li>
              <li>• 協助遷移到其他服務</li>
              <li>• 退還未使用的付費金額</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">終止後的義務</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">您的義務</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 停止使用服務</li>
                  <li>• 支付未償付費用</li>
                  <li>• 遵守保密義務</li>
                  <li>• 返還任何機密資料</li>
                </ul>
              </div>
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">我們的義務</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 安全刪除您的資料</li>
                  <li>• 處理最終計費</li>
                  <li>• 提供必要的文件</li>
                  <li>• 協助過渡期間</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'governing-law',
      title: '適用法律和爭議解決',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">適用法律</h4>
            <p className="text-sm text-gray-600 mt-2">
              本服務條款受中華民國法律管轄，並按其解釋，不考慮法律衝突原則。
            </p>
            
            <div className="bg-blue-50 p-4 rounded-md mt-3">
              <h5 className="font-medium text-blue-900">管轄權</h5>
              <p className="text-sm text-blue-800 mt-2">
                對於任何爭議，雙方同意台灣台北地方法院具有專屬管轄權。
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium">爭議解決程序</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們致力於友好解決所有爭議。建議的解決步驟：
            </p>
            
            <div className="space-y-3 mt-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <h5 className="font-medium">直接協商</h5>
                  <p className="text-sm text-gray-600">
                    首先通過客戶服務聯繫我們，我們將在5個工作日內回應。
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <h5 className="font-medium">調解</h5>
                  <p className="text-sm text-gray-600">
                    如果直接協商無效，我們可以尋求中立第三方調解。
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <h5 className="font-medium">仲裁</h5>
                  <p className="text-sm text-gray-600">
                    對於重大爭議，可通過中華民國仲裁協會進行仲裁。
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <h5 className="font-medium">法律訴訟</h5>
                  <p className="text-sm text-gray-600">
                    作為最後手段，可向台北地方法院提起訴訟。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">國際用戶</h4>
            <p className="text-sm text-gray-600 mt-2">
              對於台灣境外的用戶：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 當地法律可能提供額外保護</li>
              <li>• 我們尊重當地的強制性法律規定</li>
              <li>• 在法律衝突情況下，當地強制性法律優先</li>
              <li>• 我們可能在當地設立法律實體以提供服務</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">集體訴訟棄權</h4>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <p className="text-sm text-yellow-800">
                在法律允許的範圍內，您同意放棄參與集體訴訟、集體仲裁或代表性訴訟的權利。
                任何爭議應以個人身份解決。
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'changes',
      title: '條款修改',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">修改權利</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們保留隨時修改這些服務條款的權利。修改可能基於：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 法律或監管要求的變化</li>
              <li>• 新功能或服務的增加</li>
              <li>• 商業模式的調整</li>
              <li>• 用戶反饋和體驗改進</li>
              <li>• 安全或隱私政策的更新</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">通知程序</h4>
            <div className="space-y-3 mt-3">
              <div className="bg-green-50 p-4 rounded-md">
                <h5 className="font-medium text-green-900">重大修改</h5>
                <p className="text-sm text-green-800 mt-2">
                  對於重大修改（如增加新的費用、改變核心功能、修改責任條款），我們將：
                </p>
                <ul className="text-sm text-green-800 space-y-1 mt-2">
                  <li>• 提前30天發送電子郵件通知</li>
                  <li>• 在服務中顯示明顯公告</li>
                  <li>• 在主頁發布修改摘要</li>
                  <li>• 提供修改對比版本</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <h5 className="font-medium text-blue-900">輕微修改</h5>
                <p className="text-sm text-blue-800 mt-2">
                  對於輕微修改（如澄清語言、修正錯字、更新聯繫資訊），我們將：
                </p>
                <ul className="text-sm text-blue-800 space-y-1 mt-2">
                  <li>• 更新條款頁面</li>
                  <li>• 修改「最後更新」日期</li>
                  <li>• 通過應用內通知告知</li>
                  <li>• 在變更日誌中記錄</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">接受修改</h4>
            <p className="text-sm text-gray-600 mt-2">
              修改後的條款將在發布後生效。您有以下選擇：
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">接受修改</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 繼續使用服務</li>
                  <li>• 明確點擊「接受」</li>
                  <li>• 進行任何新的交易</li>
                  <li>• 更新帳戶設定</li>
                </ul>
              </div>
              <div className="border border-gray-200 p-3 rounded-md">
                <h5 className="font-medium">拒絕修改</h5>
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  <li>• 停止使用服務</li>
                  <li>• 刪除您的帳戶</li>
                  <li>• 要求退還未使用費用</li>
                  <li>• 導出您的資料</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium">版本控制</h4>
            <p className="text-sm text-gray-600 mt-2">
              我們維護條款的版本歷史：
            </p>
            <ul className="text-sm text-gray-600 ml-4 space-y-1 mt-2">
              <li>• 每個版本都有唯一的版本號</li>
              <li>• 保留過去3年的所有版本</li>
              <li>• 提供版本間的對比檢視</li>
              <li>• 在法律檔案中記錄重大變更</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <h4 className="font-medium text-yellow-900">重要提醒</h4>
            <p className="text-sm text-yellow-800 mt-2">
              建議您定期查看這些條款，特別是在我們發送更新通知時。
              繼續使用服務表示您接受所有修改。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: '聯繫資訊',
      content: (
        <div className="space-y-4">
          <p>如果您對這些服務條款有任何疑問，請通過以下方式聯繫我們：</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h5 className="font-medium text-blue-900">一般查詢</h5>
              <div className="space-y-2 mt-2 text-sm text-blue-800">
                <p><strong>電子郵件：</strong> support@photomigration.com</p>
                <p><strong>電話：</strong> +886-2-1234-5678</p>
                <p><strong>服務時間：</strong> 週一至週五 9:00-18:00 (GMT+8)</p>
                <p><strong>語言：</strong> 中文、英文</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-md">
              <h5 className="font-medium text-green-900">法律事務</h5>
              <div className="space-y-2 mt-2 text-sm text-green-800">
                <p><strong>電子郵件：</strong> legal@photomigration.com</p>
                <p><strong>電話：</strong> +886-2-1234-5679</p>
                <p><strong>傳真：</strong> +886-2-1234-5680</p>
                <p><strong>回應時間：</strong> 5個工作日內</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-md">
              <h5 className="font-medium text-purple-900">技術支援</h5>
              <div className="space-y-2 mt-2 text-sm text-purple-800">
                <p><strong>電子郵件：</strong> tech@photomigration.com</p>
                <p><strong>在線聊天：</strong> 網站右下角聊天視窗</p>
                <p><strong>知識庫：</strong> help.photomigration.com</p>
                <p><strong>社群論壇：</strong> community.photomigration.com</p>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-md">
              <h5 className="font-medium text-orange-900">公司資訊</h5>
              <div className="space-y-2 mt-2 text-sm text-orange-800">
                <p><strong>公司名稱：</strong> Photo Migration System Co., Ltd.</p>
                <p><strong>註冊地址：</strong> 123 Tech Street, Taipei, Taiwan 10001</p>
                <p><strong>統一編號：</strong> 12345678</p>
                <p><strong>負責人：</strong> 張大明</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="font-medium">郵寄地址</h5>
            <address className="text-sm text-gray-600 mt-2 not-italic">
              Photo Migration System Co., Ltd.<br/>
              法務部門<br/>
              123 Tech Street, 5F<br/>
              Taipei, Taiwan 10001<br/>
              Republic of China
            </address>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              營業時間：週一至週五 9:00-18:00 (GMT+8)
            </p>
            <p className="text-sm text-gray-500">
              我們努力在24小時內回應所有查詢
            </p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">服務條款</h1>
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
            我同意這些條款
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

export default TermsOfService;