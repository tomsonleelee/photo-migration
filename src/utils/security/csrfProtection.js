// CSRF (Cross-Site Request Forgery) 保護機制
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';
import CryptoJS from 'crypto-js';

class CSRFProtection {
  constructor() {
    this.config = getSecurityConfig().csrf;
    this.tokens = new Map();
    this.sessionToken = null;
    this.isInitialized = false;
  }

  // 初始化 CSRF 保護
  async initialize() {
    if (!this.config.enabled) {
      console.warn('CSRF protection is disabled');
      return false;
    }

    try {
      // 生成會話 CSRF Token
      await this.generateSessionToken();
      
      // 設定全局請求攔截器
      this.setupRequestInterceptor();
      
      // 設定表單自動保護
      this.setupFormProtection();
      
      this.isInitialized = true;
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'CSRFProtection',
          action: 'initialized',
          sessionTokenGenerated: !!this.sessionToken
        },
        RISK_LEVELS.LOW
      );

      return true;
    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'CSRFProtection',
          action: 'initialization_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 生成會話 CSRF Token
  async generateSessionToken() {
    try {
      // 嘗試從服務器獲取 CSRF Token
      const serverToken = await this.fetchServerCSRFToken();
      
      if (serverToken) {
        this.sessionToken = serverToken;
      } else {
        // 生成客戶端 Token（降級方案）
        this.sessionToken = this.generateToken();
      }
      
      // 存儲到安全位置
      this.storeSessionToken(this.sessionToken);
      
      return this.sessionToken;
    } catch (error) {
      // 生成本地 Token 作為後備
      this.sessionToken = this.generateToken();
      this.storeSessionToken(this.sessionToken);
      return this.sessionToken;
    }
  }

  // 從服務器獲取 CSRF Token
  async fetchServerCSRFToken() {
    try {
      const response = await fetch('/api/csrf/token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to fetch CSRF token from server:', error);
      return null;
    }
  }

  // 生成本地 CSRF Token
  generateToken() {
    const timestamp = Date.now().toString();
    const randomBytes = CryptoJS.lib.WordArray.random(this.config.tokenLength || 32);
    const salt = CryptoJS.lib.WordArray.random(this.config.saltLength || 8);
    
    const tokenData = timestamp + '|' + randomBytes.toString() + '|' + salt.toString();
    return CryptoJS.SHA256(tokenData).toString();
  }

