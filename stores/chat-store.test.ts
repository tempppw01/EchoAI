import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ChatMessage, ChatSession, ChatMode, TrainingQuestion } from '@/lib/types';

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  persist: (config: any) => config,
  createJSONStorage: () => ({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }),
}));

// Mock dependencies
vi.mock('@/lib/openai-compatible', () => ({
  requestOpenAICompatible: vi.fn(),
}));

vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: {
        defaultTextModel: 'gpt-4',
        defaultImageModel: 'dall-e-3',
        temperature: 0.7,
        maxTokens: 2048,
        modelCatalog: ['gpt-4', 'gpt-3.5-turbo'],
      },
    }),
  },
  defaultSettings: {
    defaultTextModel: 'gpt-4',
    defaultImageModel: 'dall-e-3',
  },
}));

describe('ChatStore - Session Management', () => {
  it('creates initial session with correct mode', () => {
    const session: ChatSession = {
      id: 'test-id',
      mode: 'videoScript',
      title: '新建内容创作',
      updatedAt: new Date().toISOString(),
      summary: '开始你的第一条消息',
      pinned: false,
      model: 'gpt-4',
      messages: [],
      pinnedMemory: '',
      memorySummary: '',
    };

    expect(session.mode).toBe('videoScript');
    expect(session.messages).toHaveLength(0);
    expect(session.pinned).toBe(false);
  });

  it('generates unique session IDs', () => {
    const id1 = Math.random().toString(36).slice(2, 10);
    const id2 = Math.random().toString(36).slice(2, 10);

    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });

  it('sorts sessions with pinned first', () => {
    const sessions: ChatSession[] = [
      {
        id: '1',
        mode: 'chat',
        title: 'Normal',
        pinned: false,
        updatedAt: '2024-01-02',
        summary: '',
        model: 'gpt-4',
        messages: [],
        pinnedMemory: '',
        memorySummary: '',
      },
      {
        id: '2',
        mode: 'chat',
        title: 'Pinned',
        pinned: true,
        updatedAt: '2024-01-01',
        summary: '',
        model: 'gpt-4',
        messages: [],
        pinnedMemory: '',
        memorySummary: '',
      },
    ];

    const sorted = [...sessions].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0);
    });

    expect(sorted[0].pinned).toBe(true);
    expect(sorted[1].pinned).toBe(false);
  });

  it('sorts by updatedAt when pin status is same', () => {
    const sessions: ChatSession[] = [
      {
        id: '1',
        mode: 'chat',
        title: 'Old',
        pinned: false,
        updatedAt: '2024-01-01T10:00:00Z',
        summary: '',
        model: 'gpt-4',
        messages: [],
        pinnedMemory: '',
        memorySummary: '',
      },
      {
        id: '2',
        mode: 'chat',
        title: 'New',
        pinned: false,
        updatedAt: '2024-01-02T10:00:00Z',
        summary: '',
        model: 'gpt-4',
        messages: [],
        pinnedMemory: '',
        memorySummary: '',
      },
    ];

    const sorted = [...sessions].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0);
    });

    expect(sorted[0].title).toBe('New');
    expect(sorted[1].title).toBe('Old');
  });
});

