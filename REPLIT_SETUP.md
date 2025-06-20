# Replit 部署指南

本文件提供在 Replit 環境中設定和運行 Photo Migration System 的詳細指南。

## 🚀 快速部署

### 第一步：導入專案

1. 登入 [Replit](https://replit.com/)
2. 點擊 **"Create Repl"**
3. 選擇 **"Import from GitHub"**
4. 輸入 repository URL
5. 選擇 **"Node.js"** 作為語言
6. 點擊 **"Import from GitHub"**

### 第二步：配置 Secrets

在 Replit 的左側邊欄中找到 🔒 **"Secrets"** 標籤，添加以下環境變數：

#### 必需配置
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
```

#### 可選配置
```
VITE_FLICKR_API_KEY=your_flickr_api_key_here
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id_here
VITE_500PX_API_KEY=your_500px_api_key_here
VITE_APP_TITLE=Photo Migration System
VITE_MAX_CONCURRENT_UPLOADS=5
```

### 第三步：獲取 API 金鑰

#### Google Photos API 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用以下 APIs：
   - Photos Library API
   - Google+ API (用於基本用戶資訊)
4. 前往 **"Credentials"** → **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
5. 應用程式類型選擇 **"Web Application"**
6. 在 **"Authorized redirect URIs"** 中添加：
   ```
   https://您的repl名稱.用戶名.repl.co/auth/google/callback
   ```
7. 複製 **Client ID** 到 Replit Secrets 中

#### Facebook API 設定

1. 前往 [Facebook Developers](https://developers.facebook.com/)
2. 點擊 **"My Apps"** → **"Create App"**
3. 選擇 **"Consumer"** 作為應用類型
4. 填寫應用基本資訊
5. 在應用儀表板中找到 **App ID**
6. 前往 **"Facebook Login"** → **"Settings"**
7. 在 **"Valid OAuth Redirect URIs"** 中添加：
   ```
   https://您的repl名稱.用戶名.repl.co/auth/facebook/callback
   ```
8. 複製 **App ID** 到 Replit Secrets 中

### 第四步：運行應用

1. 點擊綠色的 **"Run"** 按鈕
2. 等待依賴安裝完成
3. 應用將在 Webview 中啟動
4. 點擊右上角的 **"Open in new tab"** 以獲得更好的體驗

## 🔧 進階配置

### 自定義域名

如果您有自定義域名：

1. 在 Replit 專案設定中配置自定義域名
2. 更新 Google 和 Facebook 開發者控制台中的重定向 URI
3. 在 Secrets 中添加：
   ```
   VITE_API_BASE_URL=https://yourdomain.com
   ```

### 效能優化

對於更好的效能，您可以：

1. 在 Shell 中運行：
   ```bash
   npm run build
   npm run preview
   ```

2. 或使用預設的 Replit 腳本：
   ```bash
   npm run repl:build
   ```

### 開發模式

如果您想要熱重載功能：

```bash
npm run repl:dev
```

## 🐛 故障排除

### 應用無法啟動

**問題**: 點擊 Run 後應用顯示錯誤

**解決方案**:
1. 檢查 Console 中的錯誤訊息
2. 確認所有必需的 Secrets 都已設定
3. 嘗試清除快取：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 環境變數未讀取

**問題**: 應用無法讀取環境變數

**解決方案**:
1. 確認變數名稱以 `VITE_` 開頭
2. 重新啟動 Repl
3. 檢查 Secrets 標籤中的變數是否正確

### OAuth 重定向錯誤

**問題**: 登入時出現重定向錯誤

**解決方案**:
1. 檢查 Google/Facebook 控制台中的重定向 URI 是否正確
2. 確認 URI 格式：
   ```
   https://repl名稱.用戶名.repl.co/auth/平台名稱/callback
   ```
3. 確認 API 金鑰是否有效

### 依賴安裝失敗

**問題**: npm install 失敗

**解決方案**:
```bash
# 清除 npm 快取
npm cache clean --force

# 強制重新安裝
npm install --force

# 如果仍然失敗，嘗試使用 yarn
npm install -g yarn
yarn install
```

### 端口衝突

**問題**: 端口被占用

**解決方案**:
1. Replit 會自動處理端口分配
2. 如果手動指定端口，請使用：
   ```bash
   npm run dev -- --port $PORT
   ```

### 記憶體不足

**問題**: 構建時記憶體不足

**解決方案**:
1. 升級到 Replit Hacker 計劃以獲得更多資源
2. 或者使用生產模式：
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

## 📋 檢查清單

在部署前，請確認以下項目：

- [ ] 已設定 `VITE_GOOGLE_CLIENT_ID`
- [ ] 已設定 `VITE_FACEBOOK_APP_ID`
- [ ] Google OAuth 重定向 URI 已配置
- [ ] Facebook OAuth 重定向 URI 已配置
- [ ] 所有依賴都已安裝
- [ ] 應用可以正常啟動
- [ ] 可以訪問主頁面
- [ ] OAuth 登入功能正常

## 🔍 除錯技巧

### 查看應用程式日誌

在 Replit Console 中查看即時日誌：

```bash
# 查看開發服務器日誌
npm run dev

# 查看構建日誌
npm run build

# 查看生產服務器日誌
npm run preview
```

### 檢查網路連接

```bash
# 測試外部 API 連接
curl -I https://www.googleapis.com/
curl -I https://graph.facebook.com/
```

### 驗證環境變數

```bash
# 在 Shell 中檢查環境變數
echo $VITE_GOOGLE_CLIENT_ID
echo $VITE_FACEBOOK_APP_ID
```

## 📞 支援

如果遇到問題：

1. 檢查本文件的故障排除章節
2. 查看 [專案 README](./README.md)
3. 在 GitHub 上創建 Issue
4. 聯繫專案維護者

## 🔄 更新專案

當 GitHub repository 有更新時：

1. 在 Replit 中點擊 **"Version Control"**
2. 點擊 **"Pull from GitHub"**
3. 重新安裝依賴（如有需要）：
   ```bash
   npm install
   ```
4. 重新啟動應用

---

**提示**: 為了獲得最佳體驗，建議升級到 Replit Hacker 計劃，這樣可以獲得更多計算資源和更快的載入速度。 