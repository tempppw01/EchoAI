import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, ChatMode, ChatSession } from '@/lib/types';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

const getDefaultModelByMode = (mode: ChatMode) => (mode === 'chat' ? 'gpt-4o-mini' : 'gpt-image-1');

const getDefaultTitleByMode = (mode: ChatMode) => {
  if (mode === 'chat') return '新建文本对话';
  if (mode === 'image') return '新建绘图对话';
  return '新建专业绘图';
};

const newSession = (mode: ChatMode): ChatSession => ({
  id: uid(),
  mode,
  title: getDefaultTitleByMode(mode),
  updatedAt: now(),
  summary: '开始你的第一条消息',
  pinned: false,
  favorite: false,
  model: getDefaultModelByMode(mode),
  messages: [],
});

const getActiveSessionId = (activeSessionId: string | undefined, sessions: ChatSession[]) => activeSessionId ?? sessions[0]?.id;

const buildAssistantMessage = (content: string): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  content: `已收到：${content}\n\n这是一条用于演示统一会话系统与流式状态的回复。`,
  createdAt: now(),
  status: 'streaming',
});

interface ChatState {
  sessions: ChatSession[];
  activeSessionId?: string;
  createSession: (mode: ChatMode) => string;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  updateSession: (id: string, patch: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [newSession('chat')],
      activeSessionId: undefined,
      createSession: (mode) => {
        const session = newSession(mode);
        set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: session.id }));
        return session.id;
      },
      selectSession: (activeSessionId) => set({ activeSessionId }),
      sendMessage: (content) => {
        const { activeSessionId, sessions } = get();
        const targetId = getActiveSessionId(activeSessionId, sessions);
        if (!targetId) return;

        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant = buildAssistantMessage(content);

        // 首次发言时自动用消息内容作为会话标题，提高会话列表可读性。
        set((state) => ({
          sessions: state.sessions.map((session) => {
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
        }));

        // 模拟流式返回结束，单独更新 assistant 消息状态。
        setTimeout(() => {
          set((state) => ({
            sessions: state.sessions.map((session) =>
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
          }));
        }, 1200);
      },
      updateSession: (id, patch) =>
        set((state) => ({ sessions: state.sessions.map((session) => (session.id === id ? { ...session, ...patch } : session)) })),
      deleteSession: (id) =>
        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== id);
          return {
            sessions: sessions.length ? sessions : [newSession('chat')],
            activeSessionId: sessions[0]?.id,
          };
        }),
    }),
    { name: 'echoai-chats' },
  ),
);
