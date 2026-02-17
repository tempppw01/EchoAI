import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, ChatMode, ChatSession } from '@/lib/types';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

const getDefaultModelByMode = (mode: ChatMode) => (mode === 'image' || mode === 'proImage' ? 'gpt-image-1' : 'gpt-4o-mini');

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
  updatedAt: '',
  summary: '开始你的第一条消息',
  pinned: false,
  favorite: false,
  model: getDefaultModelByMode('chat'),
  messages: [],
});

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
  content: `已收到：${content}\n\n这是一条用于演示 AI 内容创作工作台的回复。`,
  createdAt: now(),
  status: 'streaming',
});

interface ChatState {
  sessions: ChatSession[];
  activeSessionId?: string;
  createSession: (mode: ChatMode, subtype?: string) => string;
  selectSession: (id: string) => void;
  sendMessage: (content: string) => void;
  updateSession: (id: string, patch: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [createInitialSession()],
      activeSessionId: undefined,
      createSession: (mode, subtype) => {
        const session = { ...newSession(mode), subtype };
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
        }, 800);
      },
      updateSession: (id, patch) =>
        set((state) => ({ sessions: state.sessions.map((session) => (session.id === id ? { ...session, ...patch } : session)) })),
      deleteSession: (id) =>
        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== id);
          return {
            sessions: sessions.length ? sessions : [createInitialSession()],
            activeSessionId: sessions[0]?.id,
          };
        }),
    }),
    { name: 'echoai-chats' },
  ),
);
