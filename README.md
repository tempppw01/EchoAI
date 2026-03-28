# EchoAI

> 一个以 **短视频内容工作区** 为优先主线的 AI 产品，当前重点覆盖选题整理、脚本生成、爆款拆解、结构提取与内容执行方案输出。

EchoAI 基于 **Next.js 14 App Router** 构建，提供统一会话系统、统一设置中心与结构化工作流能力，支持接入 OpenAI 兼容接口，适合本地部署、私有化使用与业务场景扩展。

当前版本不是要把所有 AI 场景平均铺开，而是优先把 **短视频内容生产链路** 做深：
- 输入选题 / 素材 / 转录文本
- 生成脚本 / 拆解爆款结构
- 输出剪辑思路 / 分镜建议 / 可执行结果
- 逐步沉淀模板、风格与历史资产

---

## 当前主定位

### 核心定位

EchoAI 当前优先定位为：

**面向内容策划与短视频运营场景的 AI 工作区。**

### 当前主目标用户

- 短视频运营
- 内容策划
- 企业品牌/市场团队
- 需要批量产出口播稿、脚本、拆解方案的人

### 当前主价值

不是单纯“和 AI 聊天”，而是让用户更快拿到：
- 可直接拍摄的脚本
- 可复用的爆款结构
- 可交付给剪辑/运营的执行方案
- 可沉淀的风格模板与内容资产

---

## 当前核心能力

### 1. 短视频内容工作区（当前主线）

- 视频脚本预设输入
- 结构化脚本生成（标题 / 开头钩子 / 正文 / 结尾 CTA）
- 爆款文案分析
- 爆款结构提取与结果卡片化展示
- 多版本脚本候选对比
- 短视频专属空状态、加载态、错误态反馈

### 2. 统一工作区底座

- 新建、切换、搜索、删除会话
- 导出会话内容
- 重新生成与重试
- 多模块统一组织，不同工作区可独立使用
- 统一设置中心与模型参数配置

### 3. 辅助能力模块（当前非主线）

- 通用对话
- 文案生成
- 角色扮演
- 学习训练
- 专业绘图

这些能力当前保留，用作工作区补充能力；产品主叙事优先围绕短视频内容生产展开。

---

## 当前适合的使用场景

EchoAI 目前最适合以下场景：

- 短视频脚本策划
- 爆款文案拆解与结构提取
- 口播稿整理与改写
- 面向抖音 / 视频号的内容生成
- 为剪辑执行准备结构化内容方案

次级适用场景包括：
- 日常 AI 协作与问答
- 中文文案生成与优化
- 学习训练与题目陪练
- 角色扮演与设定式对话

---

## 当前产品策略

### P0：先打穿短视频闭环

优先补齐：
- 转录文本导入
- 结构提取
- 爆款模板沉淀
- 分镜与剪辑建议
- 局部重写
- 导出能力

### P1：再做复用资产

优先补齐：
- 风格模板
- 素材喂养
- 历史结果复用
- 团队内容资产沉淀

### P2：最后扩展广度

- 更多平台适配
- 多人协作
- 内容效果复盘
- 更完整的模板系统

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

当前 Next.js 应用已内置 [`app/api/openai/chat/route.ts`](app/api/openai/chat/route.ts)、[`app/api/openai/models/route.ts`](app/api/openai/models/route.ts) 与 [`app/api/openai/embeddings/route.ts`](app/api/openai/embeddings/route.ts) 服务端转发路由，浏览器不会持久化 API Key。
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

- 根目录 [`.env`](.env) 中的 `OPENAI_API_KEY` 是否有效
- 根目录 [`.env`](.env) 中的 `OPENAI_BASE_URL` 是否正确
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

- 转录文本导入与结构提取
- 爆款结构模板沉淀与复用
- 剪辑思路与分镜工作流
- 风格模板与素材喂养
- 更多结构化结果卡片与导出能力

---

如果这个项目对你有帮助，欢迎 Star ⭐
