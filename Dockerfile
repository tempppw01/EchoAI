# syntax=docker/dockerfile:1

# 单镜像：同时包含前端静态文件 + Node 后端代理（server/）
FROM node:20-alpine

WORKDIR /app

# 仅拷贝后端依赖清单以利用缓存
COPY server/package.json server/package-lock.json* ./server/

# 安装生产依赖（如果没有 lock 文件，npm 会退化为普通 install）
RUN cd server \
  && if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# 拷贝完整项目（包含 index.html/style.css/utils.js 以及 server/ 源码）
COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
