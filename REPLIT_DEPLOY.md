# 🚀 Replit 快速部署指南

這個專案已經完全配置好可以在 Replit 環境中運行！

## ✅ 已配置的 Replit 文件

- ✅ `.replit` - 主要配置文件
- ✅ `replit.nix` - 系統依賴配置
- ✅ `replit-run.sh` - 自動運行腳本
- ✅ `replit-health-check.js` - 健康檢查工具
- ✅ `REPLIT_SETUP.md` - 詳細設定指南
- ✅ `env.example` - 環境變數範例

## 🎯 一鍵部署步驟

### 1. 導入到 Replit
1. 在 [Replit](https://replit.com/) 上點擊 **"Create Repl"**
2. 選擇 **"Import from GitHub"**
3. 輸入這個 repository 的 URL
4. 選擇 **"Node.js"** 語言
5. 點擊 **"Import from GitHub"**

### 2. 配置環境變數（Secrets）
在 Replit 的 🔒 **"Secrets"** 標籤中添加：

**必需變數：**
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
```

**可選變數：**
```
VITE_FLICKR_API_KEY=your_flickr_api_key
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id
VITE_500PX_API_KEY=your_500px_api_key
```

### 3. 運行應用
點擊綠色的 **"Run"** 按鈕，系統將：
- 🔍 自動檢查依賴
- 📦 安裝必要的套件
- ⚙️ 設定環境
- 🌟 啟動開發服務器

## 🛠️ 有用的 npm 腳本

```bash
# 運行健康檢查
npm run repl:health

# 重新設定專案
npm run repl:setup

# 清理並重新安裝依賴
npm run repl:clean

# 重啟應用
npm run repl:restart

# 生產模式構建
npm run repl:build
```

## 🔧 故障排除

### 應用無法啟動
```bash
npm run repl:health  # 診斷問題
npm run repl:clean   # 清理依賴
```

### 端口衝突
```bash
npm run repl:restart  # 清理並重啟
```

### 依賴問題
```bash
npm run repl:setup   # 重新設定
```

## 📱 OAuth 回調 URL 設定

### Google OAuth
在 [Google Cloud Console](https://console.cloud.google.com/) 中設定：
```
https://你的repl名稱.你的用戶名.repl.co/auth/google/callback
```

### Facebook OAuth
在 [Facebook Developers](https://developers.facebook.com/) 中設定：
```
https://你的repl名稱.你的用戶名.repl.co/auth/facebook/callback
```

## 🌟 特色功能

✅ **自動依賴管理** - 智慧安裝和檢查  
✅ **健康檢查** - 詳細的系統診斷  
✅ **錯誤處理** - 自動清理和重啟  
✅ **端口管理** - 動態端口配置  
✅ **環境檢測** - Replit 專屬優化  

## 📞 需要幫助？

1. 運行 `npm run repl:health` 診斷問題
2. 查看詳細指南：[REPLIT_SETUP.md](./REPLIT_SETUP.md)
3. 檢查 Console 中的錯誤訊息
4. 在 GitHub 上創建 Issue

---

**提示**: 第一次運行可能需要較長時間來安裝依賴，請耐心等待！ 🚀