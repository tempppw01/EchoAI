import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSnapshot, ChatMessage, ChatMode, ChatSession, TrainingQuestion } from '@/lib/types';
import { requestOpenAICompatible } from '@/lib/openai-compatible';
import { defaultSettings, useSettingsStore } from '@/stores/settings-store';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const getDefaultModelByMode = (mode: ChatMode) => {
  const settings = useSettingsStore.getState().settings;
  const isImageMode = mode === 'image' || mode === 'proImage';
  const configuredModel = isImageMode ? settings.defaultImageModel : settings.defaultTextModel;
  const fallbackModel = settings.modelCatalog[0] || (isImageMode ? defaultSettings.defaultImageModel : defaultSettings.defaultTextModel);

  if (settings.modelCatalog.length === 0) {
    return configuredModel || fallbackModel;
  }

  return settings.modelCatalog.includes(configuredModel) ? configuredModel : fallbackModel;
};

const getDefaultTitleByMode = (mode: ChatMode) => {
  if (mode === 'chat') return '新建工作台对话';
  if (mode === 'image' || mode === 'proImage') return '新建绘图项目';
  if (mode === 'copywriting') return '新建文案任务';
  if (mode === 'videoScript') return '新建视频脚本';
  if (mode === 'roleplay') return '新建角色扮演';
  return '新建学习型聊天窗口';
};

const createInitialSession = (): ChatSession => ({
  id: 'default-chat-session',
  mode: 'chat',
  title: getDefaultTitleByMode('chat'),
  updatedAt: now(),
  summary: '开始你的第一条消息',
  pinned: false,
  model: getDefaultModelByMode('chat'),
  messages: [],
  pinnedMemory: '',
  memorySummary: '',
});

const newSession = (mode: ChatMode, model?: string): ChatSession => ({
  id: uid(),
  mode,
  title: getDefaultTitleByMode(mode),
  updatedAt: now(),
  summary: '开始你的第一条消息',
  pinned: false,
  model: model ?? getDefaultModelByMode(mode),
  messages: [],
  pinnedMemory: '',
  memorySummary: '',
});

const sortedSessions = (sessions: ChatSession[]) =>
  [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0);
  });

const buildSystemPromptByMode = (session: ChatSession) => {
  if (session.mode === 'copywriting') return '你是一名资深中文营销文案专家。输出可直接投放的文案，并给出多版本。';
  if (session.mode === 'videoScript') return '你是一名短视频脚本策划。输出结构化脚本，包含开场钩子、节奏、镜头建议与CTA。';
  if (session.mode === 'training') {
    return `你是一位专注学习的智能助教，只做学习相关的事：出题、讲解、批改、记录进度、鼓励。
界面风格清晰、简洁、结构化，不闲聊、不跑题。

你的固定规则
1. 每次只出 1 题，不让用户 overwhelm。
2. 题型自动在 选择题 / 判断题 / 填空题 之间轮换。
3. 回答必须严格按格式输出，不许乱排版。
4. 全程显示学习状态条，让用户一眼知道进度。
5. 答错不直接批评，先给提示，再给解析。

答题后你的回复格式
:white_check_mark: 回答正确：
很棒！这题你答对了。
:pushpin: 知识点：[一句话总结]

:x: 回答错误：
答案：[正确答案]
:bulb: 提示：[简单解释]
:pushpin: 核心知识点：[一句话总结]

然后立刻出下一题，继续保持上面的格式。

行为底线
• 不聊无关话题，不讲故事，不扯题外话。
• 不生成过长内容，全部极简、清晰、能做题。
• 永远保持鼓励、耐心、专业。`;
  }
  if (session.mode === 'roleplay') return '你是沉浸式角色扮演引擎。请保持角色一致性，并结合上下文回复。';
  return '你是一个专业、可靠的 AI 助手。';
};

