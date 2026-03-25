'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Copy, Download, Pencil, RefreshCcw, RotateCw, Trash2, UserRound } from 'lucide-react';
import { ChatMode, ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';

const modeStarterMap: Record<Exclude<ChatMode, 'image' | 'proImage'>, { title: string; hint: string }> = {
  chat: { title: '通用对话工作台', hint: '从任意问题开始，系统会保留上下文。' },
  copywriting: { title: '文案生成中心', hint: '支持广告文案、社媒口播等。' },
  videoScript: { title: '视频脚本工坊', hint: '可快速生成分镜和口播结构。' },
  roleplay: { title: '角色扮演模式', hint: '让 AI 扮演特定身份进行陪练。' },
  training: { title: '学习型聊天窗口', hint: '专注做题、讲解、批改与进度跟踪。' },
};

const stabilizeMarkdownForStreaming = (content: string) => {
  let stabilized = content;
  const fenceCount = (stabilized.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) stabilized += '\n```';
  return stabilized;
};

const formatStructuredVideoScript = (content: string) => {
  const sectionRules = [
    { pattern: /^标题[:：]\s*/i, replacement: '## 标题\n' },
    { pattern: /^开头钩子[:：]\s*/i, replacement: '## 开头钩子\n' },
    { pattern: /^正文[:：]\s*/i, replacement: '## 正文\n' },
    { pattern: /^结尾\s*CTA[:：]\s*/i, replacement: '## 结尾 CTA\n' },
    { pattern: /^结尾CTA[:：]\s*/i, replacement: '## 结尾 CTA\n' },
    { pattern: /^缺失信息确认[:：]\s*/i, replacement: '## 缺失信息确认\n' },
  ];

  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      for (const rule of sectionRules) {
        if (rule.pattern.test(trimmed)) {
          return trimmed.replace(rule.pattern, rule.replacement);
        }
      }
      if (/^(主题|产品|人群|核心卖点|平台|语气风格|时长|镜头建议)[:：]/.test(trimmed)) {
        return `- **${trimmed.replace(/^([^:：]+)[:：]\s*/, '$1：')}** ${trimmed.replace(/^([^:：]+)[:：]\s*/, '')}`;
      }
      return line;
    })
    .join('\n');
};

