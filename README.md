# EchoAI

> 一个面向真实业务场景的多模式 AI 工作台，覆盖对话、文案、视频脚本、角色扮演、学习训练与绘图等核心场景。

EchoAI 基于 **Next.js 14 App Router** 构建，提供统一会话系统、统一设置中心与结构化工作流能力，支持接入 OpenAI 兼容接口，适合本地部署、私有化使用与业务场景扩展。

---

## 核心能力

### 1. 多模式工作区

- 通用对话：适合日常问答与任务协作
- 文案生成：适合营销文案、口播文案、广告文案等场景
- 视频脚本：支持视频脚本预设、结构化脚本生成、爆款文案分析
- 角色扮演：支持角色卡与世界观设定
- 学习训练：支持连续出题、答题反馈与分数跟踪
- 专业绘图：支持图像生成相关工作流

### 2. 统一会话管理

- 新建、切换、搜索、删除会话
- 导出会话内容
- 重新生成与重试
- 多模块统一组织，不同工作区可独立使用

### 3. 统一设置中心

- Base URL / API Key 配置
- 默认模型与模型列表管理
- temperature / max tokens / stream 等参数调整
- WebDAV 配置入口

### 4. 结构化交互体验

- 深色 / 浅色主题切换
- 响应式布局
- Markdown 消息渲染
- 视频脚本结果结构化展示
- 工作区式布局，更适合持续任务处理

---

## 当前适合的使用场景

EchoAI 目前更适合作为一个 **多场景 AI 工作台**，而不是单一聊天窗口。

适合的典型场景包括：

- 日常 AI 协作与问答
- 中文文案生成与优化
- 短视频脚本策划
- 爆款文案拆解与结构提取
- 学习训练与题目陪练
- 角色扮演与设定式对话

---

## 技术栈

- **框架**：Next.js 14 + React 18 + TypeScript
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **表单与校验**：React Hook Form + Zod
- **动效与图标**：Framer Motion + Lucide React
- **消息渲染**：React Markdown

---

## 项目结构

```text
app/
  page.tsx
components/
  layout/workspace.tsx
  chat/chat-list.tsx
  chat/message-list.tsx
  chat/chat-composer.tsx
  chat/roleplay-studio.tsx
  image/pro-image-panel.tsx
  settings/settings-center.tsx
stores/
  chat-store.ts
  settings-store.ts
  roleplay-store.ts
  ui-store.ts
lib/
  types.ts
  openai-compatible.ts
server/
  index.js
```

---

## 本地开发

```bash
npm install
npm run dev
```

默认访问：

- http://localhost:3000

---

## 测试与构建

### 单元测试

```bash
npm test
```

### 生产构建

```bash
npm run build
npm run start
```

---

## 可选后端代理（server/）

仓库中包含一个可选的代理服务（`server/`），用于补充更适合业务环境的服务端能力，例如：

- 用户认证
- 限流与风控
- 日志与预警
- OpenAI 兼容接口统一转发

如果你只是本地单人使用，可以直接在前端配置 Base URL 与 API Key。
如果你希望更安全、可控、多用户协作，建议增加 server 层。

### 启动 server

```bash
cd server
npm install
npm run start
```

---

## 部署方式

### 前端生产部署

```bash
npm run build
npm run start
```

### Docker 部署

```bash
docker compose up --build -d
```

---

## 常见问题

### 1. 页面能打开，但模型请求失败

优先检查：

- Base URL 是否正确
- API Key 是否有效
- 所选模型是否真实可用

### 2. 构建失败

建议顺序执行：

```bash
npm install
npm run build
```

### 3. 部署后请求异常

确认端口、反向代理和环境变量是否配置正确。

---

## 路线方向

后续可以继续增强：

- 会话云同步
- 多提供商统一接入
- 更完整的 Prompt 模板系统
- 更强的视频脚本与爆款分析工作流
- 更多结构化结果卡片与导出能力

---

如果这个项目对你有帮助，欢迎 Star ⭐
