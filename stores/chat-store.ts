import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSnapshot, ChatMessage, ChatMode, ChatSession } from '@/lib/types';
import { defaultSettings } from '@/stores/settings-store';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const getDefaultModelByMode = (mode: ChatMode) => (mode === 'image' || mode === 'proImage' ? defaultSettings.defaultImageModel : defaultSettings.defaultTextModel);

const getDefaultTitleByMode = (mode: ChatMode) => {
  if (mode === 'chat') return '新建工作台对话';
  if (mode === 'image' || mode === 'proImage') return '新建绘图项目';
  if (mode === 'copywriting') return '新建文案任务';
  if (mode === 'videoScript') return '新建视频脚本';
  if (mode === 'roleplay') return '新建角色扮演';
  return '新建技能训练';
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
});

const sortedSessions = (sessions: ChatSession[]) =>
  [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0);
  });

const buildAssistantMessage = (content: string): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  content: `已收到：${content}\n\n这是一条用于演示 AI 内容创作工作台的回复。`,
  createdAt: now(),
  status: 'streaming',
});

interface ChatState {
  sessions: ChatSession[];
  activeSessionId?: string;
  createSession: (mode: ChatMode, subtype?: string, model?: string) => string;
  selectSession: (id: string) => void;
  sendMessage: (content: string, targetSessionId?: string) => void;
  renameSession: (id: string, title: string) => void;
  updateSession: (id: string, patch: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  togglePinSession: (id: string) => void;
  retryMessage: (sessionId: string, messageId: string) => void;
  regenerateLastAssistant: (sessionId: string) => void;
  exportSnapshot: (settings: AppSnapshot['settings']) => AppSnapshot;
  importSnapshot: (snapshot: AppSnapshot) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [createInitialSession()],
      activeSessionId: undefined,
      createSession: (mode, subtype, model) => {
        const session = { ...newSession(mode, model), subtype };
        set((state) => ({ sessions: sortedSessions([session, ...state.sessions]), activeSessionId: session.id }));
        return session.id;
      },
      selectSession: (activeSessionId) => set({ activeSessionId }),
      sendMessage: (content, targetSessionId) => {
        const { activeSessionId, sessions } = get();
        const targetId = targetSessionId ?? activeSessionId ?? sessions[0]?.id;
        if (!targetId || !content.trim()) return;

        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant = buildAssistantMessage(content);

        set((state) => ({
          sessions: sortedSessions(
            state.sessions.map((session) => {
              if (session.id !== targetId) return session;
              const nextTitle = session.messages.length === 0 ? content.slice(0, 20) || session.title : session.title;
              return {
                ...session,
                title: nextTitle,
                summary: content.slice(0, 40),
                updatedAt: now(),
                messages: [...session.messages, user, assistant],
              };
            }),
          ),
        }));

        setTimeout(() => {
          set((state) => ({
            sessions: sortedSessions(
              state.sessions.map((session) =>
                session.id === targetId
                  ? {
                      ...session,
                      messages: session.messages.map((message) =>
                        message.id === assistant.id
                          ? { ...message, status: 'done', content: `${message.content}\n\n✅ 渲染完成。` }
                          : message,
                      ),
                    }
                  : session,
              ),
            ),
          }));
        }, 800);
      },
      renameSession: (id, title) => set((state) => ({ sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: title.trim() || s.title } : s)) })),
      updateSession: (id, patch) =>
        set((state) => ({
          sessions: sortedSessions(state.sessions.map((session) => (session.id === id ? { ...session, ...patch, updatedAt: now() } : session))),
        })),
      deleteSession: (id) =>
        set((state) => {
          const sessions = sortedSessions(state.sessions.filter((session) => session.id !== id));
          return {
            sessions: sessions.length ? sessions : [createInitialSession()],
            activeSessionId: sessions[0]?.id,
          };
        }),
      togglePinSession: (id) =>
        set((state) => ({ sessions: sortedSessions(state.sessions.map((session) => (session.id === id ? { ...session, pinned: !session.pinned } : session))) })),
      retryMessage: (sessionId, messageId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        const message = session?.messages.find((m) => m.id === messageId && m.role === 'user');
        if (!message) return;
        get().sendMessage(message.content, sessionId);
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
            return {
              ...s,
              messages: lastAssistantId ? s.messages.filter((m) => m.id !== lastAssistantId) : s.messages,
            };
          }),
        }));
        get().sendMessage(lastUser.content, sessionId);
      },
      exportSnapshot: (settings) => ({
        version: 1,
        exportedAt: now(),
        settings,
        sessions: get().sessions,
        activeSessionId: get().activeSessionId,
      }),
      importSnapshot: (snapshot) => {
        const safeSessions = snapshot.sessions?.length ? sortedSessions(snapshot.sessions) : [createInitialSession()];
        const safeActiveId = safeSessions.some((s) => s.id === snapshot.activeSessionId) ? snapshot.activeSessionId : safeSessions[0]?.id;
        set({ sessions: safeSessions, activeSessionId: safeActiveId });
      },
    }),
    { name: 'echoai-chats' },
  ),
);
