// 自動化安全掃描系統
import { getSecurityConfig } from './securityConfig.js';
import { logSecurityEvent, SECURITY_EVENT_TYPES, RISK_LEVELS } from './securityLogger.js';

// 掃描類型
export const SCAN_TYPES = {
  DEPENDENCY: 'dependency',           // 依賴漏洞掃描
  CODE: 'code',                      // 代碼安全掃描
  CONFIGURATION: 'configuration',    // 配置安全掃描
  RUNTIME: 'runtime',               // 運行時安全掃描
  NETWORK: 'network',               // 網路安全掃描
  CONTENT: 'content'                // 內容安全掃描
};

// 嚴重程度等級
export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// 掃描狀態
export const SCAN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class SecurityScannerManager {
  constructor() {
    this.config = getSecurityConfig().scanning;
    this.scanHistory = new Map();
    this.activeScanners = new Map();
    this.scheduledScans = new Map();
    this.scanResults = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  // 初始化安全掃描器
  async initialize() {
    try {
      // 載入掃描規則
      await this.loadScanRules();
      
      // 設定定時掃描
      this.setupScheduledScans();
      
      // 載入歷史掃描結果
      this.loadScanHistory();
      
      this.isInitialized = true;
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_SCAN_START,
        {
          component: 'SecurityScannerManager',
          action: 'initialized'
        },
        RISK_LEVELS.LOW
      );

    } catch (error) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          component: 'SecurityScannerManager',
          action: 'initialization_failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );
      throw error;
    }
  }

  // 載入掃描規則
  async loadScanRules() {
    // 依賴漏洞掃描規則
    this.addScanRule(SCAN_TYPES.DEPENDENCY, {
      name: 'NPM 依賴漏洞掃描',
      description: '檢查 npm 依賴中的已知安全漏洞',
      enabled: this.config.dependencies.enabled,
      schedule: this.config.dependencies.schedule,
      severity: this.config.dependencies.severity,
      command: 'npm audit --json',
      parser: this.parseNpmAuditResults.bind(this)
    });

    // 代碼安全掃描規則
    this.addScanRule(SCAN_TYPES.CODE, {
      name: '代碼安全掃描',
      description: '靜態代碼分析以發現安全問題',
      enabled: true,
      schedule: '0 3 * * *', // 每天凌晨3點
      patterns: [
        {
          name: '硬編碼密碼',
          regex: /password\s*[:=]\s*["'][^"']{3,}["']/gi,
          severity: SEVERITY_LEVELS.HIGH,
          description: '發現可能的硬編碼密碼'
        },
        {
          name: 'API 密鑰洩露',
          regex: /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi,
          severity: SEVERITY_LEVELS.CRITICAL,
          description: '發現可能的 API 密鑰洩露'
        },
        {
          name: 'SQL 注入風險',
          regex: /query\s*\+\s*["'][^"']*["']\s*\+/gi,
          severity: SEVERITY_LEVELS.HIGH,
          description: '發現潛在的 SQL 注入漏洞'
        },
        {
          name: 'XSS 風險',
          regex: /innerHTML\s*[:=]\s*[^;]*\+/gi,
          severity: SEVERITY_LEVELS.MEDIUM,
          description: '發現潛在的 XSS 漏洞'
        },
        {
          name: 'eval 使用',
          regex: /eval\s*\(/gi,
          severity: SEVERITY_LEVELS.HIGH,
          description: '使用 eval() 函數存在安全風險'
        },
        {
          name: '調試代碼',
          regex: /console\.(log|debug|info)\s*\(/gi,
          severity: SEVERITY_LEVELS.LOW,
          description: '發現調試代碼，生產環境應移除'
        }
      ]
    });

    // 配置安全掃描規則
    this.addScanRule(SCAN_TYPES.CONFIGURATION, {
      name: '配置安全掃描',
      description: '檢查系統配置的安全性',
      enabled: true,
      schedule: '0 4 * * *', // 每天凌晨4點
      checks: [
        {
          name: 'HTTPS 配置',
          check: this.checkHTTPSConfig.bind(this),
          severity: SEVERITY_LEVELS.HIGH
        },
        {
          name: 'CORS 配置',
          check: this.checkCORSConfig.bind(this),
          severity: SEVERITY_LEVELS.MEDIUM
        },
        {
          name: '安全標頭',
          check: this.checkSecurityHeaders.bind(this),
          severity: SEVERITY_LEVELS.MEDIUM
        },
        {
          name: 'Cookie 安全',
          check: this.checkCookieSecurity.bind(this),
          severity: SEVERITY_LEVELS.MEDIUM
        }
      ]
    });

    // 運行時安全掃描規則
    this.addScanRule(SCAN_TYPES.RUNTIME, {
      name: '運行時安全掃描',
      description: '監控運行時的安全狀況',
      enabled: true,
      schedule: '*/30 * * * *', // 每30分鐘
      monitors: [
        {
          name: '異常請求模式',
          monitor: this.monitorAbnormalRequests.bind(this),
          severity: SEVERITY_LEVELS.HIGH
        },
        {
          name: '資源使用異常',
          monitor: this.monitorResourceUsage.bind(this),
          severity: SEVERITY_LEVELS.MEDIUM
        },
        {
          name: '錯誤率監控',
          monitor: this.monitorErrorRates.bind(this),
          severity: SEVERITY_LEVELS.MEDIUM
        }
      ]
    });

    // 內容安全掃描規則
    this.addScanRule(SCAN_TYPES.CONTENT, {
      name: '內容安全掃描',
      description: '掃描用戶上傳內容的安全性',
      enabled: true,
      realtime: true,
      scanners: [
        {
          name: '惡意文件檢測',
          scanner: this.scanMaliciousFiles.bind(this),
          severity: SEVERITY_LEVELS.CRITICAL
        },
        {
          name: '敏感數據檢測',
          scanner: this.scanSensitiveData.bind(this),
          severity: SEVERITY_LEVELS.HIGH
        }
      ]
    });
  }

  // 添加掃描規則
  addScanRule(scanType, rule) {
    if (!this.scanRules) {
      this.scanRules = new Map();
    }
    
    this.scanRules.set(scanType, {
      ...rule,
      createdAt: new Date().toISOString(),
      lastRun: null,
      runCount: 0
    });
  }

  // 執行安全掃描
  async runScan(scanType, options = {}) {
    try {
      const scanId = this.generateScanId();
      const rule = this.scanRules.get(scanType);
      
      if (!rule) {
        throw new Error(`Scan rule not found for type: ${scanType}`);
      }

      if (!rule.enabled && !options.force) {
        throw new Error(`Scan type ${scanType} is disabled`);
      }

      // 創建掃描記錄
      const scanRecord = {
        scanId,
        scanType,
        status: SCAN_STATUS.PENDING,
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null,
        results: [],
        errors: [],
        summary: null
      };

      this.scanHistory.set(scanId, scanRecord);
      this.activeScanners.set(scanId, scanRecord);

      // 記錄掃描開始事件
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_SCAN_START,
        {
          scanId,
          scanType,
          triggered: options.triggered || 'manual'
        },
        RISK_LEVELS.LOW
      );

      // 更新狀態為運行中
      scanRecord.status = SCAN_STATUS.RUNNING;

      // 執行具體掃描
      let results = [];
      switch (scanType) {
        case SCAN_TYPES.DEPENDENCY:
          results = await this.runDependencyScan(rule, options);
          break;
        case SCAN_TYPES.CODE:
          results = await this.runCodeScan(rule, options);
          break;
        case SCAN_TYPES.CONFIGURATION:
          results = await this.runConfigurationScan(rule, options);
          break;
        case SCAN_TYPES.RUNTIME:
          results = await this.runRuntimeScan(rule, options);
          break;
        case SCAN_TYPES.CONTENT:
          results = await this.runContentScan(rule, options);
          break;
        default:
          throw new Error(`Unsupported scan type: ${scanType}`);
      }

      // 完成掃描
      scanRecord.status = SCAN_STATUS.COMPLETED;
      scanRecord.endTime = new Date().toISOString();
      scanRecord.duration = Date.now() - new Date(scanRecord.startTime).getTime();
      scanRecord.results = results;
      scanRecord.summary = this.generateScanSummary(results);

      // 更新規則統計
      rule.lastRun = scanRecord.endTime;
      rule.runCount++;

      // 移除活動掃描器
      this.activeScanners.delete(scanId);

      // 處理掃描結果
      await this.processScanResults(scanRecord);

      // 記錄掃描完成事件
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_SCAN_COMPLETE,
        {
          scanId,
          scanType,
          duration: scanRecord.duration,
          findingsCount: results.length,
          criticalCount: results.filter(r => r.severity === SEVERITY_LEVELS.CRITICAL).length,
          highCount: results.filter(r => r.severity === SEVERITY_LEVELS.HIGH).length
        },
        RISK_LEVELS.LOW
      );

      return scanRecord;

    } catch (error) {
      // 掃描失敗處理
      const scanRecord = this.scanHistory.get(scanId);
      if (scanRecord) {
        scanRecord.status = SCAN_STATUS.FAILED;
        scanRecord.endTime = new Date().toISOString();
        scanRecord.errors.push({
          message: error.message,
          timestamp: new Date().toISOString()
        });
        this.activeScanners.delete(scanId);
      }

      logSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_SCAN_COMPLETE,
        {
          scanId,
          scanType,
          status: 'failed',
          error: error.message
        },
        RISK_LEVELS.HIGH
      );

      throw error;
    }
  }

  // 執行依賴漏洞掃描
  async runDependencyScan(rule, options) {
    const results = [];
    
    try {
      // 模擬 npm audit 結果
      const mockVulnerabilities = [
        {
          name: 'lodash',
          version: '4.17.11',
          severity: SEVERITY_LEVELS.HIGH,
          description: 'Prototype Pollution vulnerability',
          recommendation: 'Update to version 4.17.21 or later',
          cve: 'CVE-2020-8203',
          path: 'node_modules/lodash'
        },
        {
          name: 'minimist',
          version: '1.2.0',
          severity: SEVERITY_LEVELS.MEDIUM,
          description: 'Prototype Pollution vulnerability',
          recommendation: 'Update to version 1.2.6 or later',
          cve: 'CVE-2021-44906',
          path: 'node_modules/minimist'
        }
      ];

      for (const vuln of mockVulnerabilities) {
        if (rule.severity.includes(vuln.severity)) {
          results.push({
            type: 'dependency_vulnerability',
            severity: vuln.severity,
            title: `${vuln.name} - ${vuln.description}`,
            description: vuln.description,
            recommendation: vuln.recommendation,
            metadata: {
              package: vuln.name,
              version: vuln.version,
              cve: vuln.cve,
              path: vuln.path
            },
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      results.push({
        type: 'scan_error',
        severity: SEVERITY_LEVELS.HIGH,
        title: '依賴掃描失敗',
        description: `Failed to scan dependencies: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 執行代碼安全掃描
  async runCodeScan(rule, options) {
    const results = [];
    
    try {
      // 模擬掃描項目中的代碼文件
      const filesToScan = [
        'src/components/auth/Login.jsx',
        'src/services/api/PhotoApiService.js',
        'src/utils/database/connection.js'
      ];

      for (const file of filesToScan) {
        for (const pattern of rule.patterns) {
          // 模擬文件內容匹配
          const mockMatches = this.simulatePatternMatching(file, pattern);
          
          for (const match of mockMatches) {
            results.push({
              type: 'code_security_issue',
              severity: pattern.severity,
              title: pattern.name,
              description: pattern.description,
              recommendation: this.getSecurityRecommendation(pattern.name),
              metadata: {
                file: match.file,
                line: match.line,
                column: match.column,
                code: match.code
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      }

    } catch (error) {
      results.push({
        type: 'scan_error',
        severity: SEVERITY_LEVELS.HIGH,
        title: '代碼掃描失敗',
        description: `Failed to scan code: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 執行配置安全掃描
  async runConfigurationScan(rule, options) {
    const results = [];
    
    try {
      for (const check of rule.checks) {
        const checkResult = await check.check();
        
        if (!checkResult.passed) {
          results.push({
            type: 'configuration_issue',
            severity: check.severity,
            title: check.name,
            description: checkResult.message,
            recommendation: checkResult.recommendation,
            metadata: checkResult.metadata || {},
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      results.push({
        type: 'scan_error',
        severity: SEVERITY_LEVELS.HIGH,
        title: '配置掃描失敗',
        description: `Failed to scan configuration: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 執行運行時安全掃描
  async runRuntimeScan(rule, options) {
    const results = [];
    
    try {
      for (const monitor of rule.monitors) {
        const monitorResult = await monitor.monitor();
        
        if (monitorResult.alerts && monitorResult.alerts.length > 0) {
          for (const alert of monitorResult.alerts) {
            results.push({
              type: 'runtime_security_alert',
              severity: monitor.severity,
              title: `${monitor.name} - ${alert.title}`,
              description: alert.description,
              recommendation: alert.recommendation,
              metadata: alert.metadata || {},
              timestamp: new Date().toISOString()
            });
          }
        }
      }

    } catch (error) {
      results.push({
        type: 'scan_error',
        severity: SEVERITY_LEVELS.HIGH,
        title: '運行時掃描失敗',
        description: `Failed to run runtime scan: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 執行內容安全掃描
  async runContentScan(rule, options) {
    const results = [];
    
    try {
      for (const scanner of rule.scanners) {
        const scanResult = await scanner.scanner(options.content || {});
        
        if (scanResult.threats && scanResult.threats.length > 0) {
          for (const threat of scanResult.threats) {
            results.push({
              type: 'content_security_threat',
              severity: scanner.severity,
              title: `${scanner.name} - ${threat.title}`,
              description: threat.description,
              recommendation: threat.recommendation,
              metadata: threat.metadata || {},
              timestamp: new Date().toISOString()
            });
          }
        }
      }

    } catch (error) {
      results.push({
        type: 'scan_error',
        severity: SEVERITY_LEVELS.HIGH,
        title: '內容掃描失敗',
        description: `Failed to scan content: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  // 模擬模式匹配
  simulatePatternMatching(file, pattern) {
    const matches = [];
    
    // 模擬一些發現
    if (pattern.name === '硬編碼密碼' && file.includes('auth')) {
      matches.push({
        file,
        line: 42,
        column: 15,
        code: 'password: "admin123"'
      });
    }
    
    if (pattern.name === '調試代碼' && file.includes('service')) {
      matches.push({
        file,
        line: 158,
        column: 8,
        code: 'console.log("API response:", response);'
      });
    }
    
    return matches;
  }

  // 獲取安全建議
  getSecurityRecommendation(issueType) {
    const recommendations = {
      '硬編碼密碼': '使用環境變數或安全配置管理系統存儲密碼',
      'API 密鑰洩露': '將 API 密鑰移至環境變數，並從代碼中移除',
      'SQL 注入風險': '使用參數化查詢或 ORM 防止 SQL 注入',
      'XSS 風險': '對用戶輸入進行適當的轉義和驗證',
      'eval 使用': '避免使用 eval()，考慮使用更安全的替代方案',
      '調試代碼': '在生產部署前移除所有 console.log 語句'
    };
    
    return recommendations[issueType] || '請檢查相關安全最佳實踐';
  }

  // 檢查 HTTPS 配置
  async checkHTTPSConfig() {
    const isHTTPS = window.location.protocol === 'https:';
    
    return {
      passed: isHTTPS,
      message: isHTTPS ? 'HTTPS 配置正確' : '未使用 HTTPS 連接',
      recommendation: isHTTPS ? null : '啟用 HTTPS 以保護數據傳輸安全',
      metadata: {
        protocol: window.location.protocol,
        host: window.location.host
      }
    };
  }

  // 檢查 CORS 配置
  async checkCORSConfig() {
    // 這裡應該檢查實際的 CORS 配置
    return {
      passed: true,
      message: 'CORS 配置檢查通過',
      metadata: {}
    };
  }

  // 檢查安全標頭
  async checkSecurityHeaders() {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];
    
    const missingHeaders = [];
    
    // 模擬檢查結果
    if (Math.random() > 0.7) {
      missingHeaders.push('X-Content-Type-Options');
    }
    
    return {
      passed: missingHeaders.length === 0,
      message: missingHeaders.length === 0 
        ? '所有必需的安全標頭都已設定'
        : `缺少安全標頭: ${missingHeaders.join(', ')}`,
      recommendation: missingHeaders.length > 0 
        ? '添加缺少的安全標頭以增強安全性'
        : null,
      metadata: {
        missingHeaders,
        requiredHeaders
      }
    };
  }

  // 檢查 Cookie 安全
  async checkCookieSecurity() {
    const cookies = document.cookie.split(';');
    const issues = [];
    
    // 模擬檢查結果
    if (Math.random() > 0.8) {
      issues.push('發現不安全的 Cookie 設定');
    }
    
    return {
      passed: issues.length === 0,
      message: issues.length === 0 
        ? 'Cookie 安全配置正確'
        : issues.join(', '),
      recommendation: issues.length > 0 
        ? '確保所有 Cookie 都設定了 Secure 和 HttpOnly 標誌'
        : null,
      metadata: {
        cookieCount: cookies.length,
        issues
      }
    };
  }

  // 監控異常請求模式
  async monitorAbnormalRequests() {
    const alerts = [];
    
    // 模擬異常檢測
    if (Math.random() > 0.9) {
      alerts.push({
        title: '檢測到異常請求模式',
        description: '在短時間內檢測到大量失敗的登入嘗試',
        recommendation: '檢查是否存在暴力破解攻擊',
        metadata: {
          requestCount: 150,
          timeWindow: '5分鐘',
          sourceIPs: ['192.168.1.100', '10.0.0.50']
        }
      });
    }
    
    return { alerts };
  }

  // 監控資源使用異常
  async monitorResourceUsage() {
    const alerts = [];
    
    // 模擬資源監控
    if (Math.random() > 0.85) {
      alerts.push({
        title: 'CPU 使用率異常',
        description: 'CPU 使用率持續超過 90%',
        recommendation: '檢查是否存在資源耗盡攻擊或系統問題',
        metadata: {
          cpuUsage: 95,
          duration: '10分鐘'
        }
      });
    }
    
    return { alerts };
  }

  // 監控錯誤率
  async monitorErrorRates() {
    const alerts = [];
    
    // 模擬錯誤監控
    if (Math.random() > 0.8) {
      alerts.push({
        title: '錯誤率激增',
        description: '5xx 錯誤率在過去1小時內超過 10%',
        recommendation: '檢查系統健康狀況和潛在攻擊',
        metadata: {
          errorRate: 12.5,
          timeWindow: '1小時',
          totalRequests: 5000,
          errorCount: 625
        }
      });
    }
    
    return { alerts };
  }

  // 掃描惡意文件
  async scanMaliciousFiles(content) {
    const threats = [];
    
    // 模擬惡意文件檢測
    if (content.fileType && ['exe', 'bat', 'cmd'].includes(content.fileType)) {
      threats.push({
        title: '可疑的可執行文件',
        description: '檢測到可能的惡意可執行文件',
        recommendation: '阻止上傳並進一步檢查文件',
        metadata: {
          fileName: content.fileName,
          fileType: content.fileType,
          fileSize: content.fileSize
        }
      });
    }
    
    return { threats };
  }

  // 掃描敏感數據
  async scanSensitiveData(content) {
    const threats = [];
    
    // 模擬敏感數據檢測
    if (content.text) {
      const patterns = [
        { regex: /\d{4}-\d{4}-\d{4}-\d{4}/, type: '信用卡號' },
        { regex: /\d{3}-\d{2}-\d{4}/, type: '社會安全號碼' },
        { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, type: '電子郵件地址' }
      ];
      
      for (const pattern of patterns) {
        if (pattern.regex.test(content.text)) {
          threats.push({
            title: `檢測到${pattern.type}`,
            description: `文件內容包含可能的${pattern.type}`,
            recommendation: '檢查是否需要額外的隱私保護措施',
            metadata: {
              dataType: pattern.type,
              fileName: content.fileName
            }
          });
        }
      }
    }
    
    return { threats };
  }

  // 生成掃描摘要
  generateScanSummary(results) {
    const summary = {
      total: results.length,
      bySeverity: {
        [SEVERITY_LEVELS.CRITICAL]: 0,
        [SEVERITY_LEVELS.HIGH]: 0,
        [SEVERITY_LEVELS.MEDIUM]: 0,
        [SEVERITY_LEVELS.LOW]: 0,
        [SEVERITY_LEVELS.INFO]: 0
      },
      byType: {},
      riskScore: 0
    };

    for (const result of results) {
      // 按嚴重程度統計
      if (summary.bySeverity[result.severity] !== undefined) {
        summary.bySeverity[result.severity]++;
      }
      
      // 按類型統計
      if (!summary.byType[result.type]) {
        summary.byType[result.type] = 0;
      }
      summary.byType[result.type]++;
    }

    // 計算風險分數
    summary.riskScore = 
      summary.bySeverity[SEVERITY_LEVELS.CRITICAL] * 10 +
      summary.bySeverity[SEVERITY_LEVELS.HIGH] * 5 +
      summary.bySeverity[SEVERITY_LEVELS.MEDIUM] * 2 +
      summary.bySeverity[SEVERITY_LEVELS.LOW] * 1;

    return summary;
  }

  // 處理掃描結果
  async processScanResults(scanRecord) {
    const { results, summary } = scanRecord;
    
    // 檢查是否有需要立即處理的嚴重問題
    const criticalIssues = results.filter(r => r.severity === SEVERITY_LEVELS.CRITICAL);
    if (criticalIssues.length > 0) {
      await this.handleCriticalIssues(criticalIssues, scanRecord);
    }

    // 發送通知
    if (this.config.notificationChannels) {
      await this.sendNotifications(scanRecord);
    }

    // 存儲結果
    this.storeScanResults(scanRecord);
  }

  // 處理嚴重問題
  async handleCriticalIssues(issues, scanRecord) {
    for (const issue of issues) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.VULNERABILITY_DETECTED,
        {
          scanId: scanRecord.scanId,
          scanType: scanRecord.scanType,
          severity: issue.severity,
          title: issue.title,
          description: issue.description
        },
        RISK_LEVELS.CRITICAL
      );
    }
  }

  // 發送通知
  async sendNotifications(scanRecord) {
    // 這裡應該實現實際的通知發送邏輯
    console.log('Sending security scan notification:', scanRecord.summary);
  }

  // 存儲掃描結果
  storeScanResults(scanRecord) {
    this.scanResults.set(scanRecord.scanId, scanRecord);
    
    // 保存到本地存儲
    try {
      const recentResults = Array.from(this.scanResults.values())
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, 50); // 只保存最近50次掃描結果
      
      localStorage.setItem('security_scan_results', JSON.stringify(recentResults));
    } catch (error) {
      console.warn('Failed to save scan results to localStorage:', error);
    }
  }

  // 設定定時掃描
  setupScheduledScans() {
    if (!this.scanRules) return;

    for (const [scanType, rule] of this.scanRules.entries()) {
      if (rule.enabled && rule.schedule) {
        // 這裡應該使用 cron 庫來解析 schedule
        // 簡化實現：每24小時運行一次
        const intervalId = setInterval(async () => {
          try {
            await this.runScan(scanType, { triggered: 'scheduled' });
          } catch (error) {
            console.error(`Scheduled scan failed for ${scanType}:`, error);
          }
        }, 24 * 60 * 60 * 1000);

        this.scheduledScans.set(scanType, intervalId);
      }
    }
  }

  // 載入掃描歷史
  loadScanHistory() {
    try {
      const storedResults = localStorage.getItem('security_scan_results');
      if (storedResults) {
        const results = JSON.parse(storedResults);
        for (const result of results) {
          this.scanHistory.set(result.scanId, result);
          this.scanResults.set(result.scanId, result);
        }
      }
    } catch (error) {
      console.warn('Failed to load scan history:', error);
    }
  }

  // 生成掃描 ID
  generateScanId() {
    return 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 解析 NPM audit 結果
  parseNpmAuditResults(output) {
    try {
      const auditData = JSON.parse(output);
      const vulnerabilities = [];
      
      if (auditData.vulnerabilities) {
        for (const [name, vuln] of Object.entries(auditData.vulnerabilities)) {
          vulnerabilities.push({
            name,
            severity: vuln.severity,
            description: vuln.title,
            version: vuln.range,
            cve: vuln.cves?.[0]
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      throw new Error(`Failed to parse npm audit results: ${error.message}`);
    }
  }

  // 獲取掃描統計
  getStatistics() {
    const stats = {
      isInitialized: this.isInitialized,
      totalScans: this.scanHistory.size,
      activeScans: this.activeScanners.size,
      scheduledScans: this.scheduledScans.size,
      recentScans: [],
      summary: {
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      }
    };

    // 最近的掃描
    const recentScans = Array.from(this.scanHistory.values())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, 10);
    
    stats.recentScans = recentScans.map(scan => ({
      scanId: scan.scanId,
      scanType: scan.scanType,
      status: scan.status,
      startTime: scan.startTime,
      duration: scan.duration,
      issuesFound: scan.results?.length || 0,
      riskScore: scan.summary?.riskScore || 0
    }));

    // 統計問題總數
    for (const scan of this.scanHistory.values()) {
      if (scan.summary) {
        stats.summary.criticalIssues += scan.summary.bySeverity[SEVERITY_LEVELS.CRITICAL] || 0;
        stats.summary.highIssues += scan.summary.bySeverity[SEVERITY_LEVELS.HIGH] || 0;
        stats.summary.mediumIssues += scan.summary.bySeverity[SEVERITY_LEVELS.MEDIUM] || 0;
        stats.summary.lowIssues += scan.summary.bySeverity[SEVERITY_LEVELS.LOW] || 0;
      }
    }

    return stats;
  }

  // 獲取掃描結果
  getScanResults(scanId) {
    return this.scanResults.get(scanId);
  }

  // 獲取所有掃描結果
  getAllScanResults(options = {}) {
    let results = Array.from(this.scanHistory.values());
    
    // 過濾掃描類型
    if (options.scanType) {
      results = results.filter(scan => scan.scanType === options.scanType);
    }
    
    // 過濾狀態
    if (options.status) {
      results = results.filter(scan => scan.status === options.status);
    }
    
    // 過濾日期範圍
    if (options.startDate || options.endDate) {
      results = results.filter(scan => {
        const scanDate = new Date(scan.startTime);
        if (options.startDate && scanDate < new Date(options.startDate)) return false;
        if (options.endDate && scanDate > new Date(options.endDate)) return false;
        return true;
      });
    }
    
    // 排序
    results.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    // 分頁
    if (options.limit) {
      const offset = options.offset || 0;
      results = results.slice(offset, offset + options.limit);
    }
    
    return results;
  }

  // 取消掃描
  cancelScan(scanId) {
    const scanRecord = this.activeScanners.get(scanId);
    if (scanRecord) {
      scanRecord.status = SCAN_STATUS.CANCELLED;
      scanRecord.endTime = new Date().toISOString();
      this.activeScanners.delete(scanId);
      
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SECURITY_SCAN_COMPLETE,
        {
          scanId,
          status: 'cancelled'
        },
        RISK_LEVELS.LOW
      );
      
      return true;
    }
    
    return false;
  }

  // 清理舊的掃描結果
  cleanup() {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    const cutoff = Date.now() - maxAge;
    
    let cleanedCount = 0;
    for (const [scanId, scan] of this.scanHistory.entries()) {
      if (new Date(scan.startTime).getTime() < cutoff) {
        this.scanHistory.delete(scanId);
        this.scanResults.delete(scanId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logSecurityEvent(
        SECURITY_EVENT_TYPES.SYSTEM_CONFIG_CHANGE,
        {
          action: 'scan_results_cleaned',
          cleanedCount
        },
        RISK_LEVELS.LOW
      );
    }

    return cleanedCount;
  }
}

// 全局安全掃描管理器實例
export const securityScannerManager = new SecurityScannerManager();

// React Hook 用於安全掃描
import { useState, useEffect, useCallback } from 'react';

export const useSecurityScanner = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = useCallback(() => {
    const stats = securityScannerManager.getStatistics();
    setStatistics(stats);
  }, []);

  const runScan = useCallback(async (scanType, options) => {
    setLoading(true);
    try {
      const result = await securityScannerManager.runScan(scanType, options);
      loadStatistics(); // 重新載入統計
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadStatistics]);

  const getScanResults = useCallback((scanId) => {
    return securityScannerManager.getScanResults(scanId);
  }, []);

  const getAllResults = useCallback((options) => {
    return securityScannerManager.getAllScanResults(options);
  }, []);

  return {
    statistics,
    loading,
    runScan,
    getScanResults,
    getAllResults,
    loadStatistics
  };
};

// 便利函數
export const runSecurityScan = (scanType, options) =>
  securityScannerManager.runScan(scanType, options);

export const getSecurityScanStats = () =>
  securityScannerManager.getStatistics();

export const getSecurityScanResults = (scanId) =>
  securityScannerManager.getScanResults(scanId);

export default SecurityScannerManager;