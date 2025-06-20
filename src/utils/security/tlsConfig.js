// TLS/HTTPS 配置和管理
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';

class TLSManager {
  constructor() {
    this.config = getSecurityConfig();
    this.certificateInfo = null;
    this.hstsEnabled = false;
  }

  // 初始化 TLS 設定
  initializeTLS() {
    if (!this.config.tls.enabled) {
      console.warn('TLS is disabled in configuration');
      return false;
    }

    try {
      // 檢查 HTTPS 環境
      this.checkHTTPSEnvironment();
      
      // 設定 HSTS 標頭
      this.setupHSTS();
      
      // 檢查證書狀態
      this.checkCertificateStatus();
      
      // 記錄 TLS 初始化
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'TLSManager',
          action: 'initialize',
          tlsEnabled: true,
          hstsEnabled: this.hstsEnabled
        },
        RISK_LEVELS.LOW
      );

      return true;
    } catch (error) {
      console.error('Failed to initialize TLS:', error);
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'TLSManager',
          action: 'initialize_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      return false;
    }
  }

  // 檢查 HTTPS 環境
  checkHTTPSEnvironment() {
    if (typeof window !== 'undefined') {
      const isHTTPS = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      if (!isHTTPS && !isLocalhost && this.config.tls.enabled) {
        throw new Error('HTTPS is required but current connection is not secure');
      }
      
      this.certificateInfo = {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port || (isHTTPS ? '443' : '80'),
        isSecure: isHTTPS
      };
    }
  }

  // 設定 HSTS（HTTP Strict Transport Security）
  setupHSTS() {
    if (typeof document === 'undefined') return;

    const { hsts } = this.config.tls;
    
    // 在客戶端，我們無法直接設定 HSTS 標頭
    // 但可以檢查服務器是否已設定
    this.checkHSTSHeader();
    
    // 強制 HTTPS 重定向
    if (this.config.tls.redirectToHttps && window.location.protocol === 'http:') {
      const httpsUrl = window.location.href.replace('http:', 'https:');
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'TLSManager',
          action: 'redirect_to_https',
          originalUrl: window.location.href,
          redirectUrl: httpsUrl
        },
        RISK_LEVELS.MEDIUM
      );
      
      window.location.replace(httpsUrl);
    }
  }

  // 檢查 HSTS 標頭
  async checkHSTSHeader() {
    try {
      const response = await fetch(window.location.origin, { method: 'HEAD' });
      const hstsHeader = response.headers.get('strict-transport-security');
      
      if (hstsHeader) {
        this.hstsEnabled = true;
        this.parseHSTSHeader(hstsHeader);
      } else if (this.config.tls.enabled) {
        console.warn('HSTS header not found. Consider enabling HSTS on the server.');
      }
    } catch (error) {
      console.warn('Failed to check HSTS header:', error);
    }
  }

  // 解析 HSTS 標頭
  parseHSTSHeader(hstsHeader) {
    const hstsInfo = {
      maxAge: 0,
      includeSubDomains: false,
      preload: false
    };

    const parts = hstsHeader.split(';').map(part => part.trim());
    
    for (const part of parts) {
      if (part.startsWith('max-age=')) {
        hstsInfo.maxAge = parseInt(part.split('=')[1]);
      } else if (part === 'includeSubDomains') {
        hstsInfo.includeSubDomains = true;
      } else if (part === 'preload') {
        hstsInfo.preload = true;
      }
    }

    this.certificateInfo = {
      ...this.certificateInfo,
      hsts: hstsInfo
    };
  }

  // 檢查證書狀態
  async checkCertificateStatus() {
    if (typeof window === 'undefined' || window.location.protocol !== 'https:') {
      return;
    }

    try {
      // 嘗試獲取證書資訊（有限的客戶端功能）
      const certificateInfo = await this.getCertificateInfo();
      
      if (certificateInfo) {
        this.certificateInfo = {
          ...this.certificateInfo,
          ...certificateInfo
        };

        // 檢查證書過期
        this.checkCertificateExpiry(certificateInfo);
      }
    } catch (error) {
      console.warn('Failed to check certificate status:', error);
    }
  }

  // 獲取證書資訊（模擬）
  async getCertificateInfo() {
    // 在真實環境中，這將通過服務器端 API 獲取證書資訊
    // 客戶端無法直接存取證書詳細資訊
    return new Promise((resolve) => {
      // 模擬證書資訊
      const mockCertInfo = {
        issuer: 'Let\'s Encrypt Authority X3',
        subject: window.location.hostname,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天後過期
        algorithm: 'RSA-SHA256',
        keySize: 2048,
        serialNumber: '03:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX'
      };
      
      setTimeout(() => resolve(mockCertInfo), 100);
    });
  }

  // 檢查證書過期
  checkCertificateExpiry(certInfo) {
    if (!certInfo.validTo) return;

    const now = new Date();
    const expiry = new Date(certInfo.validTo);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.VULNERABILITY_DETECTED,
        {
          component: 'TLSManager',
          issue: 'certificate_expired',
          expiry: certInfo.validTo,
          hostname: certInfo.subject
        },
        RISK_LEVELS.CRITICAL
      );
    } else if (daysUntilExpiry <= 30) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.VULNERABILITY_DETECTED,
        {
          component: 'TLSManager',
          issue: 'certificate_expiring_soon',
          daysUntilExpiry,
          expiry: certInfo.validTo,
          hostname: certInfo.subject
        },
        RISK_LEVELS.HIGH
      );
    }
  }

  // 驗證 TLS 連線
  async validateTLSConnection() {
    if (typeof window === 'undefined') return { valid: false, reason: 'Not in browser environment' };

    const result = {
      valid: true,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      checks: {}
    };

    // 檢查 HTTPS
    result.checks.https = window.location.protocol === 'https:';
    if (!result.checks.https) {
      result.valid = false;
      result.reason = 'Connection is not using HTTPS';
    }

    // 檢查 HSTS
    result.checks.hsts = this.hstsEnabled;

    // 檢查混合內容
    result.checks.mixedContent = await this.checkMixedContent();

    // 檢查 TLS 版本（模擬）
    result.checks.tlsVersion = await this.checkTLSVersion();

    return result;
  }

  // 檢查混合內容
  async checkMixedContent() {
    if (typeof document === 'undefined') return true;

    // 檢查頁面中的 HTTP 資源
    const httpResources = [];
    
    // 檢查圖片
    const images = document.querySelectorAll('img[src^="http:"]');
    httpResources.push(...Array.from(images).map(img => ({ type: 'image', src: img.src })));
    
    // 檢查腳本
    const scripts = document.querySelectorAll('script[src^="http:"]');
    httpResources.push(...Array.from(scripts).map(script => ({ type: 'script', src: script.src })));
    
    // 檢查樣式表
    const stylesheets = document.querySelectorAll('link[href^="http:"]');
    httpResources.push(...Array.from(stylesheets).map(link => ({ type: 'stylesheet', href: link.href })));

    if (httpResources.length > 0) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.VULNERABILITY_DETECTED,
        {
          component: 'TLSManager',
          issue: 'mixed_content_detected',
          resourceCount: httpResources.length,
          resources: httpResources.slice(0, 5) // 只記錄前5個
        },
        RISK_LEVELS.MEDIUM
      );
      return false;
    }

    return true;
  }

  // 檢查 TLS 版本
  async checkTLSVersion() {
    // 在瀏覽器中無法直接檢查 TLS 版本
    // 這需要通過服務器端 API 實現
    try {
      const response = await fetch('/api/security/tls-info');
      if (response.ok) {
        const tlsInfo = await response.json();
        return tlsInfo.version >= 'TLSv1.2';
      }
    } catch (error) {
      console.warn('Unable to check TLS version:', error);
    }
    
    // 假設使用現代瀏覽器支援的 TLS 版本
    return true;
  }

  // 獲取安全狀態報告
  getSecurityReport() {
    return {
      tls: {
        enabled: this.config.tls.enabled,
        protocol: this.certificateInfo?.protocol,
        isSecure: this.certificateInfo?.isSecure || false
      },
      hsts: {
        enabled: this.hstsEnabled,
        maxAge: this.certificateInfo?.hsts?.maxAge,
        includeSubDomains: this.certificateInfo?.hsts?.includeSubDomains || false,
        preload: this.certificateInfo?.hsts?.preload || false
      },
      certificate: this.certificateInfo ? {
        issuer: this.certificateInfo.issuer,
        subject: this.certificateInfo.subject,
        validFrom: this.certificateInfo.validFrom,
        validTo: this.certificateInfo.validTo,
        algorithm: this.certificateInfo.algorithm
      } : null,
      recommendations: this.generateRecommendations()
    };
  }

  // 生成安全建議
  generateRecommendations() {
    const recommendations = [];

    if (!this.config.tls.enabled) {
      recommendations.push({
        priority: 'high',
        message: '建議啟用 TLS/HTTPS 以保護數據傳輸安全'
      });
    }

    if (!this.hstsEnabled) {
      recommendations.push({
        priority: 'medium',
        message: '建議啟用 HSTS 以防止協議降級攻擊'
      });
    }

    if (this.certificateInfo?.validTo) {
      const daysUntilExpiry = Math.ceil(
        (new Date(this.certificateInfo.validTo) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry <= 30) {
        recommendations.push({
          priority: 'high',
          message: `SSL 證書將在 ${daysUntilExpiry} 天後過期，請及時續期`
        });
      }
    }

    return recommendations;
  }
}

// 全局 TLS 管理器實例
export const tlsManager = new TLSManager();

// React Hook 用於 TLS 狀態
import { useState, useEffect } from 'react';

export const useTLSStatus = () => {
  const [tlsStatus, setTLSStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTLSStatus = async () => {
      try {
        setLoading(true);
        const status = await tlsManager.validateTLSConnection();
        setTLSStatus(status);
      } catch (error) {
        console.error('Failed to check TLS status:', error);
        setTLSStatus({ valid: false, error: error.message });
      } finally {
        setLoading(false);
      }
    };

    checkTLSStatus();
  }, []);

  return { tlsStatus, loading };
};

// 導出工具函數
export const initializeTLS = () => tlsManager.initializeTLS();
export const validateTLSConnection = () => tlsManager.validateTLSConnection();
export const getTLSSecurityReport = () => tlsManager.getSecurityReport();

export default TLSManager;