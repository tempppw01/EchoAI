import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSnapshot, ChatMessage, ChatMode, ChatSession } from '@/lib/types';
import { requestOpenAICompatible } from '@/lib/openai-compatible';
import { defaultSettings, useSettingsStore } from '@/stores/settings-store';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const getDefaultModelByMode = (mode: ChatMode) => (mode === 'image' || mode === 'proImage' ? defaultSettings.defaultImageModel : defaultSettings.defaultTextModel);

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
            session.id === sessionId ? { ...session, messages: [], summary: '开始你的第一条消息', memorySummary: '', pinnedMemory: '', updatedAt: now() } : session,
          ),
        })),
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
