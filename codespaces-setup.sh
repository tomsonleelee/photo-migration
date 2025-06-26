#!/bin/bash

# GitHub Codespaces 設定腳本
echo "🚀 設定 GitHub Codespaces 環境..."

# 檢查是否在 Codespaces 環境中
if [ -n "$CODESPACE_NAME" ]; then
    echo "✅ 偵測到 GitHub Codespaces 環境: $CODESPACE_NAME"
    
    # 複製 Codespaces 專用環境檔案
    if [ -f ".env.codespaces" ]; then
        echo "📄 複製 Codespaces 環境配置..."
        cp .env.codespaces .env.local
        
        # 替換動態 URL
        sed -i "s/\${CODESPACE_NAME}/$CODESPACE_NAME/g" .env.local
        echo "✅ 環境檔案已設定完成"
    fi
    
    # 設定 Git 配置（如果需要）
    if [ -z "$(git config --global user.email)" ]; then
        echo "⚙️  設定 Git 配置..."
        git config --global user.email "codespaces@github.com"
        git config --global user.name "GitHub Codespaces"
    fi
    
    # 檢查必要的環境變數
    echo "🔍 檢查環境變數..."
    
    if [ -z "$VITE_GOOGLE_CLIENT_ID" ]; then
        echo "⚠️  請設定 VITE_GOOGLE_CLIENT_ID 環境變數"
    fi
    
    # 顯示可用的 URL
    echo ""
    echo "🌐 您的應用程式 URL:"
    echo "   前端: https://$CODESPACE_NAME-3000.app.github.dev"
    echo "   WebSocket: wss://$CODESPACE_NAME-3001.app.github.dev"
    echo ""
    
    # 安裝依賴（如果還沒安裝）
    if [ ! -d "node_modules" ]; then
        echo "📦 安裝 NPM 依賴..."
        npm install
    fi
    
    echo "✅ GitHub Codespaces 設定完成！"
    echo ""
    echo "🚀 啟動命令："
    echo "   npm run codespaces:dev    # 開發模式"
    echo "   npm run codespaces:build  # 建置並預覽"
    echo ""
    
else
    echo "❌ 此腳本只能在 GitHub Codespaces 環境中運行"
    exit 1
fi