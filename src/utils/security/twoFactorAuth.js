// 雙因子認證 (2FA) 系統
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';
import { secureTokenStorage } from './secureTokenStorage.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

// 2FA 方法類型
export const TFA_METHODS = {
  TOTP: 'totp',        // 時間性一次性密碼 (Google Authenticator, Authy)
  SMS: 'sms',          // 簡訊驗證碼
  EMAIL: 'email',      // 電子郵件驗證碼
  BACKUP_CODES: 'backup_codes'  // 備用代碼
};

// 2FA 狀態
export const TFA_STATUS = {
  DISABLED: 'disabled',
  ENABLED: 'enabled',
  PENDING_SETUP: 'pending_setup',
  PENDING_VERIFICATION: 'pending_verification'
};

class TwoFactorAuthManager {
  constructor() {
    this.config = getSecurityConfig().twoFactor;
    this.userSecrets = new Map();
    this.pendingSetups = new Map();
    this.backupCodes = new Map();
    this.verificationAttempts = new Map();
  }

  // 為用戶啟用 2FA
  async enableTwoFactor(userId, method = TFA_METHODS.TOTP, userInfo = {}) {
    try {
      if (!this.config.enabled) {
        throw new Error('Two-factor authentication is disabled');
      }

      // 檢查用戶是否已啟用 2FA
      const existingConfig = await this.getUserTFAConfig(userId);
      if (existingConfig && existingConfig.status === TFA_STATUS.ENABLED) {
        throw new Error('Two-factor authentication is already enabled');
      }

      let setupData;

      switch (method) {
        case TFA_METHODS.TOTP:
          setupData = await this.setupTOTP(userId, userInfo);
          break;
        case TFA_METHODS.SMS:
          setupData = await this.setupSMS(userId, userInfo.phoneNumber);
          break;
        case TFA_METHODS.EMAIL:
          setupData = await this.setupEmail(userId, userInfo.email);
          break;
        default:
          throw new Error(`Unsupported 2FA method: ${method}`);
      }

      // 生成備用代碼
      const backupCodes = this.generateBackupCodes(userId);
      setupData.backupCodes = backupCodes;

      // 存儲臨時設定（等待驗證）
      this.pendingSetups.set(userId, {
        method,
        setupData,
        createdAt: Date.now(),
        verified: false
      });

      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_SETUP_INITIATED,
        {
          userId,
          method,
          userAgent: userInfo.userAgent
        },
        RISK_LEVELS.LOW
      );

      return {
        method,
        setupData: this.sanitizeSetupData(setupData),
        backupCodes: setupData.backupCodes,
        qrCode: setupData.qrCode
      };

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_SETUP_FAILED,
        {
          userId,
          method,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 設定 TOTP (Time-based One-Time Password)
  async setupTOTP(userId, userInfo) {
    const secret = speakeasy.generateSecret({
      name: `${this.config.appName || 'PhotoMigration'} (${userInfo.email || userId})`,
      issuer: this.config.issuer || 'PhotoMigration',
      length: this.config.secretLength || 32
    });

    // 生成 QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauth_url: secret.otpauth_url,
      manual_entry_key: secret.base32
    };
  }

  // 設定 SMS 2FA
  async setupSMS(userId, phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required for SMS 2FA');
    }

    // 驗證電話號碼格式
    if (!this.validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // 生成驗證碼並發送
    const verificationCode = this.generateVerificationCode();
    await this.sendSMSVerification(phoneNumber, verificationCode);

    return {
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      verificationCode, // 僅用於測試環境
      expiresAt: Date.now() + (5 * 60 * 1000) // 5分鐘後過期
    };
  }

  // 設定電子郵件 2FA
  async setupEmail(userId, email) {
    if (!email) {
      throw new Error('Email address is required for Email 2FA');
    }

    // 驗證電子郵件格式
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email address format');
    }

    // 生成驗證碼並發送
    const verificationCode = this.generateVerificationCode();
    await this.sendEmailVerification(email, verificationCode);

    return {
      email: this.maskEmail(email),
      verificationCode, // 僅用於測試環境
      expiresAt: Date.now() + (10 * 60 * 1000) // 10分鐘後過期
    };
  }

