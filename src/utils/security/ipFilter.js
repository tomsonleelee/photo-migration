// IP 白名單/黑名單過濾系統
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';

// IP 規則類型
export const IP_RULE_TYPES = {
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
  RATE_LIMIT: 'rate_limit',
  GEO_BLOCK: 'geo_block'
};

// IP 格式類型
export const IP_FORMATS = {
  IPV4: 'ipv4',
  IPV6: 'ipv6',
  CIDR: 'cidr',
  RANGE: 'range',
  WILDCARD: 'wildcard'
};

class IPFilter {
  constructor() {
    this.config = getSecurityConfig().ipSecurity;
    this.whitelistRules = new Map();
    this.blacklistRules = new Map();
    this.temporaryBlocks = new Map();
    this.geoBlockRules = new Map();
    this.failedAttempts = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  // 初始化 IP 過濾器
  async initialize() {
    try {
      // 載入預設規則
      await this.loadDefaultRules();
      
      // 載入用戶自定義規則
      await this.loadCustomRules();
      
      // 設定自動清理
      this.setupAutoCleanup();
      
      this.isInitialized = true;
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'IPFilter',
          action: 'initialized',
          whitelistCount: this.whitelistRules.size,
          blacklistCount: this.blacklistRules.size
        },
        RISK_LEVELS.LOW
      );

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'IPFilter',
          action: 'initialization_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 載入預設規則
  async loadDefaultRules() {
    // 預設白名單（本地地址）
    const defaultWhitelist = [
      '127.0.0.1',          // localhost IPv4
      '::1',                // localhost IPv6
      '10.0.0.0/8',         // 私有網路 A 類
      '172.16.0.0/12',      // 私有網路 B 類
      '192.168.0.0/16'      // 私有網路 C 類
    ];

    // 預設黑名單（已知惡意 IP）
    const defaultBlacklist = [
      '0.0.0.0',            // 無效地址
      '169.254.0.0/16',     // 自動配置地址
      '224.0.0.0/4',        // 組播地址
      '240.0.0.0/4'         // 保留地址
    ];

    // 添加預設白名單規則
    for (const ip of defaultWhitelist) {
      this.addRule(IP_RULE_TYPES.WHITELIST, ip, {
        description: 'Default safe IP range',
        source: 'system',
        permanent: true
      });
    }

    // 添加預設黑名單規則
    for (const ip of defaultBlacklist) {
      this.addRule(IP_RULE_TYPES.BLACKLIST, ip, {
        description: 'Default blocked IP range',
        source: 'system',
        permanent: true
      });
    }
  }

  // 載入用戶自定義規則
  async loadCustomRules() {
    try {
      // 從 localStorage 載入規則
      const savedRules = localStorage.getItem('ip_filter_rules');
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        
        for (const rule of rules) {
          this.addRule(rule.type, rule.ip, rule.options);
        }
      }

      // 從服務器載入規則
      await this.loadServerRules();
    } catch (error) {
      console.warn('Failed to load custom IP rules:', error);
    }
  }

