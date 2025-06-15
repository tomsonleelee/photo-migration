# 認證模組使用指南

本認證模組提供了完整的OAuth 2.0認證解決方案，支援多個社交媒體和照片平台。

## 支援的平台

- **Google Photos** - 使用Google OAuth 2.0
- **Facebook** - 使用Facebook Login API
- **Instagram** - 使用Instagram Basic Display API
- **Flickr** - 使用Flickr OAuth 2.0
- **500px** - 目前API不可用，顯示說明訊息

## 核心組件

### 1. AuthContext
全域認證狀態管理器，提供：
- 多平台認證狀態追蹤
- 安全的token儲存和管理
- 自動token刷新和驗證
- 統一的錯誤處理

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { 
    isAuthenticated, 
    platforms, 
    loading, 
    connectPlatform, 
    disconnectPlatform, 
    logout 
  } = useAuth();
  
  // 使用認證狀態
}
```

### 2. ProtectedRoute
路由保護組件，支援：
- 基本認證檢查
- 特定平台權限要求
- 自動token刷新
- 自定義重定向和載入狀態

```jsx
import ProtectedRoute from '../components/auth/ProtectedRoute';

// 基本保護
<ProtectedRoute>
  <PrivateContent />
</ProtectedRoute>

// 需要特定平台
<ProtectedRoute requirePlatforms={['google', 'facebook']}>
  <PhotoMigrationTool />
</ProtectedRoute>

// 自定義選項
<ProtectedRoute 
  requirePlatforms={['google']}
  redirectTo="/custom-auth"
  autoRefresh={true}
  fallback={<CustomLoader />}
>
  <Content />
</ProtectedRoute>
```

### 3. AuthenticationPanel
統一的認證介面，包含：
- 所有平台的登入按鈕
- 連接狀態顯示
- 錯誤處理和載入狀態
- 響應式設計

```jsx
import AuthenticationPanel from '../components/auth/AuthenticationPanel';

<AuthenticationPanel 
  onAuthSuccess={(authData) => {
    console.log('認證成功:', authData);
  }}
  className="custom-styles"
/>
```

### 4. AuthStatusIndicator
認證狀態指示器，顯示：
- 當前認證狀態
- 已連接的平台數量
- 平台詳細資訊
- 登出和斷開功能

```jsx
import AuthStatusIndicator from '../components/auth/AuthStatusIndicator';

<AuthStatusIndicator 
  showDetails={true}
  onLogout={() => {
    // 處理登出後的邏輯
  }}
/>
```

## 工具函數

### tokenStorage
安全的token儲存管理：
```javascript
import tokenStorage from '../utils/tokenStorage';

// 儲存token
await tokenStorage.setToken('google', 'access_token', 3600);
await tokenStorage.setRefreshToken('google', 'refresh_token');

// 獲取token
const token = await tokenStorage.getToken('google');
const refreshToken = await tokenStorage.getRefreshToken('google');

// 清除token
await tokenStorage.clearToken('google');
await tokenStorage.clearAllTokens();
```

### tokenValidator
Token驗證和刷新：
```javascript
import tokenValidator from '../utils/tokenValidator';

// 驗證token
const isValid = await tokenValidator.validateToken('google', token);

// 確保token有效（自動刷新）
const validToken = await tokenValidator.ensureValidToken('google');

// 批量驗證
const results = await tokenValidator.validateAllTokens();
```

### logoutManager
統一登出管理：
```javascript
import logoutManager from '../utils/logoutManager';

// 單平台登出
await logoutManager.logoutPlatform('google');

// 全平台登出
await logoutManager.logoutAll();

// 檢查登出狀態
const status = await logoutManager.getLogoutStatus();
```

### authFlowManager
認證流程狀態管理：
```javascript
import authFlowManager from '../utils/authFlowManager';

// 監聽狀態變化
const unsubscribe = authFlowManager.addStateListener((state, data) => {
  console.log('認證狀態變更:', state, data);
});

// 開始認證流程
await authFlowManager.startAuthFlow('google', authData);

// 刷新token
await authFlowManager.refreshTokenFlow('google');

// 獲取認證摘要
const summary = await authFlowManager.getAuthSummary();
```

## 安全特性

### 1. 雙重儲存策略
- **生產環境**: HttpOnly cookies（需要後端支援）
- **開發環境**: 加密localStorage作為備選

### 2. Token保護
- 自動過期檢查和清理
- 防重複刷新機制
- CSRF保護（state參數）
- 基本token格式驗證

### 3. 錯誤處理
- 網路錯誤自動重試
- 優雅的降級處理
- 詳細的錯誤日誌
- 用戶友好的錯誤訊息

## 配置要求

### 環境變數
在`.env`檔案中設置：
```
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Facebook App
VITE_FACEBOOK_APP_ID=your_facebook_app_id

# Instagram
VITE_INSTAGRAM_CLIENT_ID=your_instagram_client_id
VITE_INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Flickr
VITE_FLICKR_API_KEY=your_flickr_api_key
VITE_FLICKR_API_SECRET=your_flickr_api_secret
```

### OAuth回調URL設置
確保在各平台的開發者控制台中設置正確的回調URL：
- Google: `http://localhost:5173/auth/google/callback`
- Facebook: `http://localhost:5173/auth/facebook/callback`
- Instagram: `http://localhost:5173/auth/instagram/callback`
- Flickr: `http://localhost:5173/auth/flickr/callback`

## 使用範例

### 完整的認證流程
```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requirePlatforms={['google']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### 自定義認證檢查
```jsx
import { useRequireAuth } from '../components/auth/ProtectedRoute';

function MyComponent() {
  const { 
    isAuthenticated, 
    hasRequiredPlatforms, 
    connectedPlatforms, 
    missingPlatforms 
  } = useRequireAuth(['google', 'facebook']);

  if (!isAuthenticated) {
    return <div>請先登入</div>;
  }

  if (!hasRequiredPlatforms) {
    return (
      <div>
        需要連接以下平台: {missingPlatforms.join(', ')}
      </div>
    );
  }

  return <div>已認證並連接所需平台</div>;
}
```

## 測試

運行測試套件：
```bash
npm test src/tests/authFlow.test.js
```

測試涵蓋：
- 組件渲染和互動
- 認證流程完整性
- Token管理和刷新
- 錯誤處理和恢復
- 多平台認證場景

## 生產部署注意事項

1. **HTTPS要求**: 所有OAuth流程都需要HTTPS
2. **後端API**: HttpOnly cookies需要後端支援
3. **環境變數**: 確保生產環境中設置了正確的客戶端ID
4. **CORS設置**: 確保API端點允許來自前端域名的請求
5. **安全審查**: 定期檢查和更新依賴項

## 故障排除

### 常見問題

1. **認證失敗**
   - 檢查客戶端ID是否正確
   - 確認回調URL設置
   - 檢查網路連接

2. **Token刷新失敗**
   - 確認refresh token存在
   - 檢查token是否已過期
   - 驗證API端點可用性

3. **路由保護不工作**
   - 確認AuthProvider包裝了應用
   - 檢查ProtectedRoute配置
   - 驗證認證狀態

### 調試技巧

啟用詳細日誌：
```javascript
// 在開發環境中啟用
localStorage.setItem('auth_debug', 'true');
```

檢查認證狀態：
```javascript
// 在瀏覽器控制台中
console.log(await authFlowManager.getAuthSummary());
``` 