  // 驗證 2FA 設定
  async verifyTwoFactorSetup(userId, verificationCode, method = null) {
    try {
      const pendingSetup = this.pendingSetups.get(userId);
      if (!pendingSetup) {
        throw new Error('No pending 2FA setup found');
      }

      // 檢查設定是否過期
      const age = Date.now() - pendingSetup.createdAt;
      if (age > 30 * 60 * 1000) { // 30分鐘
        this.pendingSetups.delete(userId);
        throw new Error('2FA setup has expired, please start over');
      }

      let isValid = false;

      switch (pendingSetup.method) {
        case TFA_METHODS.TOTP:
          isValid = this.verifyTOTP(pendingSetup.setupData.secret, verificationCode);
          break;
        case TFA_METHODS.SMS:
        case TFA_METHODS.EMAIL:
          isValid = (pendingSetup.setupData.verificationCode === verificationCode) &&
                   (Date.now() < pendingSetup.setupData.expiresAt);
          break;
      }

      if (!isValid) {
        this.recordFailedVerification(userId, pendingSetup.method);
        throw new Error('Invalid verification code');
      }

      // 啟用 2FA
      await this.completeTwoFactorSetup(userId, pendingSetup);

      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_ENABLED,
        {
          userId,
          method: pendingSetup.method
        },
        RISK_LEVELS.LOW
      );

      return {
        success: true,
        method: pendingSetup.method,
        backupCodes: pendingSetup.setupData.backupCodes
      };

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_VERIFICATION_FAILED,
        {
          userId,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 完成 2FA 設定
  async completeTwoFactorSetup(userId, pendingSetup) {
    const tfaConfig = {
      status: TFA_STATUS.ENABLED,
      method: pendingSetup.method,
      enabledAt: new Date().toISOString(),
      secret: pendingSetup.setupData.secret,
      phoneNumber: pendingSetup.setupData.phoneNumber,
      email: pendingSetup.setupData.email
    };

    // 加密存儲 2FA 配置
    await this.storeTFAConfig(userId, tfaConfig);

    // 存儲備用代碼
    await this.storeBackupCodes(userId, pendingSetup.setupData.backupCodes);

    // 清除臨時設定
    this.pendingSetups.delete(userId);
  }

  // 驗證 2FA 代碼
  async verifyTwoFactor(userId, code, method = null) {
    try {
      const tfaConfig = await this.getUserTFAConfig(userId);
      if (!tfaConfig || tfaConfig.status !== TFA_STATUS.ENABLED) {
        throw new Error('Two-factor authentication is not enabled');
      }

      // 檢查失敗嘗試次數
      this.checkVerificationAttempts(userId);

      let isValid = false;
      let usedMethod = method || tfaConfig.method;

      switch (usedMethod) {
        case TFA_METHODS.TOTP:
          isValid = this.verifyTOTP(tfaConfig.secret, code);
          break;
        case TFA_METHODS.BACKUP_CODES:
          isValid = await this.verifyBackupCode(userId, code);
          break;
        default:
          throw new Error(`Verification method ${usedMethod} not supported`);
      }

      if (!isValid) {
        this.recordFailedVerification(userId, usedMethod);
        throw new Error('Invalid verification code');
      }

      // 重置失敗計數
      this.verificationAttempts.delete(userId);

      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_SUCCESS,
        {
          userId,
          method: usedMethod
        },
        RISK_LEVELS.LOW
      );

      return {
        success: true,
        method: usedMethod
      };

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_FAILED,
        {
          userId,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 驗證 TOTP 代碼
  verifyTOTP(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.totpWindow || 2, // 允許的時間窗口
      time: Math.floor(Date.now() / 1000)
    });
  }

  // 驗證備用代碼
  async verifyBackupCode(userId, code) {
    const backupCodes = await this.getBackupCodes(userId);
    
    for (let i = 0; i < backupCodes.length; i++) {
      if (backupCodes[i].code === code && !backupCodes[i].used) {
        // 標記代碼為已使用
        backupCodes[i].used = true;
        backupCodes[i].usedAt = new Date().toISOString();
        
        await this.storeBackupCodes(userId, backupCodes);
        
        logSecurityEvent(
          SECURITY_EVENT_TYPES.TFA_BACKUP_CODE_USED,
          {
            userId,
            remainingCodes: backupCodes.filter(c => !c.used).length
          },
          RISK_LEVELS.MEDIUM
        );
        
        return true;
      }
    }
    
    return false;
  }

  // 禁用 2FA
  async disableTwoFactor(userId, verificationCode, currentPassword) {
    try {
      const tfaConfig = await this.getUserTFAConfig(userId);
      if (!tfaConfig || tfaConfig.status !== TFA_STATUS.ENABLED) {
        throw new Error('Two-factor authentication is not enabled');
      }

      // 驗證當前密碼（需要實現密碼驗證邏輯）
      // const passwordValid = await this.verifyPassword(userId, currentPassword);
      // if (!passwordValid) {
      //   throw new Error('Invalid password');
      // }

      // 驗證 2FA 代碼
      await this.verifyTwoFactor(userId, verificationCode);

      // 移除 2FA 配置
      await this.removeTFAConfig(userId);
      await this.removeBackupCodes(userId);

      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_DISABLED,
        {
          userId,
          method: tfaConfig.method
        },
        RISK_LEVELS.MEDIUM
      );

      return { success: true };

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_DISABLE_FAILED,
        {
          userId,
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 生成新的備用代碼
  async regenerateBackupCodes(userId, verificationCode) {
    try {
      // 驗證 2FA 代碼
      await this.verifyTwoFactor(userId, verificationCode);

      // 生成新的備用代碼
      const newBackupCodes = this.generateBackupCodes(userId);
      await this.storeBackupCodes(userId, newBackupCodes);

      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_BACKUP_CODES_REGENERATED,
        {
          userId
        },
        RISK_LEVELS.LOW
      );

      return newBackupCodes.map(c => c.code);

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.TFA_BACKUP_CODES_REGENERATION_FAILED,
        {
          userId,
          error: error.message
        },
        RISK_LEVELS.MEDIUM
      );
      throw error;
    }
  }

  // 生成備用代碼
  generateBackupCodes(userId, count = 10) {
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const code = this.generateBackupCode();
      codes.push({
        code,
        used: false,
        createdAt: new Date().toISOString()
      });
    }
    
    return codes;
  }

  // 生成單個備用代碼
  generateBackupCode() {
    // 生成8位數字代碼
    const code = Math.random().toString(10).substring(2, 10);
    return code.padStart(8, '0');
  }

  // 生成驗證碼
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 記錄失敗的驗證嘗試
  recordFailedVerification(userId, method) {
    if (!this.verificationAttempts.has(userId)) {
      this.verificationAttempts.set(userId, {
        count: 0,
        firstAttempt: Date.now(),
        lastAttempt: Date.now()
      });
    }

    const attempts = this.verificationAttempts.get(userId);
    attempts.count++;
    attempts.lastAttempt = Date.now();

    logSecurityEvent(
      SECURITY_EVENT_TYPES.TFA_FAILED,
      {
        userId,
        method,
        attempts: attempts.count
      },
      RISK_LEVELS.MEDIUM
    );
  }

  // 檢查驗證嘗試次數
  checkVerificationAttempts(userId) {
    const attempts = this.verificationAttempts.get(userId);
    if (!attempts) return;

    const maxAttempts = this.config.maxAttempts || 5;
    const lockoutDuration = this.config.lockoutDuration || 15 * 60 * 1000; // 15分鐘

    // 檢查是否在鎖定期間內
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (attempts.count >= maxAttempts && timeSinceLastAttempt < lockoutDuration) {
      const remainingTime = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 60000);
      throw new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`);
    }

    // 重置計數器如果鎖定期已過
    if (timeSinceLastAttempt >= lockoutDuration) {
      this.verificationAttempts.delete(userId);
    }
  }

  // 存儲 2FA 配置
  async storeTFAConfig(userId, config) {
    const encryptedConfig = this.encryptTFAConfig(config);
    await secureTokenStorage.setToken(`tfa_${userId}`, {
      accessToken: encryptedConfig,
      expiresIn: null // 永不過期
    });
  }

  // 獲取 2FA 配置
  async getUserTFAConfig(userId) {
    try {
      const tokenData = await secureTokenStorage.getToken(`tfa_${userId}`);
      if (!tokenData) return null;

      return this.decryptTFAConfig(tokenData.token);
    } catch (error) {
      console.warn('Failed to retrieve 2FA config:', error);
      return null;
    }
  }

  // 移除 2FA 配置
  async removeTFAConfig(userId) {
    await secureTokenStorage.removeToken(`tfa_${userId}`);
  }

  // 存儲備用代碼
  async storeBackupCodes(userId, codes) {
    const encryptedCodes = this.encryptBackupCodes(codes);
    await secureTokenStorage.setToken(`tfa_backup_${userId}`, {
      accessToken: encryptedCodes,
      expiresIn: null
    });
  }

  // 獲取備用代碼
  async getBackupCodes(userId) {
    try {
      const tokenData = await secureTokenStorage.getToken(`tfa_backup_${userId}`);
      if (!tokenData) return [];

      return this.decryptBackupCodes(tokenData.token);
    } catch (error) {
      console.warn('Failed to retrieve backup codes:', error);
      return [];
    }
  }

  // 移除備用代碼
  async removeBackupCodes(userId) {
    await secureTokenStorage.removeToken(`tfa_backup_${userId}`);
  }

  // 加密 2FA 配置
  encryptTFAConfig(config) {
    const configStr = JSON.stringify(config);
    return CryptoJS.AES.encrypt(configStr, this.config.encryptionKey || 'default-key').toString();
  }

  // 解密 2FA 配置
  decryptTFAConfig(encryptedConfig) {
    const bytes = CryptoJS.AES.decrypt(encryptedConfig, this.config.encryptionKey || 'default-key');
    const configStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(configStr);
  }

  // 加密備用代碼
  encryptBackupCodes(codes) {
    const codesStr = JSON.stringify(codes);
    return CryptoJS.AES.encrypt(codesStr, this.config.encryptionKey || 'default-key').toString();
  }

  // 解密備用代碼
  decryptBackupCodes(encryptedCodes) {
    const bytes = CryptoJS.AES.decrypt(encryptedCodes, this.config.encryptionKey || 'default-key');
    const codesStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(codesStr);
  }

  // 發送簡訊驗證
  async sendSMSVerification(phoneNumber, code) {
    // 實際實現需要集成簡訊服務 (如 Twilio, AWS SNS)
    console.log(`SMS verification code for ${phoneNumber}: ${code}`);
    
    // 模擬 API 調用
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  // 發送電子郵件驗證
  async sendEmailVerification(email, code) {
    // 實際實現需要集成電子郵件服務
    console.log(`Email verification code for ${email}: ${code}`);
    
    // 模擬 API 調用
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  // 工具方法
  validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  maskPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/(\+?\d{1,3})\d+(\d{4})/, '$1***$2');
  }

  maskEmail(email) {
    const [local, domain] = email.split('@');
    const maskedLocal = local.substring(0, 2) + '*'.repeat(local.length - 2);
    return `${maskedLocal}@${domain}`;
  }

  sanitizeSetupData(setupData) {
    // 移除敏感資訊用於前端顯示
    const sanitized = { ...setupData };
    delete sanitized.verificationCode; // 不發送驗證碼到前端（生產環境）
    return sanitized;
  }

  // 獲取用戶 2FA 狀態
  async getUserTFAStatus(userId) {
    const config = await this.getUserTFAConfig(userId);
    const backupCodes = await this.getBackupCodes(userId);
    
    if (!config) {
      return {
        status: TFA_STATUS.DISABLED,
        method: null,
        backupCodesCount: 0
      };
    }

    return {
      status: config.status,
      method: config.method,
      enabledAt: config.enabledAt,
      backupCodesCount: backupCodes.filter(c => !c.used).length
    };
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      enabled: this.config.enabled,
      supportedMethods: Object.values(TFA_METHODS),
      pendingSetups: this.pendingSetups.size,
      activeVerificationAttempts: this.verificationAttempts.size,
      config: {
        totpWindow: this.config.totpWindow,
        maxAttempts: this.config.maxAttempts,
        lockoutDuration: this.config.lockoutDuration
      }
    };
  }
}

// 全局 2FA 管理器實例
export const twoFactorAuthManager = new TwoFactorAuthManager();

// React Hook 用於 2FA 管理
import { useState, useEffect, useCallback } from 'react';

export const useTwoFactorAuth = (userId) => {
  const [tfaStatus, setTFAStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);

  useEffect(() => {
    const loadTFAStatus = async () => {
      if (!userId) return;
      
      try {
        const status = await twoFactorAuthManager.getUserTFAStatus(userId);
        setTFAStatus(status);
      } catch (error) {
        console.error('Failed to load 2FA status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTFAStatus();
  }, [userId]);

  const enableTFA = useCallback(async (method, userInfo) => {
    setLoading(true);
    try {
      const result = await twoFactorAuthManager.enableTwoFactor(userId, method, userInfo);
      setSetupData(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const verifySetup = useCallback(async (verificationCode) => {
    setLoading(true);
    try {
      const result = await twoFactorAuthManager.verifyTwoFactorSetup(userId, verificationCode);
      if (result.success) {
        const newStatus = await twoFactorAuthManager.getUserTFAStatus(userId);
        setTFAStatus(newStatus);
        setSetupData(null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const verifyTFA = useCallback(async (code, method) => {
    return await twoFactorAuthManager.verifyTwoFactor(userId, code, method);
  }, [userId]);

  const disableTFA = useCallback(async (verificationCode, password) => {
    setLoading(true);
    try {
      const result = await twoFactorAuthManager.disableTwoFactor(userId, verificationCode, password);
      if (result.success) {
        const newStatus = await twoFactorAuthManager.getUserTFAStatus(userId);
        setTFAStatus(newStatus);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const regenerateBackupCodes = useCallback(async (verificationCode) => {
    return await twoFactorAuthManager.regenerateBackupCodes(userId, verificationCode);
  }, [userId]);

  return {
    tfaStatus,
    setupData,
    loading,
    enableTFA,
    verifySetup,
    verifyTFA,
    disableTFA,
    regenerateBackupCodes
  };
};

// 便利函數
export const enableTwoFactor = (userId, method, userInfo) =>
  twoFactorAuthManager.enableTwoFactor(userId, method, userInfo);

export const verifyTwoFactorSetup = (userId, verificationCode) =>
  twoFactorAuthManager.verifyTwoFactorSetup(userId, verificationCode);

export const verifyTwoFactor = (userId, code, method) =>
  twoFactorAuthManager.verifyTwoFactor(userId, code, method);

export const disableTwoFactor = (userId, verificationCode, password) =>
  twoFactorAuthManager.disableTwoFactor(userId, verificationCode, password);

export const getUserTFAStatus = (userId) =>
  twoFactorAuthManager.getUserTFAStatus(userId);

export default TwoFactorAuthManager;