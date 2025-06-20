#!/usr/bin/env node
// Replit 健康檢查腳本

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { promises as fs } from 'fs';

// 顏色代碼
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 檢查端口是否開啟
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, '0.0.0.0', () => {
      server.close(() => {
        resolve(false); // 端口可用
      });
    });
    
    server.on('error', () => {
      resolve(true); // 端口被占用
    });
  });
}

// 檢查 HTTP 端點
function checkEndpoint(url, timeout = 5000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request(url, { timeout }, (res) => {
      resolve({
        success: true,
        status: res.statusCode,
        message: `HTTP ${res.statusCode}`
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

// 檢查環境變數
function checkEnvironment() {
  log(colors.blue, '\n🔍 檢查環境配置...');
  
  const requiredEnvVars = [
    'REPL_SLUG',
    'REPL_OWNER',
    'NODE_ENV'
  ];
  
  const optionalEnvVars = [
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_FACEBOOK_APP_ID',
    'VITE_API_BASE_URL'
  ];
  
  let allRequired = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(colors.green, `✅ ${envVar}: ${process.env[envVar]}`);
    } else {
      log(colors.red, `❌ ${envVar}: 未設定`);
      allRequired = false;
    }
  }
  
  log(colors.blue, '\n📋 可選環境變數:');
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      log(colors.green, `✅ ${envVar}: ${process.env[envVar].substring(0, 20)}...`);
    } else {
      log(colors.yellow, `⚠️  ${envVar}: 未設定 (可選)`);
    }
  }
  
  return allRequired;
}

// 檢查 Node.js 依賴
async function checkDependencies() {
  log(colors.blue, '\n📦 檢查依賴...');
  
  try {
    // 檢查 package.json
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    log(colors.green, `✅ package.json 讀取成功`);
    log(colors.blue, `   項目: ${packageJson.name} v${packageJson.version}`);
    
    // 檢查 node_modules
    try {
      await fs.access('node_modules');
      log(colors.green, `✅ node_modules 存在`);
    } catch {
      log(colors.red, `❌ node_modules 不存在`);
      return false;
    }
    
    // 檢查關鍵依賴 - 改用文件系統檢查
    const criticalDeps = ['react', 'vite', '@vitejs/plugin-react'];
    for (const dep of criticalDeps) {
      try {
        const depPath = `node_modules/${dep}`;
        await fs.access(depPath);
        log(colors.green, `✅ ${dep} 可用`);
      } catch {
        log(colors.red, `❌ ${dep} 無法找到`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ 檢查依賴失敗: ${error.message}`);
    return false;
  }
}

// 主要健康檢查函數
async function healthCheck() {
  log(colors.green, '🏥 Photo Migration System - Replit 健康檢查');
  log(colors.blue, '================================================\n');
  
  // 檢查環境
  const envOk = checkEnvironment();
  
  // 檢查依賴
  const depsOk = await checkDependencies();
  
  // 檢查端口
  log(colors.blue, '\n🌐 檢查網路...');
  const port = process.env.PORT || 3000;
  const portInUse = await checkPort(port);
  
  if (portInUse) {
    log(colors.yellow, `⚠️  端口 ${port} 已被占用`);
  } else {
    log(colors.green, `✅ 端口 ${port} 可用`);
  }
  
  // 生成 Replit URL
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  
  if (replSlug && replOwner) {
    const replUrl = `https://${replSlug}.${replOwner}.repl.co`;
    log(colors.blue, `🔗 Repl URL: ${replUrl}`);
    
    // 如果應用正在運行，嘗試檢查端點
    if (portInUse) {
      log(colors.blue, '\n🌐 檢查應用端點...');
      const healthResult = await checkEndpoint(replUrl);
      
      if (healthResult.success) {
        log(colors.green, `✅ 應用響應: ${healthResult.message}`);
      } else {
        log(colors.yellow, `⚠️  應用無響應: ${healthResult.error}`);
      }
    }
  }
  
  // 總結
  log(colors.blue, '\n📊 健康檢查總結:');
  log(envOk ? colors.green : colors.red, `環境配置: ${envOk ? '✅ 通過' : '❌ 失敗'}`);
  log(depsOk ? colors.green : colors.red, `依賴檢查: ${depsOk ? '✅ 通過' : '❌ 失敗'}`);
  
  if (envOk && depsOk) {
    log(colors.green, '\n🎉 系統健康狀況良好！可以正常運行。');
    
    if (!portInUse) {
      log(colors.blue, '\n💡 要啟動應用，請運行: npm run repl:dev');
    }
    
    process.exit(0);
  } else {
    log(colors.red, '\n❌ 發現問題，請檢查上述錯誤。');
    process.exit(1);
  }
}

// 運行健康檢查
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;

if (isMainModule) {
  healthCheck().catch((error) => {
    log(colors.red, `💥 健康檢查失敗: ${error.message}`);
    process.exit(1);
  });
}

export { healthCheck, checkPort, checkEndpoint };