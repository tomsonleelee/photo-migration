#!/bin/bash

# Replit 自動運行腳本
echo "🚀 啟動 Photo Migration System..."

# 檢查是否存在 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴..."
    npm install
fi

# 檢查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "⚙️  複製環境變數範例..."
    cp env.example .env
    echo "請在 Secrets 標籤中設定您的 API 金鑰"
fi

# 啟動開發服務器
echo "🌟 啟動開發服務器..."
npm run repl:dev 