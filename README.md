# 帅红AI - 安全 AI 对话系统

一个功能完整的 AI 对话网站，支持多会话管理、流式输出、安全代理等功能。

## 🚀 快速开始

### 方式一：纯前端模式（快速体验）

直接打开 `index.html` 即可使用（需要在设置中配置自己的 API Key）。

### 方式二：安全模式（推荐生产环境）

使用后端代理服务器，实现 API 密钥安全存储、用户认证、速率限制等功能。

```bash
# 1. 进入服务器目录
cd server

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写你的 API_KEY 等配置

# 4. 启动服务器
npm start
```

## 🔒 安全特性

### 前端安全
- **CSP 内容安全策略**：限制脚本和资源来源
- **XSS 防护**：使用 DOMPurify 清理 HTML
- **输入验证**：长度限制和格式检查
- **客户端速率限制**：防止频繁请求

### 后端安全（推荐）
- **API 密钥隔离**：密钥存储在服务器环境变量，不暴露给前端
- **JWT 用户认证**：每个用户独立身份识别
- **用户级速率限制**：每用户 20 请求/分钟
- **Token 使用限制**：50,000 tokens/分钟，500,000 tokens/天
- **异常消耗预警**：自动检测和记录异常使用
- **HTTPS 加密传输**：生产环境建议配置 SSL

## 📁 项目结构

```
ai-chat-demo/
├── index.html          # 主页面
├── style.css           # 样式文件
├── utils.js            # 工具函数库
├── README.md           # 项目文档
└── server/             # 后端代理服务器
    ├── index.js        # 服务器主文件
    ├── package.json    # 依赖配置
    └── .env.example    # 环境变量模板
```

## 🛡️ 后端 API 接口

### 认证
```
POST /api/auth/login
Body: { "deviceId": "可选的设备ID" }
Response: { "success": true, "userId": "...", "token": "JWT..." }
```

### 对话
```
POST /api/chat
Headers: { "Authorization": "Bearer <token>" }
Body: { "messages": [...], "model": "deepseek-v3.2", "stream": true }
```

### 模型列表
```
GET /api/models
Headers: { "Authorization": "Bearer <token>" }
```

### 使用统计
```
GET /api/usage
Headers: { "Authorization": "Bearer <token>" }
Response: { "usage": { "minute": {...}, "day": {...} } }
```

### 管理端点
```
GET /api/admin/alerts
Headers: { "X-Admin-Key": "<admin_key>" }
```

## ⚙️ 环境变量配置

| 变量 | 必填 | 描述 |
|------|------|------|
| `API_KEY` | ✅ | AI API 密钥 |
| `API_URL` | ❌ | API 地址（默认已配置） |
| `JWT_SECRET` | ❌ | JWT 密钥（自动生成） |
| `ADMIN_KEY` | ❌ | 管理员密钥 |
| `PORT` | ❌ | 服务器端口（默认 3001） |
| `ALLOWED_ORIGINS` | ❌ | CORS 允许的域名 |

## 🎯 功能特性

### 对话功能
- ✅ 多会话管理
- ✅ 流式输出（打字机效果）
- ✅ Markdown 渲染
- ✅ 代码高亮
- ✅ 消息复制/删除/重新生成
- ✅ 系统提示词设置
- ✅ AI 自动生成标题

### 设置功能
- ✅ 模型选择
- ✅ 温度调节
- ✅ 上下文数量控制
- ✅ 最大 Token 限制
- ✅ 流式开关

### 安全功能
- ✅ XSS 防护
- ✅ CSP 策略
- ✅ 速率限制
- ✅ Token 使用监控
- ✅ 异常预警

## 📊 Token 预警阈值

| 类型 | 阈值 | 说明 |
|------|------|------|
| 单次请求 | 10,000 tokens | 单个请求超过此值触发预警 |
| 每分钟 | 30,000 tokens | 分钟使用量超过此值触发预警 |
| 每天 | 300,000 tokens | 日使用量超过此值触发预警 |

## 🔧 生产环境部署

### 使用 PM2 管理进程
```bash
npm install -g pm2
pm2 start index.js --name shuaihong-ai
pm2 save
pm2 startup
```

### 配置 Nginx 反向代理
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /path/to/ai-chat-demo;
        index index.html;
    }
}
```

## 📝 更新日志

### v0.03 (安全增强版)
- 🔒 新增后端安全代理服务器
- 🔒 API 密钥服务器端存储
- 🔒 JWT 用户认证
- 🔒 用户级别速率限制
- 🔒 Token 使用监控和预警
- 🔒 CSP 内容安全策略
- 🔒 XSS 防护 (DOMPurify)

### v0.02
- ✨ 消息操作（重新生成、删除、复制）
- ⏳ 加载动画
- 🛠️ 移动端适配优化

### v0.01
- 🎉 初始版本发布

## 📄 许可证

MIT License

---

**WeChat:** Ethan_BravoEcho
