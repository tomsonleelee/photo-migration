// 安全配置管理
export const SECURITY_CONFIG = {
  // TLS/HTTPS 設定
  tls: {
    enabled: true,
    redirectToHttps: true,
    hstsMaxAge: 31536000, // 1年
    hstsIncludeSubDomains: true,
    hstsPreload: true
  },
  
  // Cookie 安全設定
  cookies: {
    httpOnly: true,
    secure: true, // 只在 HTTPS 下發送
    sameSite: 'strict', // CSRF 保護
    maxAge: 24 * 60 * 60 * 1000, // 24小時
    domain: undefined, // 由瀏覽器自動設定
    path: '/',
    signed: true // 使用簽名防止篡改
  },
  
  // CSRF 保護設定
  csrf: {
    enabled: true,
    tokenLength: 32,
    saltLength: 8,
    sessionKey: '_csrf',
    value: req => req.body._csrf || req.query._csrf || req.headers['x-csrf-token'],
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    skipFailureHandler: false
  },
  
  // 速率限制設定
  rateLimit: {
    // 全局限制
    global: {
      windowMs: 15 * 60 * 1000, // 15分鐘
      max: 1000, // 每15分鐘最多1000次請求
      message: '請求過於頻繁，請稍後再試',
      standardHeaders: true,
      legacyHeaders: false
    },
    // 認證端點限制
    auth: {
      windowMs: 15 * 60 * 1000, // 15分鐘
      max: 10, // 每15分鐘最多10次登入嘗試
      message: '登入嘗試過於頻繁，請15分鐘後再試',
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    },
    // 密碼重設限制
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1小時
      max: 3, // 每小時最多3次密碼重設
      message: '密碼重設請求過於頻繁，請1小時後再試'
    },
    // API 端點限制
    api: {
      windowMs: 1 * 60 * 1000, // 1分鐘
      max: 100, // 每分鐘最多100次API請求
      message: 'API請求過於頻繁，請稍後再試'
    }
  },
  
  // 雙因子認證設定
  twoFactor: {
    issuer: 'Photo Migration System',
    window: 1, // 允許的時間窗口
    encoding: 'base32',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    qrCodeOptions: {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }
  },
  
  // 密碼安全要求
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    maxConsecutiveChars: 3,
    preventCommonPasswords: true,
    preventPersonalInfo: true
  },
  
  // 會話安全設定
  session: {
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'change-this-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // 重新整理會話過期時間
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      sameSite: 'strict'
    }
  },
  
  // 安全標頭設定
  headers: {
    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.flickr.com', 'https://graph.facebook.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    // 其他安全標頭
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permittedCrossDomainPolicies: false
  },
  
  // IP 安全設定
  ipSecurity: {
    whitelist: {
      enabled: false,
      ips: [] // 管理員可配置
    },
    blacklist: {
      enabled: true,
      ips: [], // 自動或手動添加
      autoBlacklistThreshold: 50, // 50次失敗請求後自動封鎖
      autoBlacklistDuration: 24 * 60 * 60 * 1000 // 24小時
    },
    trustProxy: process.env.TRUST_PROXY === 'true',
    maxProxyDepth: 1
  },

  // 雙因子認證設定
  twoFactor: {
    enabled: true,
    appName: 'Photo Migration System',
    issuer: 'PhotoMigration',
    
    // TOTP 設定
    secretLength: 32,
    totpWindow: 2, // 允許的時間窗口（±2個30秒週期）
    
    // 驗證設定
    maxAttempts: 5, // 最大失敗嘗試次數
    lockoutDuration: 15 * 60 * 1000, // 鎖定持續時間（15分鐘）
    
    // 備用代碼設定
    backupCodesCount: 10,
    backupCodeLength: 8,
    
    // 加密設定
    encryptionKey: process.env.TFA_ENCRYPTION_KEY || 'default-tfa-key-change-in-production',
    
    // 支援的方法
    supportedMethods: ['totp', 'sms', 'email', 'backup_codes'],
    
    // SMS 設定（需要配置簡訊服務）
    sms: {
      enabled: false,
      provider: 'twilio', // 'twilio', 'aws-sns', 'custom'
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER
    },
    
    // Email 設定
    email: {
      enabled: true,
      provider: 'smtp', // 'smtp', 'sendgrid', 'aws-ses'
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT || 587,
      smtpUsername: process.env.SMTP_USERNAME,
      smtpPassword: process.env.SMTP_PASSWORD,
      fromAddress: process.env.TFA_FROM_EMAIL || 'noreply@photomigration.com'
    }
  },
  
  // 資料匿名化設定
  anonymization: {
    userIdHashing: {
      algorithm: 'sha256',
      salt: process.env.ANONYMIZATION_SALT || 'change-this-salt',
      iterations: 10000
    },
    ipAddressMasking: {
      ipv4Mask: '255.255.255.0', // 遮罩最後一個字節
      ipv6Mask: 'ffff:ffff:ffff:ffff::'  // 遮罩後64位
    },
    dataRetention: {
      anonymizedData: 365 * 24 * 60 * 60 * 1000, // 1年
      rawLogs: 30 * 24 * 60 * 60 * 1000, // 30天
      auditLogs: 90 * 24 * 60 * 60 * 1000 // 90天
    }
  },
  
  // 安全掃描設定
  scanning: {
    dependencies: {
      enabled: true,
      schedule: '0 2 * * *', // 每天凌晨2點
      severity: ['high', 'critical'],
      autoUpdate: false, // 手動批准更新
      notificationChannels: ['email', 'slack']
    },
    vulnerabilities: {
      enabled: true,
      schedule: '0 */6 * * *', // 每6小時
      tools: ['npm-audit', 'snyk'],
      reportFormat: 'json'
    }
  },
  
  // 法規遵循設定
  compliance: {
    gdpr: {
      enabled: true,
      consentRequired: true,
      rightToBeForgoTTen: true,
      dataPortability: true,
      privacyByDesign: true
    },
    ccpa: {
      enabled: true,
      doNotSell: true,
      rightToKnow: true,
      rightToDelete: true
    }
  }
};

