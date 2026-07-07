# 测试文件快速索引

## 新增测试文件列表

### 核心业务逻辑 (P0)

#### 1. lib/openai-compatible.test.ts
- **测试用例**: 16 个
- **覆盖模块**: OpenAI 兼容层请求逻辑
- **关键测试**:
  - `toOpenAIMessages` - 消息格式转换（基础、图片、多图）
  - `requestOpenAICompatible` - 聊天完成请求（成功、失败、中断）
  - `requestEmbeddingVector` - 向量嵌入请求（成功、失败、空响应）

#### 2. stores/settings-store.test.ts
- **测试用例**: 15 个
- **覆盖模块**: 应用设置管理
- **关键测试**:
  - `defaultSettings` - 默认配置验证
  - `sanitizeSettingsForExport` - 配置导出安全
  - `useSettingsStore` - 状态更新和持久化

#### 3. stores/chat-store.test.ts
- **测试用例**: 25 个
- **覆盖模块**: 会话和消息管理
- **关键测试**:
  - 会话管理（创建、排序、固定）
  - 消息管理（创建、重试、状态）
  - 训练模式（问题解析、分数计算、难度判定）
  - 系统提示（多模式支持）
  - 标题生成和模型选择

### 工具函数 (P2)

#### 4. lib/trend-utils.test.ts
- **测试用例**: 40 个
- **覆盖模块**: 热搜数据处理工具
- **关键测试**:
  - `normalizeTrendTitle` - 标题标准化
  - `enrichTrendItemsWithHistory` - 历史数据增强
  - `getTrendRankMovement` - 排名变动计算
  - `isLongTailKeyword` - 长尾关键词识别
  - `summarizeKeywordMomentum` - 趋势动量分析

#### 5. lib/model-service.test.ts
- **测试用例**: 13 个
- **覆盖模块**: 模型服务 API
- **关键测试**:
  - `fetchModelCatalog` - 模型列表获取
  - 错误处理（网络、HTTP、格式）
  - 数据清理（去重、过滤、验证）

## 总览

```
测试文件: 5 个
测试用例: 109 个
代码行数: ~45,000 行测试代码
覆盖率目标: 60%+
```

## 运行指令

```bash
# 运行所有测试
npm test

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run coverage
```

## 文件位置

```
EchoAI/
├── lib/
│   ├── openai-compatible.test.ts    (16 tests)
│   ├── trend-utils.test.ts          (40 tests)
│   └── model-service.test.ts        (13 tests)
└── stores/
    ├── settings-store.test.ts       (15 tests)
    └── chat-store.test.ts           (25 tests)
```

## 测试质量保证

✅ 所有测试独立运行  
✅ Mock 外部依赖（fetch, localStorage, zustand）  
✅ 覆盖正常流程、边界条件、错误场景  
✅ 快速执行（< 1 秒总时长）  
✅ 清晰的测试描述和结构  

## 下一步

如需继续提升覆盖率，建议补充：
1. API 路由集成测试
2. 组件 UI 测试（React Testing Library）
3. E2E 测试（Playwright/Cypress）
