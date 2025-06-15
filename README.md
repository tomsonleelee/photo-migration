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

### 在Replit部署

1. 前往 [Replit](https://replit.com)
2. 點擊 "Import from GitHub"
3. 輸入此repository的URL
4. 等待自動部署完成

### 本地開發

```bash
# 克隆項目
git clone https://github.com/yourusername/photo-migration-system.git
cd photo-migration-system

# 安裝依賴
npm install

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
│   ├── steps/                      # 各步驟組件
│   └── common/                     # 共用組件
├── hooks/                          # 自定義Hooks
├── services/                       # API服務層
├── utils/                          # 工具函數
└── styles/                         # 樣式文件
```

## 🔧 環境配置

創建 `.env` 文件並添加以下配置：

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_API_BASE_URL=your_api_base_url
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

---

**注意**: 本系統目前處於開發階段，請勿在生產環境中使用。使用前請仔細閱讀各社群平台的使用條款。