  // 存儲會話 Token
  storeSessionToken(token) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('csrf_token', token);
    }
    
    // 也可以存儲在內存中作為後備
    this.tokens.set('session', token);
  }

  // 獲取會話 Token
  getSessionToken() {
    if (this.sessionToken) {
      return this.sessionToken;
    }
    
    // 嘗試從 sessionStorage 恢復
    if (typeof sessionStorage !== 'undefined') {
      const storedToken = sessionStorage.getItem('csrf_token');
      if (storedToken) {
        this.sessionToken = storedToken;
        return storedToken;
      }
    }
    
    // 從內存恢復
    return this.tokens.get('session');
  }

  // 為特定操作生成 Token
  generateOperationToken(operation, context = {}) {
    const baseToken = this.getSessionToken();
    if (!baseToken) {
      throw new Error('Session CSRF token not available');
    }
    
    const operationData = {
      operation,
      timestamp: Date.now(),
      context: this.sanitizeContext(context)
    };
    
    const operationString = JSON.stringify(operationData);
    const operationToken = CryptoJS.HmacSHA256(operationString, baseToken).toString();
    
    // 存儲操作 Token（有時間限制）
    const tokenKey = `${operation}_${operationToken.substring(0, 8)}`;
    this.tokens.set(tokenKey, {
      token: operationToken,
      operation,
      context,
      createdAt: Date.now(),
      used: false
    });
    
    // 5分鐘後自動清理
    setTimeout(() => {
      this.tokens.delete(tokenKey);
    }, 5 * 60 * 1000);
    
    return operationToken;
  }

  // 驗證 CSRF Token
  validateToken(token, operation = null, context = {}) {
    if (!this.config.enabled) {
      return true; // CSRF 保護被禁用
    }
    
    if (!token) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.CSRF_ATTACK,
        {
          reason: 'missing_token',
          operation,
          userAgent: navigator.userAgent
        },
        RISK_LEVELS.HIGH
      );
      return false;
    }
    
    // 驗證會話 Token
    const sessionToken = this.getSessionToken();
    if (token === sessionToken) {
      return true;
    }
    
    // 驗證操作特定 Token
    if (operation) {
      return this.validateOperationToken(token, operation, context);
    }
    
    // Token 不匹配
    logSecurityEvent(
      SECURITY_EVENT_TYPES.CSRF_ATTACK,
      {
        reason: 'invalid_token',
        operation,
        providedToken: token.substring(0, 8) + '...',
        userAgent: navigator.userAgent
      },
      RISK_LEVELS.HIGH
    );
    
    return false;
  }

  // 驗證操作特定 Token
  validateOperationToken(token, operation, context) {
    // 查找匹配的操作 Token
    for (const [key, tokenData] of this.tokens.entries()) {
      if (tokenData.token === token && 
          tokenData.operation === operation && 
          !tokenData.used) {
        
        // 檢查 Token 是否過期（5分鐘）
        const age = Date.now() - tokenData.createdAt;
        if (age > 5 * 60 * 1000) {
          this.tokens.delete(key);
          logSecurityEvent(
            SECURITY_EVENT_TYPES.CSRF_ATTACK,
            {
              reason: 'expired_token',
              operation,
              tokenAge: age
            },
            RISK_LEVELS.MEDIUM
          );
          return false;
        }
        
        // 標記為已使用（防止重放攻擊）
        tokenData.used = true;
        
        return true;
      }
    }
    
    logSecurityEvent(
      SECURITY_EVENT_TYPES.CSRF_ATTACK,
      {
        reason: 'operation_token_not_found',
        operation,
        providedToken: token.substring(0, 8) + '...'
      },
      RISK_LEVELS.HIGH
    );
    
    return false;
  }

  // 設定全局請求攔截器
  setupRequestInterceptor() {
    if (typeof window === 'undefined') return;
    
    // 攔截 fetch 請求
    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
      // 檢查是否需要 CSRF 保護
      if (this.shouldProtectRequest(url, options.method)) {
        options.headers = options.headers || {};
        
        // 添加 CSRF Token 到請求標頭
        const token = this.getSessionToken();
        if (token) {
          options.headers['X-CSRF-Token'] = token;
        }
      }
      
      return originalFetch(url, options);
    };
    
    // 攔截 XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalOpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      if (csrfProtection.shouldProtectRequest(this._url, this._method)) {
        const token = csrfProtection.getSessionToken();
        if (token) {
          this.setRequestHeader('X-CSRF-Token', token);
        }
      }
      
      return originalSend.call(this, data);
    };
  }

  // 設定表單自動保護
  setupFormProtection() {
    if (typeof document === 'undefined') return;
    
    // 監聽表單提交
    document.addEventListener('submit', (event) => {
      const form = event.target;
      
      if (this.shouldProtectForm(form)) {
        // 檢查是否已有 CSRF Token
        let csrfInput = form.querySelector('input[name="_csrf"]');
        
        if (!csrfInput) {
          // 創建隱藏的 CSRF Token 欄位
          csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = '_csrf';
          form.appendChild(csrfInput);
        }
        
        // 設定 Token 值
        const token = this.getSessionToken();
        if (token) {
          csrfInput.value = token;
        } else {
          // 沒有 Token，阻止表單提交
          event.preventDefault();
          console.error('CSRF token not available, form submission blocked');
          
          logSecurityEvent(
            SECURITY_EVENT_TYPES.CSRF_ATTACK,
            {
              reason: 'form_submit_without_token',
              formAction: form.action,
              formMethod: form.method
            },
            RISK_LEVELS.HIGH
          );
        }
      }
    });
    
    // 為現有表單添加 CSRF Token
    this.protectExistingForms();
  }

  // 保護現有表單
  protectExistingForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      if (this.shouldProtectForm(form)) {
        this.addCSRFTokenToForm(form);
      }
    });
  }

  // 為表單添加 CSRF Token
  addCSRFTokenToForm(form) {
    // 檢查是否已有 CSRF Token
    let csrfInput = form.querySelector('input[name="_csrf"]');
    
    if (!csrfInput) {
      csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = '_csrf';
      form.appendChild(csrfInput);
    }
    
    const token = this.getSessionToken();
    if (token) {
      csrfInput.value = token;
    }
  }

  // 檢查請求是否需要 CSRF 保護
  shouldProtectRequest(url, method) {
    if (!this.config.enabled) return false;
    
    // 檢查 HTTP 方法
    const normalizedMethod = (method || 'GET').toUpperCase();
    if (this.config.ignoreMethods.includes(normalizedMethod)) {
      return false;
    }
    
    // 檢查 URL 是否為同源
    if (typeof url === 'string') {
      try {
        const requestUrl = new URL(url, window.location.origin);
        return requestUrl.origin === window.location.origin;
      } catch (error) {
        // 相對 URL，認為是同源
        return !url.startsWith('http');
      }
    }
    
    return true;
  }

  // 檢查表單是否需要 CSRF 保護
  shouldProtectForm(form) {
    if (!this.config.enabled) return false;
    
    const method = (form.method || 'GET').toUpperCase();
    return !this.config.ignoreMethods.includes(method);
  }

  // 清理上下文數據
  sanitizeContext(context) {
    const sanitized = {};
    
    // 只保留安全的上下文資訊
    const safeFields = ['operation', 'component', 'action', 'resourceId'];
    
    for (const field of safeFields) {
      if (context[field]) {
        sanitized[field] = context[field];
      }
    }
    
    return sanitized;
  }

  // 刷新會話 Token
  async refreshSessionToken() {
    const oldToken = this.sessionToken;
    await this.generateSessionToken();
    
    if (oldToken !== this.sessionToken) {
      // 更新所有現有表單
      this.protectExistingForms();
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SESSION_CREATE,
        {
          component: 'CSRFProtection',
          action: 'token_refreshed'
        },
        RISK_LEVELS.LOW
      );
    }
    
    return this.sessionToken;
  }

  // 獲取 CSRF 統計資訊
  getStatistics() {
    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      sessionTokenAvailable: !!this.sessionToken,
      activeOperationTokens: this.tokens.size,
      protectedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'].filter(
        method => !this.config.ignoreMethods.includes(method)
      )
    };
  }

  // 清理過期的操作 Token
  cleanup() {
    const now = Date.now();
    const expiredTokens = [];
    
    for (const [key, tokenData] of this.tokens.entries()) {
      if (key !== 'session' && (now - tokenData.createdAt > 5 * 60 * 1000)) {
        expiredTokens.push(key);
      }
    }
    
    expiredTokens.forEach(key => this.tokens.delete(key));
    
    return expiredTokens.length;
  }
}

