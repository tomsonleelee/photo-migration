#!/bin/bash

# Replit 自動運行腳本
echo "🚀 啟動 Photo Migration System..."

# 設定錯誤處理
set -e

# 檢查 Node.js 版本
echo "📋 檢查 Node.js 版本..."
node --version
npm --version

# 清理舊的進程（如果存在）
pkill -f "vite" || true

# 檢查是否存在 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴..."
    npm ci --prefer-offline --no-audit --progress=false
fi

# 檢查依賴完整性
echo "🔍 檢查依賴完整性..."
if ! npm ls >/dev/null 2>&1; then
    echo "⚠️  依賴不完整，重新安裝..."
    rm -rf node_modules package-lock.json
    npm install
fi

# 檢查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "⚙️  複製環境變數範例..."
    cp env.example .env
    echo "✨ 請在 Secrets 標籤中設定您的 API 金鑰"
fi

# 設定 Replit 特定的環境變數
export HOST=0.0.0.0
export PORT=${PORT:-3000}

# 檢查端口是否可用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  端口 $PORT 已被占用，嘗試清理..."
    pkill -f ":$PORT" || true
    sleep 2
fi

# 啟動開發服務器
echo "🌟 啟動開發服務器在端口 $PORT..."
echo "🔗 應用將在 https://$REPL_SLUG.$REPL_OWNER.repl.co 可訪問"

# 執行開發命令
exec npm run repl:dev 