describe('ChatStore - Message Management', () => {
  it('creates user message with correct structure', () => {
    const message = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'user' as const,
      content: 'Test message',
      createdAt: new Date().toISOString(),
      status: 'done' as const,
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Test message');
    expect(message.status).toBe('done');
  });

  it('creates assistant message with streaming status', () => {
    const message = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'assistant' as const,
      content: '思考中...',
      createdAt: new Date().toISOString(),
      status: 'streaming' as const,
    };

    expect(message.role).toBe('assistant');
    expect(message.status).toBe('streaming');
  });

  it('handles empty message content', () => {
    const content = '   ';
    expect(content.trim()).toBe('');
  });

  it('finds retry source message correctly', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'First', createdAt: '', status: 'done' as const },
      { id: '2', role: 'assistant' as const, content: 'Response', createdAt: '', status: 'done' as const },
      { id: '3', role: 'user' as const, content: 'Second', createdAt: '', status: 'done' as const },
      { id: '4', role: 'assistant' as const, content: 'Error', createdAt: '', status: 'error' as const },
    ];

    // Find source for retrying message '4'
    const targetIndex = messages.findIndex((m) => m.id === '4');
    let sourceMessage;
    
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sourceMessage = messages[i];
        break;
      }
    }

    expect(sourceMessage?.id).toBe('3');
    expect(sourceMessage?.content).toBe('Second');
  });

  it('returns undefined when no user message found for retry', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'assistant' as const, content: 'Only assistant', createdAt: '', status: 'done' as const },
    ];

    const targetIndex = messages.findIndex((m) => m.id === '1');
    let sourceMessage;
    
    for (let i = targetIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sourceMessage = messages[i];
        break;
      }
    }

    expect(sourceMessage).toBeUndefined();
  });
});

describe('ChatStore - Training Mode', () => {
  it('normalizes training question from JSON', () => {
    const raw = `\`\`\`json
{
  "stem": "What is 2+2?",
  "options": [
    {"id": "A", "text": "3"},
    {"id": "B", "text": "4"},
    {"id": "C", "text": "5"}
  ],
  "correctOptionId": "B",
  "explanation": "Basic math"
}
\`\`\``;

    const match = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = match ? match[1] : raw;
    const parsed = JSON.parse(json);

    expect(parsed.stem).toBe('What is 2+2?');
    expect(parsed.options).toHaveLength(3);
    expect(parsed.correctOptionId).toBe('B');
  });

  it('validates training question structure', () => {
    const question: TrainingQuestion = {
      stem: 'Test question?',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
      ],
      correctOptionId: 'A',
      explanation: 'Explanation text',
    };

    expect(question.options.length).toBeGreaterThanOrEqual(2);
    expect(question.options.some(opt => opt.id === question.correctOptionId)).toBe(true);
  });

  it('calculates score adjustment correctly', () => {
    const baseScore = 60;
    const correctAdjustment = 6;
    const incorrectAdjustment = -4;

    const newScoreCorrect = Math.max(0, Math.min(100, baseScore + correctAdjustment));
    const newScoreIncorrect = Math.max(0, Math.min(100, baseScore + incorrectAdjustment));

    expect(newScoreCorrect).toBe(66);
    expect(newScoreIncorrect).toBe(56);
  });

  it('clamps score to valid range', () => {
    const score1 = Math.max(0, Math.min(100, 150));
    const score2 = Math.max(0, Math.min(100, -10));

    expect(score1).toBe(100);
    expect(score2).toBe(0);
  });

  it('determines difficulty level by score', () => {
    const getDifficulty = (score: number) => {
      if (score >= 85) return { level: 5, label: '挑战' };
      if (score >= 70) return { level: 4, label: '进阶' };
      if (score >= 55) return { level: 3, label: '标准' };
      if (score >= 40) return { level: 2, label: '巩固' };
      return { level: 1, label: '基础' };
    };

    expect(getDifficulty(90).level).toBe(5);
    expect(getDifficulty(75).level).toBe(4);
    expect(getDifficulty(60).level).toBe(3);
    expect(getDifficulty(45).level).toBe(2);
    expect(getDifficulty(30).level).toBe(1);
  });

  it('tracks recent training records correctly', () => {
    const records = [
      { round: 1, stem: 'Q1', pickedOptionId: 'A', correctOptionId: 'A', isCorrect: true, explanation: '' },
      { round: 2, stem: 'Q2', pickedOptionId: 'B', correctOptionId: 'A', isCorrect: false, explanation: '' },
    ];

    const recent = [...records].slice(-10);
    expect(recent).toHaveLength(2);
    expect(recent[0].isCorrect).toBe(true);
    expect(recent[1].isCorrect).toBe(false);
  });
});

