import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSnapshot, ChatMessage, ChatMode, ChatSession } from '@/lib/types';
import { defaultSettings } from '@/stores/settings-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useSettingsStore } from '@/stores/settings-store';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const MEMORY_TRIGGER_COUNT = 12;
const MEMORY_KEEP_RECENT = 6;

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

const makeSummary = (messages: ChatMessage[], previousSummary?: string) => {
  const snippets = messages.map((m) => `${m.role === 'user' ? '用户' : '角色'}：${m.content.replace(/\s+/g, ' ').slice(0, 80)}`);
  return [previousSummary, ...snippets].filter(Boolean).join('\n');
};

const buildRoleplayPrompt = (session: ChatSession) => {
  const roleplayStore = useRoleplayStore.getState();
  const character = roleplayStore.characters.find((char) => char.id === session.characterId);
  const world = roleplayStore.worlds.find((item) => item.id === session.worldId);

  const baseSystem = '你是沉浸式角色扮演引擎。严格保持角色口吻和世界一致性。';
  const layers = [
    baseSystem,
    character?.systemPrompt || '',
    world?.prompt || '',
    character?.scenario || '',
    session.memorySummary || '',
    session.messages.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n'),
  ].filter(Boolean);

  return layers.join('\n\n');
};

const buildAssistantMessage = (): ChatMessage => ({
  id: uid(),
  role: 'assistant',
  content: '思考中...',
  createdAt: now(),
  status: 'streaming',
});

const buildSystemPromptByMode = (session: ChatSession) => {
  if (session.mode === 'copywriting') return '你是一名资深中文营销文案专家。输出可直接投放的文案，并给出多版本。';
  if (session.mode === 'videoScript') return '你是一名短视频脚本策划。输出结构化脚本，包含开场钩子、节奏、镜头建议与CTA。';
  if (session.mode === 'training') return '你是一名技能训练教练。请输出分步骤训练计划，并给出评估标准和复盘建议。';
  if (session.mode === 'roleplay') return buildRoleplayPrompt(session);
  return '你是一个专业、可靠的 AI 助手。';
};

const buildMessagesForRequest = (session: ChatSession, content: string) => {
  const systemPrompt = buildSystemPromptByMode(session);
  const history = session.messages.slice(-12).map((message) => ({ role: message.role, content: message.content }));

  return [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...history,
    { role: 'user', content },
  ];
};

const requestAssistantReply = async (session: ChatSession, content: string) => {
  const { settings } = useSettingsStore.getState();
  const endpoint = settings.baseUrl?.trim();
  const apiKey = settings.apiKey?.trim();

  if (!endpoint || !apiKey) {
    throw new Error('未检测到可用的 API 配置，请先在设置中填写 Base URL 和 API Key。');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: session.model || settings.defaultTextModel,
      messages: buildMessagesForRequest(session, content),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;
  if (!message || typeof message !== 'string') {
    throw new Error('LLM response missing choices[0].message.content');
  }

  return { content: message, status: 'done' as const };
};

interface ChatState {
  sessions: ChatSession[];
  activeSessionId?: string;
  createSession: (mode: ChatMode, subtype?: string, model?: string, roleplayConfig?: { characterId?: string; worldId?: string }) => string;
  selectSession: (id: string) => void;
  sendMessage: (content: string, targetSessionId?: string) => Promise<void>;
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
      createSession: (mode, subtype, model, roleplayConfig) => {
        const roleplayState = useRoleplayStore.getState();
        const session = {
          ...newSession(mode, model),
          subtype,
          characterId: roleplayConfig?.characterId,
          worldId: roleplayConfig?.worldId ?? roleplayState.activeWorldId,
        };
        if (mode === 'roleplay' && session.characterId) roleplayState.markRecentCharacter(session.characterId);
        set((state) => ({ sessions: sortedSessions([session, ...state.sessions]), activeSessionId: session.id }));
        return session.id;
      },
      selectSession: (activeSessionId) => set({ activeSessionId }),
      sendMessage: async (content, targetSessionId) => {
        const { activeSessionId, sessions } = get();
        const targetId = targetSessionId ?? activeSessionId ?? sessions[0]?.id;
        if (!targetId || !content.trim()) return;

        const session = sessions.find((s) => s.id === targetId);
        if (!session) return;

        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant = buildAssistantMessage();

        set((state) => ({
          sessions: sortedSessions(
            state.sessions.map((item) => {
              if (item.id !== targetId) return item;

              const nextMessages = [...item.messages, user, assistant];
              let memorySummary = item.memorySummary || '';
              let trimmedMessages = nextMessages;

              if (item.mode === 'roleplay' && nextMessages.length > MEMORY_TRIGGER_COUNT) {
                const staleMessages = nextMessages.slice(0, nextMessages.length - MEMORY_KEEP_RECENT);
                memorySummary = makeSummary(staleMessages, memorySummary);
                trimmedMessages = nextMessages.slice(-MEMORY_KEEP_RECENT);
              }

              const nextTitle = item.messages.length === 0 ? content.slice(0, 20) || item.title : item.title;
              return {
                ...item,
                title: nextTitle,
                summary: content.slice(0, 40),
                updatedAt: now(),
                memorySummary,
                messages: trimmedMessages,
              };
            }),
          ),
        }));

        try {
          const result = await requestAssistantReply({ ...session, messages: [...session.messages, user] }, content);
          set((state) => ({
            sessions: sortedSessions(
              state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((message) =>
                        message.id === assistant.id
                          ? { ...message, status: result.status, content: result.content }
                          : message,
                      ),
                    }
                  : item,
              ),
            ),
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误';
          set((state) => ({
            sessions: sortedSessions(
              state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((msg) =>
                        msg.id === assistant.id
                          ? { ...msg, status: 'error', content: `请求失败：${message}` }
                          : msg,
                      ),
                    }
                  : item,
              ),
            ),
          }));
        }
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
