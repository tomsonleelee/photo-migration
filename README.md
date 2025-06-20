# Photo Migration System

一個全面的相簿遷移系統，支援從多個社群平台（Facebook、Instagram、Flickr等）遷移照片到Google Photos。

## ✨ 功能特色

- 🔗 **多平台支援**: Facebook、Instagram、Flickr、500px
- 📸 **智能抓取**: 支援個人、朋友、公開相簿
- 🔒 **隱私保護**: 嚴格的權限檢查和隱私設定
- 📊 **即時監控**: 詳細的遷移進度追蹤
- ⚡ **批量處理**: 同時處理多個相簿
- 🎨 **現代化UI**: 響應式設計，支援各種裝置

## 🚀 快速開始

### 在 Replit 部署 (推薦)

1. **導入專案**
   - 前往 [Replit](https://replit.com)
   - 點擊 "Create Repl" → "Import from GitHub"
   - 輸入此 repository 的 URL: `https://github.com/yourusername/photo-migration-system`
   - 選擇 "Node.js" 作為語言

2. **配置環境變數**
   - 在 Replit 中點擊左側的 "Secrets" (🔒) 標籤
   - 添加以下環境變數：
     ```
     VITE_GOOGLE_CLIENT_ID=你的Google客戶端ID
     VITE_FACEBOOK_APP_ID=你的Facebook應用ID
     VITE_API_BASE_URL=https://你的repl名稱.用戶名.repl.co
     ```

3. **獲取 API 金鑰**
   
   **Google Photos API:**
   - 前往 [Google Cloud Console](https://console.cloud.google.com/)
   - 創建新專案或選擇現有專案
   - 啟用 "Photos Library API"
   - 創建 OAuth 2.0 客戶端 ID
   - 將 Replit URL 添加到授權重定向 URI

   **Facebook API:**
   - 前往 [Facebook Developers](https://developers.facebook.com/)
   - 創建新應用
   - 獲取應用 ID 和應用密鑰
   - 配置 OAuth 重定向 URL

4. **運行應用**
   - 點擊綠色的 "Run" 按鈕
   - 系統會自動安裝依賴並啟動開發服務器
   - 在 Webview 中查看應用

### Replit 特定配置

專案已針對 Replit 環境進行優化：

- ✅ **自動依賴安裝**: 首次運行時自動安裝 npm 包
- ✅ **環境變數管理**: 整合 Replit Secrets 系統
- ✅ **端口自動配置**: 自動使用 Replit 分配的端口
- ✅ **熱重載支援**: 代碼更改時自動刷新
- ✅ **構建優化**: 針對雲端環境的構建配置

### 本地開發

```bash
# 克隆項目
git clone https://github.com/yourusername/photo-migration-system.git
cd photo-migration-system

# 安裝依賴
npm install

# 複製環境變數範例
cp env.example .env

# 編輯 .env 文件，添加您的 API 金鑰
# VITE_GOOGLE_CLIENT_ID=your_google_client_id
# VITE_FACEBOOK_APP_ID=your_facebook_app_id

# 啟動開發服務器
npm run dev
```

### 使用Docker

```bash
# 構建鏡像
docker build -t photo-migration-system .

# 運行容器
docker run -p 3000:3000 photo-migration-system
```

## 📁 項目結構

```
src/
├── components/
│   ├── PhotoMigrationSystem.jsx    # 主要組件
│   ├── auth/                      # 認證相關組件
│   ├── album/                     # 相簿管理組件
│   ├── migration/                 # 遷移配置組件
│   ├── progress/                  # 進度追蹤組件
│   ├── ui/                        # UI 組件庫
│   └── common/                    # 共用組件
├── services/                      # API 服務層
│   ├── api/                       # API 適配器
│   ├── fileProcessing/            # 檔案處理服務
│   └── errors/                    # 錯誤處理
├── hooks/                         # 自定義 Hooks
├── contexts/                      # React Contexts
├── utils/                         # 工具函數
└── styles/                        # 樣式文件
```

## 🔧 環境配置

### 必需的環境變數

```env
# Google OAuth 配置 (必需)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Facebook 應用配置 (必需)
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here

# API 基礎 URL (Replit 中自動設定)
VITE_API_BASE_URL=https://your-repl-name.username.repl.co
```

### 可選的環境變數

```env
# 其他平台 API 金鑰
VITE_FLICKR_API_KEY=your_flickr_api_key_here
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id_here
VITE_500PX_API_KEY=your_500px_api_key_here

# 應用配置
VITE_APP_TITLE="Photo Migration System"
VITE_MAX_CONCURRENT_UPLOADS=5
VITE_CHUNK_SIZE=1024
```

## 📋 使用說明

### 1. 平台連接
- 連接您的Google Photos帳戶（必須）
- 連接要遷移的社群平台帳戶

### 2. 選擇相簿範圍
- **個人相簿**: 您自己的相簿
- **朋友相簿**: 好友/追蹤對象的相簿
- **公開相簿**: 公開可見的相簿

### 3. 搜尋和選擇
- 瀏覽或搜尋目標用戶
- 選擇要遷移的相簿

### 4. 配置設定
- 選擇圖片品質
- 設定重複檔案處理方式
- 調整並發處理數量

### 5. 執行遷移
- 即時監控遷移進度
- 查看詳細的處理日誌

## 🛡️ 隱私與安全

本系統嚴格遵守以下原則：

- ✅ 僅存取用戶授權的內容
- ✅ 遵守各平台使用條款
- ✅ 實施端到端加密
- ✅ 定期清理暫存資料
- ✅ GDPR/CCPA合規設計

## 🔄 支援的平台

| 平台 | 個人相簿 | 朋友相簿 | 公開相簿 | 狀態 |
|------|----------|----------|----------|------|
| Facebook | ✅ | ✅ | ✅ | 開發中 |
| Instagram | ✅ | ✅ | ✅ | 開發中 |
| Flickr | ✅ | ✅ | ✅ | 計劃中 |
| 500px | ✅ | ❌ | ✅ | 計劃中 |

## 🚧 開發路線圖

### Phase 1: 基礎功能 (進行中)
- [x] UI/UX設計
- [x] 基礎組件開發
- [x] Replit 環境配置
- [ ] 平台認證整合
- [ ] 基礎爬蟲功能

### Phase 2: 核心功能 (計劃中)
- [ ] Google Photos API整合
- [ ] 圖片處理管線
- [ ] 進度監控系統
- [ ] 錯誤處理機制

### Phase 3: 進階功能 (計劃中)
- [ ] 定期同步功能
- [ ] 批量操作優化
- [ ] 多語言支援
- [ ] 行動端App

## 🤝 貢獻指南

我們歡迎各種形式的貢獻！

1. Fork此項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟Pull Request

## 📄 授權條款

本項目採用MIT授權條款 - 詳見 [LICENSE](LICENSE) 文件

## 🐛 問題回報

如果發現錯誤或有功能建議，請：

1. 檢查 [Issues](https://github.com/yourusername/photo-migration-system/issues) 頁面
2. 如果問題尚未被回報，請創建新的Issue
3. 提供詳細的錯誤信息和重現步驟

## 📞 聯繫方式

- 項目維護者: [Your Name](mailto:your.email@example.com)
- 項目網站: [https://your-website.com](https://your-website.com)
- 文檔: [https://docs.your-website.com](https://docs.your-website.com)

## 🙏 致謝

感謝所有為此項目做出貢獻的開發者和測試者！

特別感謝：
- [Lucide React](https://lucide.dev/) - 提供優美的圖標
- [Tailwind CSS](https://tailwindcss.com/) - 現代化的CSS框架
- [Vite](https://vitejs.dev/) - 快速的構建工具
- [Replit](https://replit.com/) - 提供優秀的雲端開發環境

---

**注意**: 本系統目前處於開發階段，請勿在生產環境中使用。使用前請仔細閱讀各社群平台的使用條款。

## 🔧 Replit 故障排除

### 常見問題

**Q: 應用無法啟動？**
A: 檢查 Secrets 中是否正確設定了必需的環境變數，特別是 `VITE_GOOGLE_CLIENT_ID`。

**Q: OAuth 重定向失敗？**
A: 確保在 Google/Facebook 開發者控制台中添加了正確的 Replit URL 作為授權重定向 URI。

**Q: 依賴安裝失敗？**
A: 嘗試在 Shell 中運行 `npm install --force` 來強制重新安裝依賴。

**Q: 熱重載不工作？**
A: 重新啟動 Repl 或在 Shell 中運行 `npm run repl:dev`。
