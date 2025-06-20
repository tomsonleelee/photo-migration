// API 速率限制機制
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';

// 速率限制算法類型
export const RATE_LIMIT_ALGORITHMS = {
  TOKEN_BUCKET: 'token_bucket',
  SLIDING_WINDOW: 'sliding_window',
  FIXED_WINDOW: 'fixed_window',
  LEAKY_BUCKET: 'leaky_bucket'
};

// Token Bucket 算法實現
class TokenBucket {
  constructor(capacity, refillRate, refillPeriod = 1000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillPeriod = refillPeriod;
    this.lastRefill = Date.now();
  }

  // 嘗試消費 tokens
  tryConsume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  // 補充 tokens
  refill() {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    
    if (timeSinceLastRefill >= this.refillPeriod) {
      const periodsElapsed = Math.floor(timeSinceLastRefill / this.refillPeriod);
      const tokensToAdd = periodsElapsed * this.refillRate;
      
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  // 獲取當前狀態
  getStatus() {
    this.refill();
    return {
      tokens: this.tokens,
      capacity: this.capacity,
      percentage: (this.tokens / this.capacity) * 100
    };
  }
}

// 滑動窗口算法實現
class SlidingWindow {
  constructor(windowSize, maxRequests) {
    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
    this.requests = [];
  }

  // 嘗試添加請求
  tryAddRequest() {
    const now = Date.now();
    
    // 清理過期請求
    this.cleanup(now);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  // 清理過期請求
  cleanup(now) {
    const cutoff = now - this.windowSize;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  // 獲取當前狀態
  getStatus() {
    const now = Date.now();
    this.cleanup(now);
    
    return {
      requests: this.requests.length,
      maxRequests: this.maxRequests,
      percentage: (this.requests.length / this.maxRequests) * 100,
      resetTime: this.requests.length > 0 ? 
        this.requests[0] + this.windowSize : 
        now + this.windowSize
    };
  }
}

// 主要速率限制器類別
class RateLimiter {
  constructor() {
    this.config = getSecurityConfig().rateLimit;
    this.limiters = new Map(); // 每個客戶端的限制器
    this.globalLimiters = new Map(); // 全局限制器
    this.isInitialized = false;
    
    this.initializeGlobalLimiters();
  }

  // 初始化全局限制器
  initializeGlobalLimiters() {
    // 全局限制器
    this.globalLimiters.set('global', new TokenBucket(
      this.config.global.max,
      this.config.global.max,
      this.config.global.windowMs
    ));

    // API 限制器
    this.globalLimiters.set('api', new TokenBucket(
      this.config.api.max,
      this.config.api.max,
      this.config.api.windowMs
    ));

    this.isInitialized = true;
  }

  // 檢查速率限制
  async checkRateLimit(identifier, endpoint = 'default', options = {}) {
    const limitConfig = this.getLimitConfig(endpoint);
    const clientKey = this.generateClientKey(identifier, endpoint);
    
    // 獲取或創建客戶端限制器
    let limiter = this.limiters.get(clientKey);
    if (!limiter) {
      limiter = this.createLimiter(limitConfig);
      this.limiters.set(clientKey, limiter);
    }

    // 檢查全局限制
    const globalResult = await this.checkGlobalLimits();
    if (!globalResult.allowed) {
      return this.createRateLimitResult(false, globalResult, 'global');
    }

    // 檢查客戶端特定限制
    const clientResult = await this.checkClientLimit(limiter, limitConfig);
    if (!clientResult.allowed) {
      // 記錄速率限制事件
      this.logRateLimitEvent(identifier, endpoint, clientResult);
      return this.createRateLimitResult(false, clientResult, 'client');
    }

    return this.createRateLimitResult(true, clientResult, 'client');
  }

  // 獲取限制配置
  getLimitConfig(endpoint) {
    const endpointConfigs = {
      'auth': this.config.auth,
      'password-reset': this.config.passwordReset,
      'api': this.config.api,
      'default': this.config.global
    };

    return endpointConfigs[endpoint] || this.config.global;
  }

  // 生成客戶端識別鍵
  generateClientKey(identifier, endpoint) {
    // 組合 IP、用戶ID、端點等信息
    const parts = [
      identifier.ip || 'unknown',
      identifier.userId || 'anonymous',
      endpoint
    ];
    
    return parts.join('|');
  }

  // 創建限制器
  createLimiter(config, algorithm = RATE_LIMIT_ALGORITHMS.TOKEN_BUCKET) {
    switch (algorithm) {
      case RATE_LIMIT_ALGORITHMS.TOKEN_BUCKET:
        return new TokenBucket(
          config.max,
          config.max,
          config.windowMs
        );
        
      case RATE_LIMIT_ALGORITHMS.SLIDING_WINDOW:
        return new SlidingWindow(
          config.windowMs,
          config.max
        );
        
      default:
        return new TokenBucket(config.max, config.max, config.windowMs);
    }
  }

  // 檢查全局限制
  async checkGlobalLimits() {
    const globalLimiter = this.globalLimiters.get('global');
    const allowed = globalLimiter.tryConsume(1);
    
    return {
      allowed,
      ...globalLimiter.getStatus()
    };
  }

  // 檢查客戶端限制
  async checkClientLimit(limiter, config) {
    const allowed = limiter.tryConsume(1);
    const status = limiter.getStatus();
    
    return {
      allowed,
      ...status,
      limit: config.max,
      windowMs: config.windowMs,
      resetTime: Date.now() + config.windowMs
    };
  }

  // 創建速率限制結果
  createRateLimitResult(allowed, details, scope) {
    const result = {
      allowed,
      scope,
      limit: details.limit || details.capacity,
      remaining: details.tokens || (details.maxRequests - details.requests),
      resetTime: details.resetTime || Date.now() + (details.windowMs || 60000),
      percentage: details.percentage || 0
    };

    // 添加標準 HTTP 標頭
    result.headers = {
      'X-RateLimit-Limit': result.limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
      'X-RateLimit-Scope': scope
    };

    if (!allowed) {
      result.headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000);
    }

    return result;
  }

  // 記錄速率限制事件
  logRateLimitEvent(identifier, endpoint, result) {
    const riskLevel = this.assessRiskLevel(identifier, endpoint, result);
    
    logSecurityEvent(
      SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED,
      {
        clientIp: identifier.ip,
        userId: identifier.userId,
        endpoint,
        requestCount: result.limit - result.remaining,
        limit: result.limit,
        windowMs: result.windowMs,
        userAgent: identifier.userAgent
      },
      riskLevel
    );
  }

  // 評估風險等級
  assessRiskLevel(identifier, endpoint, result) {
    // 認證端點的限制更嚴重
    if (endpoint === 'auth' || endpoint === 'password-reset') {
      return RISK_LEVELS.HIGH;
    }

    // 檢查超限程度
    const overagePercentage = ((result.limit - result.remaining) / result.limit) * 100;
    
    if (overagePercentage > 150) {
      return RISK_LEVELS.HIGH;
    } else if (overagePercentage > 120) {
      return RISK_LEVELS.MEDIUM;
    } else {
      return RISK_LEVELS.LOW;
    }
  }

  // 重置客戶端限制
  resetClientLimit(identifier, endpoint = 'default') {
    const clientKey = this.generateClientKey(identifier, endpoint);
    this.limiters.delete(clientKey);
    
    logSecurityEvent(
      SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
      {
        action: 'rate_limit_reset',
        clientKey,
        endpoint
      },
      RISK_LEVELS.LOW
    );
  }

  // 臨時封鎖客戶端
  blockClient(identifier, duration = 60000) {
    const clientKey = this.generateClientKey(identifier, 'blocked');
    
    // 創建一個永遠失敗的限制器
    const blockLimiter = new TokenBucket(0, 0, duration);
    this.limiters.set(clientKey, blockLimiter);
    
    // 設定自動解除封鎖
    setTimeout(() => {
      this.limiters.delete(clientKey);
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'client_unblocked',
          clientIp: identifier.ip,
          duration
        },
        RISK_LEVELS.LOW
      );
    }, duration);

    logSecurityEvent(
      SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
      {
        action: 'client_blocked',
        clientIp: identifier.ip,
        duration
      },
      RISK_LEVELS.HIGH
    );
  }

  // 獲取客戶端狀態
  getClientStatus(identifier, endpoint = 'default') {
    const clientKey = this.generateClientKey(identifier, endpoint);
    const limiter = this.limiters.get(clientKey);
    
    if (!limiter) {
      const config = this.getLimitConfig(endpoint);
      return {
        requests: 0,
        limit: config.max,
        remaining: config.max,
        percentage: 0,
        resetTime: Date.now() + config.windowMs
      };
    }
    
    return limiter.getStatus();
  }

  // 獲取所有客戶端統計
  getStatistics() {
    const stats = {
      totalClients: this.limiters.size,
      globalLimiters: {},
      topClients: [],
      blockedClients: 0
    };

    // 全局限制器狀態
    for (const [name, limiter] of this.globalLimiters.entries()) {
      stats.globalLimiters[name] = limiter.getStatus();
    }

    // 客戶端統計
    const clientStats = [];
    for (const [key, limiter] of this.limiters.entries()) {
      const status = limiter.getStatus();
      clientStats.push({
        key,
        ...status
      });
      
      // 統計被封鎖的客戶端
      if (status.tokens === 0 && status.capacity === 0) {
        stats.blockedClients++;
      }
    }

    // 按使用量排序，取前10個
    stats.topClients = clientStats
      .sort((a, b) => (b.capacity - b.tokens) - (a.capacity - a.tokens))
      .slice(0, 10);

    return stats;
  }

  // 清理過期的限制器
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, limiter] of this.limiters.entries()) {
      // 檢查限制器是否長時間未使用
      if (limiter.lastRefill && (now - limiter.lastRefill > 60 * 60 * 1000)) { // 1小時
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.limiters.delete(key));
    
    return expiredKeys.length;
  }

  // 應用預設白名單
  applyWhitelist(identifier) {
    // 本地開發環境
    if (identifier.ip === '127.0.0.1' || identifier.ip === '::1') {
      return true;
    }

    // 檢查配置的白名單
    const whitelist = this.config.whitelist || [];
    return whitelist.some(whitelistedIp => {
      if (whitelistedIp.includes('/')) {
        // CIDR 格式
        return this.isIpInCIDR(identifier.ip, whitelistedIp);
      } else {
        // 直接 IP 比較
        return identifier.ip === whitelistedIp;
      }
    });
  }

  // 檢查 IP 是否在 CIDR 範圍內
  isIpInCIDR(ip, cidr) {
    // 簡化的 CIDR 檢查（實際實現需要更複雜的邏輯）
    const [network, prefixLength] = cidr.split('/');
    const networkParts = network.split('.');
    const ipParts = ip.split('.');
    
    if (networkParts.length !== 4 || ipParts.length !== 4) {
      return false;
    }
    
    const prefix = parseInt(prefixLength);
    const bitsToCheck = Math.floor(prefix / 8);
    
    for (let i = 0; i < bitsToCheck; i++) {
      if (networkParts[i] !== ipParts[i]) {
        return false;
      }
    }
    
    return true;
  }
}