  // 從服務器載入規則
  async loadServerRules() {
    try {
      const response = await fetch('/api/security/ip-rules');
      if (response.ok) {
        const serverRules = await response.json();
        
        for (const rule of serverRules) {
          this.addRule(rule.type, rule.ip, {
            ...rule.options,
            source: 'server'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load server IP rules:', error);
    }
  }

  // 添加 IP 規則
  addRule(type, ip, options = {}) {
    const rule = {
      id: this.generateRuleId(),
      type,
      ip,
      pattern: this.parseIPPattern(ip),
      options: {
        description: '',
        source: 'user',
        permanent: false,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        ...options
      }
    };

    // 驗證規則
    if (!this.validateRule(rule)) {
      throw new Error(`Invalid IP rule: ${ip}`);
    }

    // 存儲規則
    const targetMap = type === IP_RULE_TYPES.WHITELIST ? 
      this.whitelistRules : this.blacklistRules;
    
    targetMap.set(rule.id, rule);

    // 記錄事件
    logSecurityEvent(
      SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
      {
        action: 'ip_rule_added',
        type,
        ip,
        source: rule.options.source
      },
      RISK_LEVELS.MEDIUM
    );

    // 保存到本地存儲
    this.saveRulesToStorage();

    return rule.id;
  }

  // 移除 IP 規則
  removeRule(ruleId) {
    let removed = false;
    let rule = null;

    // 從白名單移除
    if (this.whitelistRules.has(ruleId)) {
      rule = this.whitelistRules.get(ruleId);
      this.whitelistRules.delete(ruleId);
      removed = true;
    }

    // 從黑名單移除
    if (this.blacklistRules.has(ruleId)) {
      rule = this.blacklistRules.get(ruleId);
      this.blacklistRules.delete(ruleId);
      removed = true;
    }

    if (removed && rule) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'ip_rule_removed',
          type: rule.type,
          ip: rule.ip
        },
        RISK_LEVELS.MEDIUM
      );

      this.saveRulesToStorage();
      return true;
    }

    return false;
  }

  // 檢查 IP 是否被允許
  isIPAllowed(ip, context = {}) {
    if (!this.isInitialized) {
      console.warn('IP Filter not initialized, allowing request');
      return { allowed: true, reason: 'filter_not_initialized' };
    }

    // 規範化 IP 地址
    const normalizedIP = this.normalizeIP(ip);
    
    // 檢查臨時封鎖
    const tempBlockResult = this.checkTemporaryBlock(normalizedIP);
    if (!tempBlockResult.allowed) {
      return tempBlockResult;
    }

    // 檢查黑名單（優先級最高）
    const blacklistResult = this.checkBlacklist(normalizedIP);
    if (!blacklistResult.allowed) {
      this.recordBlockedAccess(normalizedIP, blacklistResult.reason, context);
      return blacklistResult;
    }

    // 檢查白名單
    const whitelistResult = this.checkWhitelist(normalizedIP);
    if (whitelistResult.allowed) {
      return whitelistResult;
    }

    // 檢查地理位置封鎖
    const geoBlockResult = this.checkGeoBlock(normalizedIP, context);
    if (!geoBlockResult.allowed) {
      this.recordBlockedAccess(normalizedIP, geoBlockResult.reason, context);
      return geoBlockResult;
    }

    // 如果啟用白名單模式，只允許白名單 IP
    if (this.config.whitelist.enabled) {
      this.recordBlockedAccess(normalizedIP, 'not_in_whitelist', context);
      return { 
        allowed: false, 
        reason: 'not_in_whitelist',
        action: 'block'
      };
    }

    // 默認允許
    return { allowed: true, reason: 'default_allow' };
  }

  // 檢查白名單
  checkWhitelist(ip) {
    for (const [ruleId, rule] of this.whitelistRules.entries()) {
      if (this.isRuleExpired(rule)) {
        this.whitelistRules.delete(ruleId);
        continue;
      }

      if (this.matchesPattern(ip, rule.pattern)) {
        return {
          allowed: true,
          reason: 'whitelist_match',
          rule: ruleId,
          description: rule.options.description
        };
      }
    }

    return { allowed: false, reason: 'no_whitelist_match' };
  }

  // 檢查黑名單
  checkBlacklist(ip) {
    for (const [ruleId, rule] of this.blacklistRules.entries()) {
      if (this.isRuleExpired(rule)) {
        this.blacklistRules.delete(ruleId);
        continue;
      }

      if (this.matchesPattern(ip, rule.pattern)) {
        return {
          allowed: false,
          reason: 'blacklist_match',
          rule: ruleId,
          description: rule.options.description,
          action: 'block'
        };
      }
    }

    return { allowed: true, reason: 'no_blacklist_match' };
  }

  // 檢查臨時封鎖
  checkTemporaryBlock(ip) {
    const blockInfo = this.temporaryBlocks.get(ip);
    
    if (blockInfo) {
      if (blockInfo.expiresAt > Date.now()) {
        return {
          allowed: false,
          reason: 'temporary_block',
          expiresAt: blockInfo.expiresAt,
          action: 'block'
        };
      } else {
        // 過期的封鎖，移除
        this.temporaryBlocks.delete(ip);
      }
    }

    return { allowed: true, reason: 'no_temporary_block' };
  }

  // 檢查地理位置封鎖
  checkGeoBlock(ip, context) {
    // 簡化的地理位置檢查
    // 實際實現需要集成 GeoIP 服務
    if (context.country && this.geoBlockRules.has(context.country)) {
      const rule = this.geoBlockRules.get(context.country);
      return {
        allowed: false,
        reason: 'geo_block',
        country: context.country,
        rule: rule.id,
        action: 'block'
      };
    }

    return { allowed: true, reason: 'no_geo_block' };
  }

  // 記錄失敗嘗試
  recordFailedAttempt(ip, context = {}) {
    const key = ip;
    const now = Date.now();
    
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        attempts: []
      });
    }

    const attempts = this.failedAttempts.get(key);
    attempts.count++;
    attempts.lastAttempt = now;
    attempts.attempts.push({
      timestamp: now,
      context
    });

    // 保留最近50次嘗試
    if (attempts.attempts.length > 50) {
      attempts.attempts.splice(0, attempts.attempts.length - 50);
    }

    // 檢查是否需要自動封鎖
    this.checkAutoBlock(ip, attempts);

    return attempts.count;
  }

  // 檢查自動封鎖
  checkAutoBlock(ip, attempts) {
    const threshold = this.config.autoBlacklistThreshold || 50;
    const timeWindow = 10 * 60 * 1000; // 10分鐘

    // 計算時間窗口內的嘗試次數
    const recentAttempts = attempts.attempts.filter(
      attempt => attempt.timestamp > Date.now() - timeWindow
    );

    if (recentAttempts.length >= threshold) {
      // 自動封鎖
      this.addTemporaryBlock(ip, {
        reason: 'auto_block_failed_attempts',
        duration: this.config.autoBlacklistDuration || 24 * 60 * 60 * 1000, // 24小時
        attempts: recentAttempts.length
      });

      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'auto_ip_block',
          ip,
          attempts: recentAttempts.length,
          threshold
        },
        RISK_LEVELS.HIGH
      );
    }
  }

  // 添加臨時封鎖
  addTemporaryBlock(ip, options = {}) {
    const blockInfo = {
      ip,
      reason: options.reason || 'manual_block',
      createdAt: Date.now(),
      expiresAt: Date.now() + (options.duration || 60 * 60 * 1000), // 默認1小時
      attempts: options.attempts || 0
    };

    this.temporaryBlocks.set(ip, blockInfo);

    logSecurityEvent(
      SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
      {
        action: 'temporary_ip_block',
        ip,
        duration: options.duration,
        reason: blockInfo.reason
      },
      RISK_LEVELS.HIGH
    );

    return blockInfo;
  }

  // 移除臨時封鎖
  removeTemporaryBlock(ip) {
    const removed = this.temporaryBlocks.delete(ip);
    
    if (removed) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'temporary_ip_unblock',
          ip
        },
        RISK_LEVELS.LOW
      );
    }

    return removed;
  }

  // 記錄被封鎖的存取
  recordBlockedAccess(ip, reason, context) {
    logSecurityEvent(
      SECURITY_EVENT_TYPES.ACCESS_DENIED,
      {
        reason: 'ip_filter_block',
        blockReason: reason,
        clientIp: ip,
        userAgent: context.userAgent,
        path: context.path,
        method: context.method
      },
      RISK_LEVELS.MEDIUM
    );
  }

  // 解析 IP 模式
  parseIPPattern(ip) {
    const pattern = {
      original: ip,
      type: null,
      normalized: null
    };

    if (ip.includes('/')) {
      // CIDR 格式
      pattern.type = IP_FORMATS.CIDR;
      pattern.normalized = this.normalizeCIDR(ip);
    } else if (ip.includes('-')) {
      // 範圍格式
      pattern.type = IP_FORMATS.RANGE;
      pattern.normalized = this.normalizeRange(ip);
    } else if (ip.includes('*')) {
      // 通配符格式
      pattern.type = IP_FORMATS.WILDCARD;
      pattern.normalized = this.normalizeWildcard(ip);
    } else if (ip.includes(':')) {
      // IPv6
      pattern.type = IP_FORMATS.IPV6;
      pattern.normalized = this.normalizeIPv6(ip);
    } else {
      // IPv4
      pattern.type = IP_FORMATS.IPV4;
      pattern.normalized = this.normalizeIPv4(ip);
    }

    return pattern;
  }

  // 檢查 IP 是否匹配模式
  matchesPattern(ip, pattern) {
    switch (pattern.type) {
      case IP_FORMATS.IPV4:
      case IP_FORMATS.IPV6:
        return ip === pattern.normalized;
        
      case IP_FORMATS.CIDR:
        return this.matchesCIDR(ip, pattern.normalized);
        
      case IP_FORMATS.RANGE:
        return this.matchesRange(ip, pattern.normalized);
        
      case IP_FORMATS.WILDCARD:
        return this.matchesWildcard(ip, pattern.normalized);
        
      default:
        return false;
    }
  }

  // CIDR 匹配
  matchesCIDR(ip, cidr) {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    
    // 簡化的 IPv4 CIDR 匹配
    if (network.includes('.')) {
      return this.matchesIPv4CIDR(ip, network, prefix);
    }
    
    // IPv6 CIDR 匹配
    return this.matchesIPv6CIDR(ip, network, prefix);
  }

  // IPv4 CIDR 匹配
  matchesIPv4CIDR(ip, network, prefix) {
    const ipParts = ip.split('.').map(part => parseInt(part));
    const networkParts = network.split('.').map(part => parseInt(part));
    
    const bitsToCheck = Math.floor(prefix / 8);
    const remainingBits = prefix % 8;
    
    // 檢查完整的字節
    for (let i = 0; i < bitsToCheck; i++) {
      if (ipParts[i] !== networkParts[i]) {
        return false;
      }
    }
    
    // 檢查部分字節
    if (remainingBits > 0 && bitsToCheck < 4) {
      const mask = 0xFF << (8 - remainingBits);
      if ((ipParts[bitsToCheck] & mask) !== (networkParts[bitsToCheck] & mask)) {
        return false;
      }
    }
    
    return true;
  }

  // 通配符匹配
  matchesWildcard(ip, pattern) {
    const regex = pattern.replace(/\*/g, '\\d+');
    return new RegExp(`^${regex}$`).test(ip);
  }

  // 工具方法
  normalizeIP(ip) {
    if (ip.includes(':')) {
      return this.normalizeIPv6(ip);
    } else {
      return this.normalizeIPv4(ip);
    }
  }

  normalizeIPv4(ip) {
    const parts = ip.split('.');
    return parts.map(part => parseInt(part).toString()).join('.');
  }

  normalizeIPv6(ip) {
    // 簡化的 IPv6 正規化
    return ip.toLowerCase();
  }

  normalizeCIDR(cidr) {
    const [ip, prefix] = cidr.split('/');
    return `${this.normalizeIP(ip)}/${prefix}`;
  }

  validateRule(rule) {
    try {
      // 驗證 IP 格式
      this.parseIPPattern(rule.ip);
      return true;
    } catch (error) {
      return false;
    }
  }

  isRuleExpired(rule) {
    return rule.options.expiresAt && new Date(rule.options.expiresAt) <= new Date();
  }

  generateRuleId() {
    return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 保存規則到本地存儲
  saveRulesToStorage() {
    const allRules = [
      ...Array.from(this.whitelistRules.values()),
      ...Array.from(this.blacklistRules.values())
    ].filter(rule => !rule.options.permanent && rule.options.source === 'user');

    localStorage.setItem('ip_filter_rules', JSON.stringify(allRules));
  }

  // 設定自動清理
  setupAutoCleanup() {
    // 每小時清理一次過期規則和封鎖
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  // 清理過期數據
  cleanup() {
    let cleanedCount = 0;

    // 清理過期規則
    for (const [ruleId, rule] of this.whitelistRules.entries()) {
      if (this.isRuleExpired(rule)) {
        this.whitelistRules.delete(ruleId);
        cleanedCount++;
      }
    }

    for (const [ruleId, rule] of this.blacklistRules.entries()) {
      if (this.isRuleExpired(rule)) {
        this.blacklistRules.delete(ruleId);
        cleanedCount++;
      }
    }

    // 清理過期的臨時封鎖
    const now = Date.now();
    for (const [ip, blockInfo] of this.temporaryBlocks.entries()) {
      if (blockInfo.expiresAt <= now) {
        this.temporaryBlocks.delete(ip);
        cleanedCount++;
      }
    }

    // 清理舊的失敗嘗試記錄
    const cutoff = now - 24 * 60 * 60 * 1000; // 24小時前
    for (const [ip, attempts] of this.failedAttempts.entries()) {
      if (attempts.lastAttempt < cutoff) {
        this.failedAttempts.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveRulesToStorage();
    }

    return cleanedCount;
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      rules: {
        whitelist: this.whitelistRules.size,
        blacklist: this.blacklistRules.size,
        temporary: this.temporaryBlocks.size
      },
      failedAttempts: this.failedAttempts.size,
      isInitialized: this.isInitialized,
      config: {
        whitelistEnabled: this.config.whitelist.enabled,
        blacklistEnabled: this.config.blacklist.enabled,
        autoBlockEnabled: this.config.blacklist.autoBlacklistThreshold > 0
      }
    };
  }
}

// 全局 IP 過濾器實例
export const ipFilter = new IPFilter();

// React Hook 用於 IP 過濾狀態
export const useIPFilter = () => {
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    const updateStats = () => {
      setStatistics(ipFilter.getStatistics());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  const checkIP = useCallback((ip, context) => {
    return ipFilter.isIPAllowed(ip, context);
  }, []);

  const addRule = useCallback((type, ip, options) => {
    return ipFilter.addRule(type, ip, options);
  }, []);

  const removeRule = useCallback((ruleId) => {
    return ipFilter.removeRule(ruleId);
  }, []);

  const blockIP = useCallback((ip, options) => {
    return ipFilter.addTemporaryBlock(ip, options);
  }, []);

  const unblockIP = useCallback((ip) => {
    return ipFilter.removeTemporaryBlock(ip);
  }, []);

  return {
    statistics,
    checkIP,
    addRule,
    removeRule,
    blockIP,
    unblockIP
  };
};

// 便利函數
export const checkIPAccess = (ip, context) => ipFilter.isIPAllowed(ip, context);
export const addIPRule = (type, ip, options) => ipFilter.addRule(type, ip, options);
export const removeIPRule = (ruleId) => ipFilter.removeRule(ruleId);
export const blockIP = (ip, options) => ipFilter.addTemporaryBlock(ip, options);
export const unblockIP = (ip) => ipFilter.removeTemporaryBlock(ip);
export const getIPFilterStatistics = () => ipFilter.getStatistics();

// 導入 React hooks
import { useState, useEffect, useCallback } from 'react';

export default IPFilter;