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

## 🚀 本地开发

```bash
npm install
npm run dev
```

默认访问：
- `http://localhost:3000/`

---

## 📦 生产构建

```bash
npm run build
npm run start
```

> `start` 脚本已支持平台注入端口：`PORT=${PORT:-3000}`。

---

## 🐳 Docker 部署

```bash
docker compose up --build -d
```

默认访问：
- `http://localhost:3001/`

---

## ⚙️ 配置说明（首次必做）

进入设置中心后请至少配置：

1. **Base URL**（OpenAI 兼容地址）
2. **API Key**
3. 点击“拉取模型列表”
4. 设置默认文本模型 / 默认绘图模型

未配置密钥时，界面会给出明确提示。

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