const parseVideoScriptSections = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n');
  const markers = [
    { key: 'title', label: '标题', regex: /^#{0,2}\s*标题[:：]?/im },
    { key: 'hook', label: '开头钩子', regex: /^#{0,2}\s*开头钩子[:：]?/im },
    { key: 'body', label: '正文', regex: /^#{0,2}\s*正文[:：]?/im },
    { key: 'cta', label: '结尾 CTA', regex: /^#{0,2}\s*结尾\s*CTA[:：]?/im },
    { key: 'missing', label: '缺失信息确认', regex: /^#{0,2}\s*缺失信息确认[:：]?/im },
  ] as const;

  const matches = markers
    .map((item) => {
      const match = normalized.match(item.regex);
      return match?.index !== undefined ? { ...item, index: match.index, matchText: match[0] } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.index - b.index);

  if (matches.length < 2) return null;

  return matches.map((item, idx) => {
    const start = item.index + item.matchText.length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index : normalized.length;
    const body = normalized.slice(start, end).trim();
    return { key: item.key, label: item.label, body };
  }).filter((item) => item.body);
};

export function MessageList({ session }: { session?: ChatSession }) {
  const { retryMessage, regenerateLastAssistant, deleteMessage, editUserMessage, answerTrainingQuestion } = useChatStore();
  const apiKey = useSettingsStore((state) => state.settings.apiKey);
  const normalizedApiKey = (apiKey ?? '').trim();
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const [editingId, setEditingId] = useState<string>();
  const [editingText, setEditingText] = useState('');
  const trainingQuestionRef = useRef<HTMLDivElement>(null);
  const isTrainingMode = session?.mode === 'training';
  const trainingQuestionStem = session?.trainingCurrentQuestion?.stem;

  useEffect(() => {
    if (!isTrainingMode || !trainingQuestionStem) return;
    trainingQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isTrainingMode, trainingQuestionStem]);

  if (!session) return null;

  const exportContent = () => {
    const text = session.messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {session.mode === 'training' && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-emerald-500/10 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>当前水平分数</span>
            <span className="text-lg font-semibold">{session.trainingScore ?? 60} / 100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-sky-500 to-emerald-500 transition-all" style={{ width: `${session.trainingScore ?? 60}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">主题：{session.trainingTopic || '尚未设置'} · 已完成 {session.trainingRound ?? 0} 题</p>
        </div>
      )}

      {!normalizedApiKey && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p>尚未配置 API Key，发送消息前请先完成设置。</p>
          <button onClick={() => setSettingsOpen(true)} className="mt-2 inline-flex items-center rounded-md border border-amber-400/70 px-2 py-1 text-xs font-medium">
            立即前往设置
          </button>
        </div>
      )}

      {session.messages.length > 0 && (
        <div className="flex justify-end gap-2">
          <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => regenerateLastAssistant(session.id)}>
            <RotateCw size={13} />重新生成
          </button>
          <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={exportContent}>
            <Download size={13} />导出内容
          </button>
        </div>
      )}

      {session.messages.length === 0 && session.mode !== 'image' && session.mode !== 'proImage' && (
        <div className="chat-panel p-5">
          <h3 className="text-base font-semibold">{modeStarterMap[session.mode].title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{modeStarterMap[session.mode].hint}</p>
        </div>
      )}

      {session.messages.map((msg) => {
        if (editingId === msg.id && msg.role === 'user') {
          return (
            <div key={msg.id} className="chat-bubble-user ml-auto max-w-[90%] p-4">
              <textarea className="w-full rounded border bg-background p-2 text-sm" rows={4} value={editingText} onChange={(e) => setEditingText(e.target.value)} />
              <div className="mt-2 flex justify-end gap-2 text-xs">
                <button onClick={() => setEditingId(undefined)} className="rounded border px-2 py-1">取消</button>
                <button
                  onClick={() => {
                    editUserMessage(session.id, msg.id, editingText);
                    setEditingId(undefined);
                  }}
                  className="rounded border px-2 py-1"
                >
                  保存
                </button>
              </div>
            </div>
          );
        }

        return (
          <MessageItem
            key={msg.id}
            msg={msg}
            onEdit={() => {
              setEditingId(msg.id);
              setEditingText(msg.content);
            }}
            onRetry={() => retryMessage(session.id, msg.id)}
            onDelete={() => deleteMessage(session.id, msg.id)}
          />
        );
      })}
      {session.mode === 'training' && session.trainingCurrentQuestion && (
        <div ref={trainingQuestionRef} className="space-y-3 rounded-2xl border bg-card/80 p-4">
          <p className="text-base font-semibold">{session.trainingCurrentQuestion.stem}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {session.trainingCurrentQuestion.options.map((option) => (
              <button
                key={option.id}
                className="min-h-24 rounded-2xl border border-primary/20 bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-cyan-500/20 p-4 text-left text-base font-medium transition hover:scale-[1.01] hover:border-primary/40"
                onClick={() => answerTrainingQuestion(session.id, option.id)}
              >
                <p className="text-xs text-muted-foreground">选项 {option.id}</p>
                <p className="mt-2">{option.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MessageItem = memo(function MessageItem({
  msg,
  onEdit,
  onRetry,
  onDelete,
}: {
  msg: ChatSession['messages'][number];
  onEdit: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const isUser = msg.role === 'user';
  const renderedMarkdown = useMemo(() => {
    const content = msg.status === 'streaming' ? stabilizeMarkdownForStreaming(msg.content) : msg.content;
    return !isUser ? formatStructuredVideoScript(content) : content;
  }, [isUser, msg.content, msg.status]);
  const structuredSections = useMemo(() => (!isUser ? parseVideoScriptSections(renderedMarkdown) : null), [isUser, renderedMarkdown]);

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border"><Bot size={15} /></div>}
      <div className={`${isUser ? 'chat-bubble-user ml-auto max-w-[88%]' : 'chat-bubble-assistant mr-auto max-w-[92%]'} p-4`}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{isUser ? '你' : 'EchoAI 助手'}</p>
        {structuredSections && structuredSections.length > 0 ? (
          <div className="space-y-3">
            {structuredSections.map((section) => (
              <div key={section.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-sm font-semibold">{section.label}</p>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{renderedMarkdown}</ReactMarkdown>
          </div>
        )}
        <div className="mt-2 flex gap-2 text-xs opacity-70">
          <button onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
          {isUser && <button onClick={onEdit}><Pencil size={14} /></button>}
          {isUser && <button onClick={onRetry}><RefreshCcw size={14} /></button>}
          <button onClick={onDelete}><Trash2 size={14} /></button>
          {msg.status === 'streaming' && <span className="animate-pulse">streaming...</span>}
        </div>
      </div>
      {isUser && <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><UserRound size={15} /></div>}
    </div>
  );
});
