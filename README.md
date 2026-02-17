# EchoAI Modern (Next.js App Router)

EchoAI Modern 是一个面向外部用户的 AI 对话与绘图前端，基于 Next.js App Router 构建，支持多会话管理、角色扮演、图片生成与统一设置中心。

## 功能概览
- 多模式会话：Chat / Image / Roleplay。
- 会话管理：搜索、置顶、收藏、重命名、删除。
- 设置中心：模型、API、主题、连接测试。
- 响应式三栏布局：列表、消息流、输入区。

## 技术栈
- Next.js 14 + TypeScript
- Tailwind CSS + Radix UI（shadcn/ui 风格）
- Zustand（状态管理）
- TanStack Query（请求缓存）
- React Hook Form + Zod（表单校验）

## 项目结构
```text
app/
  chat/page.tsx            # 文本对话
  image/page.tsx           # 绘图对话
  layout.tsx               # 全局 provider
components/
  layout/workspace.tsx     # 三栏布局
  chat/chat-list.tsx       # 会话列表
  chat/message-list.tsx    # 消息流
  chat/chat-composer.tsx   # 输入区
  settings/settings-center.tsx  # 设置中心
stores/
  chat-store.ts            # 会话与消息状态
  settings-store.ts        # 模型/API 配置
lib/
  fetcher.ts
  openai-compatible.ts
```

## 本地运行
```bash
npm install
npm run dev
```

默认访问：
- `http://localhost:3000/chat`
- `http://localhost:3000/image`

## 生产构建
```bash
npm run build
npm run start
```

## Docker 部署
```bash
docker compose up --build -d
```

默认访问：
- `http://localhost:3001/chat`

## 部署常见问题
1. **平台显示 502 / 无响应**  
   确认服务是通过平台注入的 `$PORT` 启动（本仓库 Dockerfile 已按该方式配置）。

2. **前端可打开但无法请求模型**  
   请检查设置中心中的 API Base URL、API Key 与模型名称是否正确。

3. **构建失败**  
   先执行 `npm ci`（或 `npm install`）后再执行 `npm run build`，确保依赖完整。
