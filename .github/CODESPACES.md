# GitHub Codespaces 使用指南

## 🚀 快速開始

### 1. 啟動 Codespace
在 GitHub 倉庫頁面點擊 **Code** → **Codespaces** → **Create codespace on main**

### 2. 自動設定
Codespace 啟動後會自動執行以下設定：
- 安裝 Node.js 18 和相關工具
- 安裝 NPM 依賴
- 配置開發環境
- 設定端口轉發

### 3. 手動設定（如需要）
```bash
# 執行 Codespaces 設定腳本
./codespaces-setup.sh

# 或手動複製環境檔案
cp .env.codespaces .env.local
```

## 📝 環境配置

### 重要環境變數
在 Codespace 中設定以下環境變數：

```bash
# Google OAuth 客戶端 ID（必需）
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Facebook 應用 ID（可選）
VITE_FACEBOOK_APP_ID=your_facebook_app_id

# 其他 API 金鑰
VITE_FLICKR_API_KEY=your_flickr_api_key
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id
VITE_500PX_API_KEY=your_500px_api_key
```

### 設定方式
1. **在 Codespace 中設定**：
   ```bash
   export VITE_GOOGLE_CLIENT_ID="your_client_id"
   ```

2. **在 GitHub Secrets 中設定**：
   - 前往倉庫 Settings → Secrets and variables → Codespaces
   - 新增所需的環境變數

## 🛠️ 開發命令

```bash
# Codespaces 專用開發模式
npm run codespaces:dev

# 建置並預覽
npm run codespaces:build

# 一般開發命令也可使用
npm run dev
npm run build
npm run test
```

## 🌐 訪問應用程式

### 自動生成的 URL
- **前端應用**：`https://YOUR_CODESPACE_NAME-3000.app.github.dev`
- **WebSocket**：`wss://YOUR_CODESPACE_NAME-3001.app.github.dev`

### 端口轉發
Codespace 會自動轉發以下端口：
- **3000**：前端應用程式
- **3001**：WebSocket 服務器（如果有）

## 🔧 常見問題

### Q: 如何查看我的 Codespace URL？
A: 在終端執行：
```bash
echo "前端 URL: https://$CODESPACE_NAME-3000.app.github.dev"
```

### Q: OAuth 重導向設定
A: 在 Google Console 中新增以下重導向 URI：
```
https://YOUR_CODESPACE_NAME-3000.app.github.dev/auth/callback
```

### Q: 無法連接 WebSocket
A: 檢查 WebSocket 服務器是否在端口 3001 運行，並確認 URL 格式正確。

### Q: 環境變數未生效
A: 確保 `.env.local` 檔案存在且格式正確，重新啟動開發服務器。

## 🔒 安全注意事項

1. **不要將 API 金鑰提交到版本控制**
2. **使用 GitHub Secrets 管理敏感資訊**
3. **定期輪換 API 金鑰**
4. **限制 OAuth 應用程式的權限範圍**

## 📚 相關資源

- [GitHub Codespaces 文件](https://docs.github.com/en/codespaces)
- [Vite 配置文件](https://vitejs.dev/config/)
- [Google OAuth 設定](https://developers.google.com/identity/protocols/oauth2)