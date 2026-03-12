# EchoAI Modern

> 一个面向真实业务场景的多模式 AI 工作台（对话 / 文案 / 视频脚本 / 角色扮演 / 学习训练 / 绘图）

EchoAI Modern 基于 **Next.js App Router** 构建，提供统一会话系统与设置中心，支持 OpenAI 兼容 API，强调「可用性 + 结构化工作流 + 本地可部署」。

---

## ✨ 核心能力

- **多模式会话工作区**
  - 通用对话（Chat）
  - 文案生成（Copywriting）
  - 视频脚本（Video Script，支持预设注入）
  - 角色扮演（Roleplay，角色卡 + 世界观）
  - 学习型聊天（Training，自适应出题与评分）
  - 专业绘图（Pro Image）

- **完整会话管理**
  - 新建 / 切换 / 搜索 / 置顶 / 重命名 / 删除
  - 导出消息内容
  - 重新生成与重试机制

- **统一设置中心**
  - OpenAI 兼容 `Base URL` / `API Key`
  - 模型拉取与默认模型设置
  - 参数配置（temperature / max tokens / stream）
  - WebDAV 配置入口

- **现代化交互体验**
  - 响应式布局（桌面三栏、移动侧滑）
  - 深色 / 浅色主题切换
  - Markdown 消息渲染

---

## 🧱 技术栈

- **框架**：Next.js 14（App Router） + React 18 + TypeScript
- **样式**：Tailwind CSS + Radix UI（shadcn/ui 风格）
- **状态管理**：Zustand（含本地持久化）
- **表单与校验**：React Hook Form + Zod
- **动效与图标**：Framer Motion + Lucide React

---

## 📁 项目结构

```text
app/
  page.tsx                          # 主入口
components/
  layout/workspace.tsx              # 工作区布局（侧栏 + 主区）
  chat/chat-list.tsx                # 会话列表
  chat/message-list.tsx             # 消息流
  chat/chat-composer.tsx            # 输入区（含视频脚本预设）
  chat/roleplay-studio.tsx          # 角色扮演面板
  image/pro-image-panel.tsx         # 绘图面板
  settings/settings-center.tsx      # 设置中心
stores/
  chat-store.ts                     # 会话/消息/训练逻辑
  settings-store.ts                 # 模型与连接配置
  roleplay-store.ts                 # 角色卡与世界观
  ui-store.ts                       # UI 状态
lib/
  types.ts
```

---

## 🚀 本地开发（前端）

```bash
npm install
npm run dev
```

默认访问：
- http://localhost:3000/

---

## 🧩 可选：安全代理服务器（server/）

仓库内包含一个 **可选的 Express 安全代理服务**（目录：`server/`），提供：

- 用户认证（JWT）/“访客”模式
- IP/用户级别的速率限制、防刷与黑名单
- Token 消耗监控与预警
- 统一转发 OpenAI 兼容接口（例如 `/api/chat`、`/api/models`）

### 什么时候需要它？

- 你不希望把 **上游 API Key 暴露在浏览器本地存储**里
- 你想做多用户限流/审计/预警
- 你需要一个后端来统一做 provider 转发

> 如果你只做单机本地使用：也可以直接用前端设置里的 Base URL + API Key（API Key 仅在本地存储）。

### 启动 server

```bash
cd server
npm install
npm run start
```

默认端口：`3001`（可通过环境变量 `PORT` 修改）。

### server 环境变量

建议使用 `.env`（示例见 `.env.example`）：

- `PORT`：服务端口（默认 3001）
- `JWT_SECRET`：JWT 签名密钥（不填会随机生成，重启会导致旧 token 失效）
- `API_URL`：上游 OpenAI 兼容接口（默认：`https://ai.shuaihong.fun/v1/chat/completions`）
- `API_KEY`：上游 API Key（当客户端未传 `X-Custom-Api-Key` 时使用）
- `ALLOWED_ORIGINS`：CORS 允许的来源（逗号分隔）
- `ADMIN_KEY`：访问管理接口（alerts/blacklist/stats）的管理密钥

### 与前端如何配合？

当使用 server 作为转发层时：

- 前端 `Base URL` 填：`http://localhost:3001`（或你的 server 域名）
- 前端 API Key 建议不直接填上游 key，而是使用 server 的认证方式（或在 server 端配置 `API_KEY`）

> 注：当前前端默认按 OpenAI 兼容 `/v1/...` 组织请求；如果要完全切换到 server 的 `/api/...` 路由，建议在前端增加一个“Proxy Mode”开关或适配器（后续可做）。

---

## 📦 生产构建（前端）

```bash
npm run build
npm run start
```

> `start` 脚本已支持平台注入端口：`PORT=${PORT:-3000}`。

---

## 🐳 Docker 部署（前端）

```bash
docker compose up --build -d
```

默认访问：
- http://localhost:3001/

---

## 🧭 常见问题

### 1) 页面可打开但模型请求失败
请优先检查：

- Base URL 是否包含正确的 `/v1` 路径（系统会自动规范化）
- API Key 是否有效
- 所选模型是否在服务端可用

### 2) 部署后 502 / 无响应
确认进程监听的是平台注入端口（本项目已在 `start` 脚本兼容）。

### 3) 构建失败
建议顺序：

```bash
npm install
npm run build
```

---

## 📌 路线建议（可选）

- 会话云同步（WebDAV 完整链路）
- 多提供商统一抽象（OpenAI / Claude / Gemini）
- 更细粒度的 Prompt 模板系统
- 更完整的可观测性（请求耗时、错误率、模型成本）

---

如果这个项目对你有帮助，欢迎 Star ⭐
