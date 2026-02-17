# EchoAI - 安全 AI 对话系统

<div align="center">

一个开箱即用、支持**多会话**与**安全代理**的 AI 对话项目。  
面向个人部署与团队内部使用，兼顾体验、性能与安全。

</div>

## ✨ 项目亮点

- 🔐 **安全优先**：支持后端代理、JWT 鉴权、用户级限流与 Token 监控。
- 💬 **对话体验完整**：多会话管理、流式输出、Markdown 渲染、代码高亮。
- ⚙️ **部署灵活**：既可直接前端体验，也可后端代理用于生产环境。
- 🧩 **配置友好**：环境变量清晰，便于接入自定义 API 网关与模型服务。

## 🚀 快速开始

### 方案 A：纯前端体验（开发/演示）

1. 直接打开 `index.html`。
2. 在页面设置中填写可用的 API Key。

> 说明：该方式适合快速体验，不建议在公开生产环境中直接暴露密钥。

### 方案 B：安全代理模式（推荐）

```bash
# 1) 进入后端目录
cd server

# 2) 安装依赖
npm install

# 3) 创建配置文件
cp .env.example .env

# 4) 启动服务
npm start
```

默认启动端口为 `3001`（可通过 `PORT` 覆盖）。

## 📁 项目结构

```text
EchoAI/
├── index.html          # 主页面
├── style.css           # 样式
├── utils.js            # 前端逻辑/工具
├── README.md           # 项目说明
└── server/             # 安全代理服务
    ├── index.js        # 服务器入口
    ├── package.json    # 依赖与脚本
    └── .env.example    # 环境变量模板
```

## 🔒 安全能力

### 前端侧

- CSP 内容安全策略
- DOMPurify XSS 清理
- 输入验证（长度/格式）
- 客户端节流与频率限制

### 后端侧（推荐启用）

- API Key 仅保存在服务端环境变量
- JWT 用户身份认证
- 用户级请求限速（默认 20 req/min）
- Token 额度控制（分钟/天）
- 异常消耗预警与记录
- 支持 HTTPS 反向代理部署

## 🧠 核心功能

- 多会话管理与快速切换
- 流式响应（打字机效果）
- Markdown + 代码高亮
- 消息复制 / 删除 / 重新生成
- 系统提示词（System Prompt）设置
- 模型选择、温度、上下文、最大 Token 调整
- AI 自动生成会话标题

## 🛠️ 后端 API（摘要）

### 认证

```http
POST /api/auth/login
```

### 对话

```http
POST /api/chat
Authorization: Bearer <token>
```

### 模型列表

```http
GET /api/models
Authorization: Bearer <token>
```

### 使用统计

```http
GET /api/usage
Authorization: Bearer <token>
```

### 管理告警

```http
GET /api/admin/alerts
X-Admin-Key: <admin_key>
```

## ⚙️ 环境变量

| 变量名 | 必填 | 说明 |
|---|---|---|
| `API_KEY` | ✅ | AI 服务密钥 |
| `API_URL` | ❌ | API 地址（默认已配置） |
| `JWT_SECRET` | ❌ | JWT 密钥（建议生产环境手动设置） |
| `ADMIN_KEY` | ❌ | 管理接口密钥 |
| `PORT` | ❌ | 服务端口（默认 `3001`） |
| `ALLOWED_ORIGINS` | ❌ | CORS 白名单域名 |

## 📊 Token 预警阈值（默认）

| 类型 | 阈值 | 说明 |
|---|---|---|
| 单次请求 | 10,000 tokens | 超过即触发告警 |
| 每分钟 | 30,000 tokens | 超过即触发告警 |
| 每天 | 300,000 tokens | 超过即触发告警 |

## 🌐 生产部署建议

- 使用 PM2 托管 Node 进程。
- 通过 Nginx / Caddy 做 HTTPS 终端与反向代理。
- 限制 `ALLOWED_ORIGINS`，避免任意来源调用。
- 生产环境务必重置 `JWT_SECRET` 与 `ADMIN_KEY`。

## 📄 许可证

本项目采用 **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** 许可证：

- ✅ 允许学习、修改与非商业使用
- ❌ 不允许未经授权的商业使用

详细条款请查看仓库根目录的 [LICENSE](./LICENSE)。

## 🔗 项目地址

- GitHub: https://github.com/tempppw01/EchoAI

---

**WeChat:** Ethan_BravoEcho