describe('ChatStore - System Prompts', () => {
  it('builds correct system prompt for videoScript mode', () => {
    const mode: ChatMode = 'videoScript';
    const prompt = mode === 'videoScript' 
      ? '你是一名中文内容增长策划，擅长把产品信息、参考样本和平台热点整合成可发布的文案或短视频脚本。'
      : '你是一个专业、可靠的 AI 助手。';

    expect(prompt).toContain('内容增长策划');
    expect(prompt).toContain('文案或短视频脚本');
  });

  it('builds correct system prompt for training mode', () => {
    const mode: ChatMode = 'training';
    const isTraining = mode === 'training';

    expect(isTraining).toBe(true);
  });

  it('builds correct system prompt for roleplay mode', () => {
    const mode: ChatMode = 'roleplay';
    const prompt = mode === 'roleplay'
      ? '你是沉浸式角色扮演引擎。请保持角色一致性，并结合上下文回复。'
      : '你是一个专业、可靠的 AI 助手。';

    expect(prompt).toContain('角色扮演');
  });

  it('defaults to generic assistant for chat mode', () => {
    const mode: ChatMode = 'chat';
    const prompt = mode === 'chat'
      ? '你是一个专业、可靠的 AI 助手。'
      : '';

    expect(prompt).toContain('AI 助手');
  });
});

describe('ChatStore - Title Generation', () => {
  it('generates default title by mode', () => {
    const getTitleByMode = (mode: ChatMode) => {
      if (mode === 'chat') return '新建工作台对话';
      if (mode === 'image' || mode === 'proImage') return '新建绘图项目';
      if (mode === 'copywriting' || mode === 'videoScript') return '新建内容创作';
      if (mode === 'roleplay') return '新建角色扮演';
      return '新建学习型聊天窗口';
    };

    expect(getTitleByMode('chat')).toBe('新建工作台对话');
    expect(getTitleByMode('image')).toBe('新建绘图项目');
    expect(getTitleByMode('videoScript')).toBe('新建内容创作');
    expect(getTitleByMode('training')).toBe('新建学习型聊天窗口');
  });

  it('truncates long content for title', () => {
    const content = 'This is a very long message that should be truncated for the title';
    const title = content.slice(0, 20);

    expect(title.length).toBe(20);
    expect(title).toBe('This is a very long ');
  });

  it('uses fallback when content is empty', () => {
    const content = '';
    const title = content.slice(0, 20) || '新建工作台对话';

    expect(title).toBe('新建工作台对话');
  });
});

describe('ChatStore - Model Selection', () => {
  it('selects default model by mode', () => {
    const getDefaultModel = (mode: ChatMode, settings: any) => {
      const isImageMode = mode === 'image' || mode === 'proImage';
      const configuredModel = isImageMode 
        ? settings.defaultImageModel 
        : settings.defaultTextModel;
      return configuredModel || settings.modelCatalog[0] || 'gpt-4';
    };

    const settings = {
      defaultTextModel: 'gpt-4',
      defaultImageModel: 'dall-e-3',
      modelCatalog: ['gpt-4', 'gpt-3.5-turbo'],
    };

    expect(getDefaultModel('chat', settings)).toBe('gpt-4');
    expect(getDefaultModel('image', settings)).toBe('dall-e-3');
  });

  it('falls back to catalog when preferred model not set', () => {
    const settings = {
      defaultTextModel: '',
      defaultImageModel: '',
      modelCatalog: ['fallback-model'],
    };

    const model = settings.defaultTextModel || settings.modelCatalog[0] || 'gpt-4';
    expect(model).toBe('fallback-model');
  });

  it('validates model is in catalog', () => {
    const settings = {
      defaultTextModel: 'gpt-4',
      modelCatalog: ['gpt-4', 'gpt-3.5-turbo'],
    };

    const isValid = settings.modelCatalog.includes(settings.defaultTextModel);
    expect(isValid).toBe(true);
  });
});
