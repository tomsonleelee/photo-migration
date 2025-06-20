# 使用官方 Node.js 20 Alpine 映像作為基礎
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm（可選，用於更快的包管理）
RUN npm install -g pnpm

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製應用程式碼
COPY . .

# 創建 .env 文件（如果不存在）
RUN if [ ! -f ".env" ]; then cp env.example .env; fi

# 構建應用
RUN npm run build

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 設定健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S photoapp -u 1001

# 更改文件擁有者
RUN chown -R photoapp:nodejs /app
USER photoapp

# 啟動命令
CMD ["npm", "run", "preview"] 