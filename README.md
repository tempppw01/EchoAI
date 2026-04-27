# EchoAI

> 一个面向真实业务场景的 **AI 工作台**，覆盖通用对话、文案生成、视频脚本、角色扮演、学习训练、专业绘图等核心模块，并持续把每个板块做细、做深、做成独立可用的工作区。

EchoAI 基于 **Next.js 14 App Router** 构建，提供统一会话系统、统一设置中心与结构化工作流能力，支持接入 OpenAI 兼容接口，适合本地部署、私有化使用与业务场景扩展。

当前版本不是只押单一模块，而是坚持两个方向同时成立：
- **保留 AI 工作台总定位**
- **让每个板块逐步形成自己的完整工作闭环**

---

## 当前主定位

### 核心定位

EchoAI 当前定位为：

**一个多模块、可持续扩展、各板块功能持续精细化建设的 AI 工作台。**

### 当前建设原则

- 不只追求“模块多”，更重视“模块做细”
- 不让任何板块长期停留在 demo 级能力
- 统一工作台体验，但允许每个模块形成自己的专业工作流
- 共性能力统一沉淀，模块能力分别深化

### 当前主价值

EchoAI 不只是给用户一个聊天框，而是希望让用户在不同工作场景里都能获得：
- 更结构化的结果
- 更连续的任务处理体验
- 更清晰的模块分工
- 更可复用的历史、模板与资产

---

## 当前核心能力

### 1. 多模块 AI 工作区

- 通用对话：适合日常问答与任务协作
- 文案生成：适合营销文案、口播文案、广告文案等场景
- 视频脚本：支持视频脚本预设、结构化脚本生成、爆款文案分析
- 角色扮演：支持角色卡与世界观设定
- 学习训练：支持连续出题、答题反馈与分数跟踪
- 专业绘图：支持图像生成相关工作流

### 2. 统一工作台底座

- 新建、切换、搜索、删除会话
- 导出会话内容
- 重新生成与重试
- 多模块统一组织，不同工作区可独立使用
- 统一设置中心与模型参数配置
- 统一工作区式布局与交互框架

### 3. 模块精细化建设方向

后续不是只扩模块数量，而是继续深化每个模块：
- 通用对话：上下文沉淀、任务结果整理
- 文案生成：改写、多版本比较、风格切换、导出
- 视频脚本：结构提取、分镜、剪辑建议、模板复用
- 角色扮演：设定管理、角色一致性、场景推进
- 学习训练：难度调节、错题沉淀、阶段复盘
- 绘图：结果管理、风格模板、提示词复用

---

## 当前适合的使用场景

EchoAI 目前适合作为一个 **多模块 AI 工作台** 使用，适用场景包括：

- 日常 AI 协作与问答
- 中文文案生成与优化
- 短视频脚本策划与爆款拆解
- 角色设定式对话与陪练
- 学习训练与答题反馈
- 图像生成相关工作流

其中，视频脚本模块当前推进较快，但它属于 EchoAI 的重要模块之一，而不是唯一产品主线。

---

## 当前产品策略

### P0：工作台共性能力补齐

优先补齐：
- 会话管理与历史沉淀
- 结果保存与导出
- 加载态 / 错误态 / 空状态统一
- 各模块一致的基础交互

### P1：各模块内闭环深化

优先分别补强：
- 通用对话
- 文案生成
- 视频脚本
- 角色扮演
- 学习训练
- 专业绘图

### P2：高级资产与复用能力

继续补齐：
- 模板沉淀
- 风格资产
- 模块间复用
- 团队共享
- 更完整的工作流编排

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

先在根目录创建 [`.env`](.env)，至少配置：

```bash
OPENAI_API_KEY=你的上游密钥
OPENAI_BASE_URL=https://ai.shuaihong.fun/v1
```

然后启动：

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

当前 Next.js 应用已内置 [`app/api/openai/chat/route.ts`](app/api/openai/chat/route.ts)、[`app/api/openai/models/route.ts`](app/api/openai/models/route.ts) 与 [`app/api/openai/embeddings/route.ts`](app/api/openai/embeddings/route.ts) 服务端转发路由。
设置中心现在支持前端本地持久化 `Provider / Base URL / API Key`，并按“前端优先、服务端回退”的规则生效：

- 前端已填写 `API Key` 时，模型拉取、聊天与嵌入请求都会优先使用前端配置
- 前端 `API Key` 留空时，会自动回退到服务端 `OPENAI_API_KEY / API_KEY`
- 导出设置快照时会自动清空 `API Key`，避免敏感信息进入备份文件
如果你希望进一步增加认证、风控和管理端能力，再单独部署 [`server/index.js`](server/index.js)。

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

- 设置中心里填写的前端 `API Key` / `Base URL` 是否正确
- 如果前端 `API Key` 留空，再检查根目录 [`.env`](.env) 中的 `OPENAI_API_KEY` 与 `OPENAI_BASE_URL`
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

后续优先继续增强：

- 工作台共性能力统一补齐
- 各模块独立闭环深化
- 模板与风格等资产沉淀
- 更完整的结果结构与导出能力
- 模块间复用与团队协作能力

---

如果这个项目对你有帮助，欢迎 Star ⭐
