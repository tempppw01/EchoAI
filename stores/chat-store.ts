import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, ChatMode, ChatSession } from '@/lib/types';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

const newSession = (mode: ChatMode): ChatSession => ({
  id: uid(),
  mode,
  title: mode === 'chat' ? '新建文本对话' : mode === 'image' ? '新建绘图对话' : '新建专业绘图',
  updatedAt: now(),
  summary: '开始你的第一条消息',
  pinned: false,
  favorite: false,
  model: mode === 'chat' ? 'gpt-4o-mini' : 'gpt-image-1',
  messages: [],
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
        const targetId = activeSessionId ?? sessions[0]?.id;
        if (!targetId) return;
        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: `已收到：${content}\n\n这是一条用于演示统一会话系统与流式状态的回复。`,
          createdAt: now(),
          status: 'streaming',
        };
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== targetId) return s;
            const title = s.messages.length === 0 ? content.slice(0, 20) || s.title : s.title;
            return {
              ...s,
              title,
              summary: content.slice(0, 40),
              updatedAt: now(),
              messages: [...s.messages, user, assistant],
            };
          }),
        }));
        setTimeout(() => {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === targetId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistant.id ? { ...m, status: 'done', content: `${m.content}\n\n✅ 渲染完成。` } : m,
                    ),
                  }
                : s,
            ),
          }));
        }, 1200);
      },
      updateSession: (id, patch) => set((state) => ({ sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      deleteSession: (id) =>
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id);
          return { sessions: sessions.length ? sessions : [newSession('chat')], activeSessionId: sessions[0]?.id };
        }),
    }),
    { name: 'echoai-chats' },
  ),
);