interface ChatState {
  sessions: ChatSession[];
  activeSessionId?: string;
  generatingSessionIds: string[];
  createSession: (mode: ChatMode, subtype?: string, model?: string, roleplayConfig?: { characterId?: string; worldId?: string }) => string;
  selectSession: (id: string) => void;
  sendMessage: (content: string, targetSessionId?: string) => Promise<void>;
  startTraining: (sessionId: string, topic: string) => Promise<void>;
  answerTrainingQuestion: (sessionId: string, optionId: string) => Promise<void>;
  stopMessage: (sessionId: string) => void;
  clearContext: (sessionId: string) => void;
  renameSession: (id: string, title: string) => void;
  updateSession: (id: string, patch: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  togglePinSession: (id: string) => void;
  retryMessage: (sessionId: string, messageId: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  editUserMessage: (sessionId: string, messageId: string, content: string) => void;
  regenerateLastAssistant: (sessionId: string) => void;
  exportSnapshot: (settings: AppSnapshot['settings']) => AppSnapshot;
  importSnapshot: (snapshot: AppSnapshot) => void;
}

const inflightRequests = new Map<string, AbortController>();

const normalizeTrainingQuestion = (raw: string): TrainingQuestion | undefined => {
  try {
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
    const json = match ? (match[1] || match[0]) : raw;
    const parsed = JSON.parse(json);
    if (!parsed?.stem || !Array.isArray(parsed?.options)) return undefined;
    const options = parsed.options
      .map((item: { id?: string; text?: string }, idx: number) => ({ id: String(item.id || String.fromCharCode(65 + idx)), text: String(item.text || '') }))
      .filter((item: { id: string; text: string }) => item.text.trim());
    if (options.length < 2) return undefined;
    const safeCorrect = options.some((item: { id: string }) => item.id === parsed.correctOptionId) ? parsed.correctOptionId : options[0].id;
    return {
      stem: String(parsed.stem),
      options,
      correctOptionId: String(safeCorrect),
      explanation: String(parsed.explanation || '继续保持，你正在稳步进步。'),
    };
  } catch {
    return undefined;
  }
};

const buildTrainingQuestion = async (session: ChatSession): Promise<TrainingQuestion | undefined> => {
  const settings = useSettingsStore.getState().settings;
  const topic = session.trainingTopic || '综合基础';
  const avoid = session.trainingLastCorrectOption || '无';
  const prompt = `请围绕主题“${topic}”出一道难度自适应的单选题，并只输出 JSON，不要输出其它文字。
JSON schema:
{
  "stem": "题干",
  "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
  "correctOptionId": "A/B/C/D",
  "explanation": "简短解析"
}
要求：
1) 题干简洁，四个选项长度相近。
2) 正确选项不要总固定在同一个字母，尽量随机。本轮避免 ${avoid}。
3) 与最近题目保持发散，不要重复同一考点表述。`;

  try {
    const reply = await requestOpenAICompatible({
      settings,
      model: session.model || settings.defaultTextModel,
      messages: [{ role: 'system', content: '你是严谨的出题引擎，只能输出合法 JSON。' }, { role: 'user', content: prompt }],
    });
    return normalizeTrainingQuestion(reply);
  } catch {
    return undefined;
  }
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [createInitialSession()],
      activeSessionId: undefined,
      generatingSessionIds: [],
      createSession: (mode, subtype, model, roleplayConfig) => {
        const session = { ...newSession(mode, model), subtype, characterId: roleplayConfig?.characterId, worldId: roleplayConfig?.worldId };
        set((state) => ({ sessions: sortedSessions([session, ...state.sessions]), activeSessionId: session.id }));
        return session.id;
      },
      selectSession: (activeSessionId) => set({ activeSessionId }),
      sendMessage: async (rawContent, targetSessionId) => {
        const content = rawContent.trim();
        if (!content) return;

        const { activeSessionId, sessions } = get();
        const targetId = targetSessionId ?? activeSessionId ?? sessions[0]?.id;
        if (!targetId) return;

        const session = sessions.find((s) => s.id === targetId);
        if (!session) return;
        if (session.mode === 'training' && session.trainingCurrentQuestion) {
          await get().answerTrainingQuestion(targetId, rawContent.trim());
          return;
        }

        inflightRequests.get(targetId)?.abort();
        const controller = new AbortController();
        inflightRequests.set(targetId, controller);

        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant: ChatMessage = { id: uid(), role: 'assistant', content: '思考中...', createdAt: now(), status: 'streaming' };

        set((state) => ({
          generatingSessionIds: [...new Set([...state.generatingSessionIds, targetId])],
          sessions: sortedSessions(
            state.sessions.map((item) =>
              item.id === targetId
                ? {
                    ...item,
                    title: item.messages.length === 0 ? content.slice(0, 20) || item.title : item.title,
                    summary: content.slice(0, 40),
                    updatedAt: now(),
                    messages: [...item.messages, user, assistant],
                  }
                : item,
            ),
          ),
        }));

        try {
          const settings = useSettingsStore.getState().settings;
          const requestMessages = [
            { role: 'system' as const, content: buildSystemPromptByMode(session) },
            ...session.messages.slice(-12).map((item) => ({ role: item.role, content: item.content })),
            { role: 'user' as const, content },
          ];

          const reply = await requestOpenAICompatible({
            settings,
            model: session.model || settings.defaultTextModel,
            messages: requestMessages,
          });

          if (controller.signal.aborted) return;

          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== targetId),
            sessions: sortedSessions(
              state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((message) => (message.id === assistant.id ? { ...message, content: reply, status: 'done' } : message)),
                    }
                  : item,
              ),
            ),
          }));
        } catch (error) {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : '未知错误';
          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== targetId),
            sessions: sortedSessions(
              state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((msg) => (msg.id === assistant.id ? { ...msg, status: 'error', content: `⚠️ ${message}` } : msg)),
                    }
                  : item,
              ),
            ),
          }));
        } finally {
          inflightRequests.delete(targetId);
        }
      },
      stopMessage: (sessionId) => {
        inflightRequests.get(sessionId)?.abort();
        set((state) => ({ generatingSessionIds: state.generatingSessionIds.filter((id) => id !== sessionId) }));
      },
      clearContext: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [], summary: '开始你的第一条消息', memorySummary: '', pinnedMemory: '', trainingCurrentQuestion: undefined, trainingRound: 0, updatedAt: now() }
              : session,
          ),
        })),
      startTraining: async (sessionId, topic) => {
        const trimmedTopic = topic.trim();
        if (!trimmedTopic) return;
        const targetSession = get().sessions.find((item) => item.id === sessionId);
        if (!targetSession || targetSession.mode !== 'training') return;

        set((state) => ({
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  trainingTopic: trimmedTopic,
                  trainingScore: item.trainingScore ?? 60,
                  trainingRound: item.trainingRound ?? 0,
                  messages: item.messages.length ? item.messages : [{ id: uid(), role: 'assistant', createdAt: now(), status: 'done', content: `学习主题已设置为：${trimmedTopic}` }],
                  updatedAt: now(),
                }
              : item,
          ),
          generatingSessionIds: [...new Set([...state.generatingSessionIds, sessionId])],
        }));

        const nextQuestion = await buildTrainingQuestion({ ...targetSession, trainingTopic: trimmedTopic });
        if (!nextQuestion) {
          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== sessionId),
            sessions: state.sessions.map((item) =>
              item.id === sessionId
                ? {
                    ...item,
                    messages: [
                      ...item.messages,
                      {
                        id: uid(),
                        role: 'assistant',
                        createdAt: now(),
                        status: 'error',
                        content: '⚠️ 当前未能生成题目，请检查模型配置后重试。',
                      },
                    ],
                  }
                : item,
            ),
          }));
          return;
        }

        set((state) => ({
          generatingSessionIds: state.generatingSessionIds.filter((id) => id !== sessionId),
          sessions: sortedSessions(
            state.sessions.map((item) =>
              item.id === sessionId
                ? {
                    ...item,
                    trainingCurrentQuestion: nextQuestion,
                    trainingLastCorrectOption: nextQuestion.correctOptionId,
                    messages: [
                      ...item.messages,
                      { id: uid(), role: 'assistant', createdAt: now(), status: 'done', content: `第 ${(item.trainingRound ?? 0) + 1} 题：${nextQuestion.stem}` },
                    ],
                  }
                : item,
            ),
          ),
        }));
      },
      answerTrainingQuestion: async (sessionId, optionId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session || session.mode !== 'training' || !session.trainingCurrentQuestion) return;

        const currentQuestion = session.trainingCurrentQuestion;
        const picked = currentQuestion.options.find((item) => item.id === optionId);
        if (!picked) return;
        const correct = optionId === currentQuestion.correctOptionId;
        const score = Math.max(0, Math.min(100, (session.trainingScore ?? 60) + (correct ? 6 : -4)));

        set((state) => ({
          generatingSessionIds: [...new Set([...state.generatingSessionIds, sessionId])],
          sessions: state.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  trainingScore: score,
                  trainingRound: (item.trainingRound ?? 0) + 1,
                  trainingCurrentQuestion: undefined,
                  messages: [
                    ...item.messages,
                    { id: uid(), role: 'user', content: `我选择了 ${picked.id}. ${picked.text}`, createdAt: now(), status: 'done' },
                    {
                      id: uid(),
                      role: 'assistant',
                      createdAt: now(),
                      status: 'done',
                      content: correct
                        ? `回答正确，+6 分。当前分数 ${score}/100。\n\n解析：${currentQuestion.explanation}`
                        : `回答错误，-4 分。正确答案是 ${currentQuestion.correctOptionId}。当前分数 ${score}/100。\n\n解析：${currentQuestion.explanation}`,
                    },
                  ],
                }
              : item,
          ),
        }));

        const updated = get().sessions.find((item) => item.id === sessionId);
        if (!updated) return;
        const nextQuestion = await buildTrainingQuestion(updated);
        if (!nextQuestion) {
          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== sessionId),
            sessions: state.sessions.map((item) =>
              item.id === sessionId
                ? {
                    ...item,
                    messages: [
                      ...item.messages,
                      {
                        id: uid(),
                        role: 'assistant',
                        createdAt: now(),
                        status: 'error',
                        content: '⚠️ 当前未能生成下一题，请检查模型配置后重试。',
                      },
                    ],
                  }
                : item,
            ),
          }));
          return;
        }

        set((state) => ({
          generatingSessionIds: state.generatingSessionIds.filter((id) => id !== sessionId),
          sessions: sortedSessions(
            state.sessions.map((item) =>
              item.id === sessionId
                ? {
                    ...item,
                    trainingCurrentQuestion: nextQuestion,
                    trainingLastCorrectOption: nextQuestion.correctOptionId,
                    messages: [
                      ...item.messages,
                      { id: uid(), role: 'assistant', createdAt: now(), status: 'done', content: `第 ${(item.trainingRound ?? 0) + 1} 题：${nextQuestion.stem}` },
                    ],
                  }
                : item,
            ),
          ),
        }));
      },
      renameSession: (id, title) => set((state) => ({ sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: title.trim() || s.title } : s)) })),
      updateSession: (id, patch) => set((state) => ({ sessions: sortedSessions(state.sessions.map((session) => (session.id === id ? { ...session, ...patch, updatedAt: now() } : session))) })),
      deleteSession: (id) =>
        set((state) => {
          const sessions = sortedSessions(state.sessions.filter((session) => session.id !== id));
          return { sessions: sessions.length ? sessions : [createInitialSession()], activeSessionId: sessions[0]?.id };
        }),
      togglePinSession: (id) => set((state) => ({ sessions: sortedSessions(state.sessions.map((session) => (session.id === id ? { ...session, pinned: !session.pinned } : session))) })),
      retryMessage: (sessionId, messageId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        const message = session?.messages.find((m) => m.id === messageId && m.role === 'user');
        if (!message) return;
        get().sendMessage(message.content, sessionId);
      },
      deleteMessage: (sessionId, messageId) => set((state) => ({ sessions: state.sessions.map((session) => (session.id === sessionId ? { ...session, messages: session.messages.filter((message) => message.id !== messageId), updatedAt: now() } : session)) })),
      editUserMessage: (sessionId, messageId, content) => {
        if (!content.trim()) return;
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id !== sessionId
              ? session
              : {
                  ...session,
                  updatedAt: now(),
                  messages: session.messages.map((message) => (message.id === messageId && message.role === 'user' ? { ...message, content, originalContent: message.originalContent ?? message.content } : message)),
                },
          ),
        }));
      },
      regenerateLastAssistant: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;
        const lastUser = [...session.messages].reverse().find((m) => m.role === 'user');
        if (!lastUser) return;
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const lastAssistantId = [...s.messages].reverse().find((x) => x.role === 'assistant')?.id;
            return { ...s, messages: lastAssistantId ? s.messages.filter((m) => m.id !== lastAssistantId) : s.messages };
          }),
        }));
        get().sendMessage(lastUser.content, sessionId);
      },
      exportSnapshot: (settings) => ({ version: 1, exportedAt: now(), settings, sessions: get().sessions, activeSessionId: get().activeSessionId }),
      importSnapshot: (snapshot) => {
        const safeSessions = snapshot.sessions?.length ? sortedSessions(snapshot.sessions) : [createInitialSession()];
        const safeActiveId = safeSessions.some((s) => s.id === snapshot.activeSessionId) ? snapshot.activeSessionId : safeSessions[0]?.id;
        set({ sessions: safeSessions, activeSessionId: safeActiveId });
      },
    }),
    {
      name: 'echoai-chats',
      partialize: (state) => ({ sessions: state.sessions, activeSessionId: state.activeSessionId }),
    },
  ),
);