// 全局速率限制器實例
export const rateLimiter = new RateLimiter();

// React Hook 用於速率限制狀態
export const useRateLimit = (identifier, endpoint = 'default') => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkLimit = useCallback(async () => {
    setLoading(true);
    try {
      const result = await rateLimiter.checkRateLimit(identifier, endpoint);
      setStatus(result);
      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [identifier, endpoint]);

  const getStatus = useCallback(() => {
    return rateLimiter.getClientStatus(identifier, endpoint);
  }, [identifier, endpoint]);

  useEffect(() => {
    // 初始狀態
    setStatus(getStatus());
  }, [getStatus]);

  return {
    status,
    loading,
    checkLimit,
    getStatus
  };
};

// 便利函數
export const checkRateLimit = (identifier, endpoint, options) => 
  rateLimiter.checkRateLimit(identifier, endpoint, options);

export const resetRateLimit = (identifier, endpoint) => 
  rateLimiter.resetClientLimit(identifier, endpoint);

export const blockClient = (identifier, duration) => 
  rateLimiter.blockClient(identifier, duration);

export const getRateLimitStatistics = () => 
  rateLimiter.getStatistics();

// 中間件工廠函數（用於服務器端）
export const createRateLimitMiddleware = (endpoint, customConfig = {}) => {
  return async (req, res, next) => {
    const identifier = {
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    };

    // 檢查白名單
    if (rateLimiter.applyWhitelist(identifier)) {
      return next();
    }

    const result = await rateLimiter.checkRateLimit(identifier, endpoint, customConfig);

    // 設定響應標頭
    res.set(result.headers);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.headers['Retry-After']
      });
    }

    next();
  };
};

// 導入 React hooks
import { useState, useCallback, useEffect } from 'react';

export default RateLimiter;