// 全局 CSRF 保護實例
export const csrfProtection = new CSRFProtection();

// React Hook 用於 CSRF Token
export const useCSRFToken = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        if (!csrfProtection.isInitialized) {
          await csrfProtection.initialize();
        }
        
        const sessionToken = csrfProtection.getSessionToken();
        setToken(sessionToken);
      } catch (error) {
        console.error('Failed to initialize CSRF protection:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeCSRF();
  }, []);

  const generateOperationToken = useCallback((operation, context) => {
    return csrfProtection.generateOperationToken(operation, context);
  }, []);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    try {
      const newToken = await csrfProtection.refreshSessionToken();
      setToken(newToken);
      return newToken;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    token,
    loading,
    generateOperationToken,
    refreshToken,
    statistics: csrfProtection.getStatistics()
  };
};

// 導出便利函數
export const initializeCSRFProtection = () => csrfProtection.initialize();
export const getCSRFToken = () => csrfProtection.getSessionToken();
export const validateCSRFToken = (token, operation, context) => 
  csrfProtection.validateToken(token, operation, context);
export const generateCSRFOperationToken = (operation, context) => 
  csrfProtection.generateOperationToken(operation, context);

// React 組件用於自動添加 CSRF Token
export const CSRFTokenInput = ({ operation, context }) => {
  const { token, generateOperationToken } = useCSRFToken();
  
  const tokenValue = operation ? 
    generateOperationToken(operation, context) : 
    token;

  if (!tokenValue) {
    return null;
  }

  return (
    <input
      type="hidden"
      name="_csrf"
      value={tokenValue}
    />
  );
};

// 導入 React hooks
import { useState, useEffect, useCallback } from 'react';

export default CSRFProtection;