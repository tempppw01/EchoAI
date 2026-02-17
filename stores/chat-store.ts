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

const buildMessagesForRequest = (session: ChatSession, content: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => {
  const systemPrompt = buildSystemPromptByMode(session);
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = session.messages
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content }));
  const systemMessages: Array<{ role: 'system'; content: string }> = systemPrompt
    ? [{ role: 'system', content: systemPrompt }]
    : [];

  return [
    ...systemMessages,
    ...history,
    { role: 'user', content },
  ];
};

const inflightRequests = new Map<string, AbortController>();

type RequestBlockReason = 'permission' | 'quota' | 'region';

class LLMRequestError extends Error {
  status?: number;
  code?: string;
  reason?: RequestBlockReason;

  constructor(message: string, options?: { status?: number; code?: string; reason?: RequestBlockReason }) {
    super(message);
    this.name = 'LLMRequestError';
    this.status = options?.status;
    this.code = options?.code;
    this.reason = options?.reason;
  }
}

const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const detectBlockReason = (value: string): RequestBlockReason | undefined => {
  const text = value.toLowerCase();
  if (text.includes('quota') || text.includes('insufficient_quota') || text.includes('billing')) return 'quota';
  if (text.includes('region') || text.includes('country') || text.includes('unsupported_country') || text.includes('geo')) return 'region';
  if (text.includes('permission') || text.includes('forbidden') || text.includes('unauthorized') || text.includes('access_denied')) return 'permission';
  return undefined;
};

const getFriendlyErrorMessage = (error: unknown) => {
  if (!(error instanceof LLMRequestError)) {
    return '请求失败，请稍后重试或检查网络连接。';
  }

  if (error.reason === 'permission') {
    return '当前账号没有访问该模型的权限，请切换模型或联系管理员开通权限。';
  }

  if (error.reason === 'quota') {
    return '当前账号额度已用尽，请充值或更换可用的 API Key 后重试。';
  }

  if (error.reason === 'region') {
    return '当前地区暂不支持该服务，请切换到受支持地区或更换服务提供方。';
  }

  if (error.status === 429) return '请求过于频繁，已自动重试失败，请稍后再试。';
  if (error.status && retryableStatusCodes.has(error.status)) return `服务暂时不可用（${error.status}），请点击重试。`;
  if (error.code === 'timeout') return '请求超时，请检查网络后重试。';
  if (error.status === 401) return 'API Key 无效或已过期，请更新后重试。';

  return error.message || '请求失败，请稍后重试。';
};

const requestAssistantReply = async (session: ChatSession, content: string, signal?: AbortSignal) => {
  const { settings } = useSettingsStore.getState();
  const endpoint = settings.baseUrl?.trim();
  const apiKey = settings.apiKey?.trim();

  if (!endpoint || !apiKey) {
    return {
      content: `已收到你的消息：${content}\n\n⚠️ 未检测到 API 配置，当前为本地演示回复。`,
      status: 'done' as const,
    };
    throw new Error('未检测到可用的 API 配置，请先在设置中填写 Base URL 和 API Key。');
  }

  let attempt = 0;
  let response: Response | undefined;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt += 1;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort('timeout'), 15_000);
    const requestSignal = AbortSignal.any([signal, timeoutController.signal].filter(Boolean) as AbortSignal[]);

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: requestSignal,
        body: JSON.stringify({
          model: session.model || settings.defaultTextModel,
          messages: buildMessagesForRequest(session, content),
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          stream: false,
        }),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const abortedByUser = signal?.aborted;
      if (abortedByUser) throw new DOMException('Aborted', 'AbortError');

      const timeoutOrNetwork = error instanceof Error ? error.message : String(error);
      const isTimeout = timeoutController.signal.aborted || timeoutOrNetwork.toLowerCase().includes('timeout');
      if (attempt < maxAttempts) {
        await wait(400 * attempt);
        continue;
      }
      throw new LLMRequestError(isTimeout ? '请求超时。' : '网络请求失败。', { code: isTimeout ? 'timeout' : 'network' });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const detail = await response.text();
      const reason = detectBlockReason(detail) || detectBlockReason(String(response.status));
      const statusDeniedReason = response.status === 403 ? 'permission' : response.status === 429 ? 'quota' : undefined;
      const blockReason = reason || statusDeniedReason;

      if (blockReason && ['permission', 'quota', 'region'].includes(blockReason)) {
        throw new LLMRequestError(detail || `请求失败（${response.status}）`, { status: response.status, reason: blockReason });
      }

      if (retryableStatusCodes.has(response.status) && attempt < maxAttempts) {
        await wait(500 * attempt);
        continue;
      }

      throw new LLMRequestError(detail || `请求失败（${response.status}）`, { status: response.status });
    }

    break;
  }

  const data = await response?.json();
  const message = data?.choices?.[0]?.message?.content;
  if (!message || typeof message !== 'string') {
    throw new Error('LLM response missing choices[0].message.content');
  }

  return { content: message, status: 'done' as const };
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

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [createInitialSession()],
      activeSessionId: undefined,
      generatingSessionIds: [],
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

        inflightRequests.get(targetId)?.abort();
        const controller = new AbortController();
        inflightRequests.set(targetId, controller);

        const user: ChatMessage = { id: uid(), role: 'user', content, createdAt: now(), status: 'done' };
        const assistant = buildAssistantMessage();

        set((state) => ({
          generatingSessionIds: [...new Set([...state.generatingSessionIds, targetId])],
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
          const result = await requestAssistantReply({ ...session, messages: [...session.messages, user] }, content, controller.signal);
          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== targetId),
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
          const wasAborted = error instanceof Error && error.name === 'AbortError';
          if (wasAborted) {
            set((state) => ({
              generatingSessionIds: state.generatingSessionIds.filter((id) => id !== targetId),
              sessions: state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((message) =>
                        message.id === assistant.id
                          ? { ...message, status: 'error', content: '已停止生成。' }
                          : message,
                      ),
                    }
                  : item,
              ),
            }));
            return;
          }

          const detail = getFriendlyErrorMessage(error);

          set((state) => ({
            generatingSessionIds: state.generatingSessionIds.filter((id) => id !== targetId),
            sessions: sortedSessions(
              state.sessions.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      messages: item.messages.map((msg) =>
                        msg.id === assistant.id
                          ? {
                              ...msg,
                              status: 'error',
                              content: `⚠️ ${detail}`,
                            }
                          : msg,
                      ),
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
      },
      clearContext: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: [], summary: '开始你的第一条消息', memorySummary: '', pinnedMemory: '', updatedAt: now() }
              : session,
          ),
        })),
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
      deleteMessage: (sessionId, messageId) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, messages: session.messages.filter((message) => message.id !== messageId), updatedAt: now() }
              : session,
          ),
        })),
      editUserMessage: (sessionId, messageId, content) => {
        if (!content.trim()) return;
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== sessionId) return session;
            return {
              ...session,
              updatedAt: now(),
              messages: session.messages.map((message) => {
                if (message.id !== messageId || message.role !== 'user') return message;
                return {
                  ...message,
                  content,
                  originalContent: message.originalContent ?? message.content,
                };
              }),
            };
          }),
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
    {
      name: 'echoai-chats',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
