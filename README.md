# EchoAI Modern (Next.js App Router)

现代化动态应用版本，提供统一会话系统（Chat / Image / ProImage）和响应式三层 IA。

## 技术栈
- Next.js App Router + TypeScript
- Tailwind CSS + Radix（shadcn/ui 风格组件）
- Framer Motion 动画
- TanStack Query 数据缓存
- Zustand UI/业务状态
- React Hook Form + Zod 设置校验
- next-themes 深色模式

## 目录结构

```text
app/
  chat/page.tsx            # 文本对话
  image/page.tsx           # 绘图对话
  layout.tsx               # 全局 provider
components/
  layout/workspace.tsx     # 三层布局（Sidebar + Messages + Composer）
  chat/chat-list.tsx       # 会话列表（搜索/收藏/置顶/删除/重命名）
  chat/message-list.tsx    # 消息流（Markdown + 操作按钮 + 图片卡）
  chat/chat-composer.tsx   # 输入区（快捷指令/附件/参数开关）
  settings/settings-center.tsx  # 设置中心（5 tabs + 测试连接）
  image/pro-image-panel.tsx # 专业绘图面板
  providers/app-providers.tsx
hooks/
  use-models-query.ts
stores/
  chat-store.ts
  settings-store.ts
  ui-store.ts
lib/
  fetcher.ts
  types.ts
```

## 核心组件树
- `Workspace`
  - `Topbar`
  - `Sidebar`
    - `ChatList`
  - `MessageList`
  - `Composer`
  - `SettingsCenter`
  - `ImagePanel(ProImagePanel)`

## 迁移说明
- 已移除根目录历史静态页面（`index.html` / `style.css` / `utils.js`），统一使用 Next.js App Router 作为唯一 UI 架构入口。

## 运行

```bash
npm install
npm run dev
```

访问：
- `http://localhost:3000/chat`
- `http://localhost:3000/image`

## Docker 部署（默认启动前端界面）

```bash
docker compose up --build -d
```

访问：
- `http://localhost:3001/chat`

> 说明：当前根镜像默认启动 Next.js 前端（不再返回 API 状态提示页）。