// 環境特定配置覆蓋
export const getSecurityConfig = (environment = process.env.NODE_ENV) => {
  const config = { ...SECURITY_CONFIG };
  
  switch (environment) {
    case 'development':
      config.tls.enabled = false;
      config.cookies.secure = false;
      config.session.cookie.secure = false;
      config.rateLimit.global.max = 10000; // 開發時放寬限制
      break;
      
    case 'test':
      config.tls.enabled = false;
      config.cookies.secure = false;
      config.session.cookie.secure = false;
      config.rateLimit.global.max = 100000; // 測試時幾乎無限制
      config.csrf.enabled = false; // 測試時禁用 CSRF
      break;
      
    case 'staging':
      config.tls.enabled = true;
      config.cookies.secure = true;
      config.session.cookie.secure = true;
      config.rateLimit.global.max = 5000; // 預發佈環境中等限制
      break;
      
    case 'production':
      // 使用默認的嚴格配置
      break;
  }
  
  return config;
};

// 驗證安全配置
export const validateSecurityConfig = (config) => {
  const errors = [];
  
  // 檢查必要的環境變數
  if (config.session.secret === 'change-this-in-production') {
    errors.push('SESSION_SECRET 環境變數未設定');
  }
  
  if (config.anonymization.userIdHashing.salt === 'change-this-salt') {
    errors.push('ANONYMIZATION_SALT 環境變數未設定');
  }
  
  // 檢查生產環境配置
  if (process.env.NODE_ENV === 'production') {
    if (!config.tls.enabled) {
      errors.push('生產環境必須啟用 TLS');
    }
    
    if (!config.cookies.secure) {
      errors.push('生產環境 cookies 必須設定為 secure');
    }
    
    if (!config.csrf.enabled) {
      errors.push('生產環境必須啟用 CSRF 保護');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default { SECURITY_CONFIG, getSecurityConfig, validateSecurityConfig };