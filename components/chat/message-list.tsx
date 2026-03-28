'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, ChevronDown, ChevronUp, Copy, Download, Heart, Pencil, RefreshCcw, RotateCw, Trash2, UserRound } from 'lucide-react';
import { VideoScriptStateCard } from '@/components/chat/video-script-state-card';
import { Button } from '@/components/ui/button';
import { ChatMode, ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';

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

const extractRecallSamples = (content: string) => {
  const marker = '【召回到的示范样本】';
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    return { cleanedContent: content, samples: [] as Array<{ title: string; content: string }> };
  }

  const tail = content.slice(markerIndex + marker.length);
  const tailEndCandidates = ['【用户本次需求】', '【输出格式要求】'];
  const endIndex = tailEndCandidates
    .map((token) => tail.indexOf(token))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? tail.length;

  const sampleBlock = tail.slice(0, endIndex).trim();
  const afterBlock = tail.slice(endIndex).trimStart();
  const beforeBlock = content.slice(0, markerIndex).trimEnd();

  const matches = [...sampleBlock.matchAll(/样本(\d+)：([^\n]+)\n([\s\S]*?)(?=\n样本\d+：|$)/g)];
  const samples = matches
    .map((match) => ({
      title: match[2].trim(),
      content: match[3].trim(),
    }))
    .filter((item) => item.title || item.content);

  const parts = [beforeBlock];
  if (samples.length > 0) {
    parts.push(`> 已折叠 ${samples.length} 条召回样本，避免干扰正文阅读。`);
  }
  if (afterBlock) {
    parts.push(afterBlock);
  }

  return {
    cleanedContent: parts.filter(Boolean).join('\n\n').trim(),
    samples,
  };
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

  return matches
    .map((item, idx) => {
      const start = item.index + item.matchText.length;
      const end = idx + 1 < matches.length ? matches[idx + 1].index : normalized.length;
      const body = normalized.slice(start, end).trim();
      return { key: item.key, label: item.label, body };
    })
    .filter((item) => item.body);
};

const parseVideoScriptVersions = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const versionRegex = /(?:^|\n)(?:#{1,3}\s*)?(?:版本\s*[：:]?\s*(\d+)|版本\s*(\d+)|v(?:ersion)?\s*(\d+))\s*\n/gi;
  const matches = [...normalized.matchAll(versionRegex)].map((match) => ({
    index: match.index ?? 0,
    label: `版本 ${match[1] || match[2] || match[3]}`,
    matchText: match[0],
  }));

  if (matches.length >= 2) {
    return matches
      .map((item, idx) => {
        const start = item.index + item.matchText.length;
        const end = idx + 1 < matches.length ? matches[idx + 1].index : normalized.length;
        const body = normalized.slice(start, end).trim();
        const formatted = formatStructuredVideoScript(body);
        const sections = parseVideoScriptSections(formatted);
        return { key: `${item.label}-${idx}`, label: item.label, body: formatted, sections };
      })
      .filter((item) => item.body);
  }

  const sectionStartRegex = /(^|\n)(#{0,2}\s*)?(标题|开头钩子|正文|结尾\s*CTA|结尾CTA|缺失信息确认)[:：]?/g;
  const rawMatches = [...normalized.matchAll(sectionStartRegex)];
  if (rawMatches.length < 8) return null;

  const blocks: Array<{ label: string; body: string; key: string; sections: ReturnType<typeof parseVideoScriptSections> }> = [];
  let buffer: string[] = [];
  let titleCount = 0;

  for (const line of normalized.split('\n')) {
    if (/^#{0,2}\s*标题[:：]?/i.test(line.trim()) && buffer.length > 0) {
      const body = buffer.join('\n').trim();
      if (body) {
        titleCount += 1;
        const formatted = formatStructuredVideoScript(body);
        blocks.push({
          key: `版本 ${titleCount}-${blocks.length}`,
          label: `版本 ${titleCount}`,
          body: formatted,
          sections: parseVideoScriptSections(formatted),
        });
      }
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }

  const tail = buffer.join('\n').trim();
  if (tail) {
    titleCount += 1;
    const formatted = formatStructuredVideoScript(tail);
    blocks.push({
      key: `版本 ${titleCount}-${blocks.length}`,
      label: `版本 ${titleCount}`,
      body: formatted,
      sections: parseVideoScriptSections(formatted),
    });
  }

  return blocks.length >= 2 ? blocks : null;
};

export function MessageList({ session }: { session?: ChatSession }) {
  const { retryMessage, regenerateLastAssistant, deleteMessage, editUserMessage, answerTrainingQuestion, setPreferredCandidate } = useChatStore();
  const [editingId, setEditingId] = useState<string>();
  const [editingText, setEditingText] = useState('');
  const trainingQuestionRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const isTrainingMode = session?.mode === 'training';
  const trainingQuestionStem = session?.trainingCurrentQuestion?.stem;
  const isVideoScriptMode = session?.mode === 'videoScript';
  const lastMessage = session?.messages.at(-1);
  const hasStreamingMessage = session?.messages.some((msg) => msg.status === 'streaming');

  useEffect(() => {
    if (!isTrainingMode || !trainingQuestionStem) return;
    trainingQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isTrainingMode, trainingQuestionStem]);

  useEffect(() => {
    if (!session) return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session]);

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

  const showVideoScriptEmptyState = session.messages.length === 0 && isVideoScriptMode;
  const showVideoScriptLoadingState = isVideoScriptMode && hasStreamingMessage;

  return (
    <div className="space-y-5">
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

      {showVideoScriptEmptyState && (
        <VideoScriptStateCard
          variant="empty"
          title="短视频功能区已就绪，先给我一份素材或需求"
          description="这里支持两种常用工作流：一类是直接生成视频脚本，另一类是粘贴爆款文案做结构拆解。"
          tips={[
            '脚本生成：先填主题、产品、人群、平台和时长，再发送需求。',
            '爆款分析：切到“爆款文案分析”，直接粘贴转录稿或现成文案。',
            '结果会按标题、开头钩子、正文、结尾 CTA 结构化展示。',
          ]}
        />
      )}

      {session.messages.length === 0 && session.mode !== 'image' && session.mode !== 'proImage' && !showVideoScriptEmptyState && (
        <div className="chat-panel p-5">
          <h3 className="text-lg font-semibold tracking-tight">{modeStarterMap[session.mode].title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{modeStarterMap[session.mode].hint}</p>
        </div>
      )}

      {showVideoScriptLoadingState && (
        <VideoScriptStateCard
          variant="loading"
          title="正在整理短视频结果"
          description="我在按短视频场景整理输出结构，优先拆成你更容易直接拿去拍、改、复用的结果。"
          tips={[
            '脚本生成会优先组织标题、开头钩子、正文、结尾 CTA。',
            '爆款分析会优先提取钩子、推进结构、金句和可复用模板。',
          ]}
          compact
        />
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
            session={session}
            msg={msg}
            onEdit={() => {
              setEditingId(msg.id);
              setEditingText(msg.content);
            }}
            onRetry={() => retryMessage(session.id, msg.id)}
            onDelete={() => deleteMessage(session.id, msg.id)}
            onSelectPreferredCandidate={(candidate) => setPreferredCandidate(session.id, candidate)}
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
      <div ref={messageEndRef} />
    </div>
  );
}

const RecallSamplesPreview = memo(function RecallSamplesPreview({ samples }: { samples: Array<{ title: string; content: string }> }) {
  const [open, setOpen] = useState(false);

  if (samples.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-dashed border-white/15 bg-background/35 p-3">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen((prev) => !prev)}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">召回样本</p>
          <p className="mt-1 text-sm text-muted-foreground">已折叠 {samples.length} 条参考样本，不占用正文阅读区。</p>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {samples.map((sample, index) => (
            <div key={`${sample.title}-${index}`} className="rounded-xl border border-white/10 bg-background/55 p-3">
              <p className="text-sm font-semibold">样本 {index + 1}</p>
              <p className="mt-1 text-xs text-muted-foreground">{sample.title}</p>
              <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">{sample.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const MessageItem = memo(function MessageItem({
  session,
  msg,
  onEdit,
  onRetry,
  onDelete,
  onSelectPreferredCandidate,
}: {
  session: ChatSession;
  msg: ChatSession['messages'][number];
  onEdit: () => void;
  onRetry: () => void;
  onDelete: () => void;
  onSelectPreferredCandidate: (candidate?: ChatSession['preferredCandidate']) => void;
}) {
  const isUser = msg.role === 'user';
  const isError = msg.status === 'error';
  const { cleanedContent, samples } = useMemo(() => extractRecallSamples(msg.content), [msg.content]);
  const renderedMarkdown = useMemo(() => {
    const content = msg.status === 'streaming' ? stabilizeMarkdownForStreaming(cleanedContent) : cleanedContent;
    return !isUser ? formatStructuredVideoScript(content) : content;
  }, [cleanedContent, isUser, msg.status]);
  const structuredSections = useMemo(() => (!isUser ? parseVideoScriptSections(renderedMarkdown) : null), [isUser, renderedMarkdown]);
  const versionCards = useMemo(() => (!isUser ? parseVideoScriptVersions(cleanedContent) : null), [cleanedContent, isUser]);
  const showDualCards = !isUser && versionCards && versionCards.length >= 2;
  const preferredCandidate = session.preferredCandidate;

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border"><Bot size={15} /></div>}
      <div className={`${isUser ? 'chat-bubble-user ml-auto max-w-[88%]' : 'chat-bubble-assistant mr-auto max-w-[96%]'} p-4`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isUser ? '用户输入' : 'EchoAI 助手'}</p>
            {!isUser && <p className="mt-1 text-sm font-medium text-foreground/90">{isError ? '生成失败' : showDualCards ? '多版本候选结果' : '生成结果'}</p>}
          </div>
          {msg.status === 'streaming' && <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] text-primary animate-pulse">生成中</span>}
        </div>

        <RecallSamplesPreview samples={samples} />

        {isError && !isUser ? (
          <VideoScriptStateCard
            variant="error"
            title="这次生成没走通"
            description={cleanedContent.replace(/^⚠️\s*/, '') || '模型请求失败，请稍后重试。'}
            tips={[
              '可直接点“重新生成”，沿用上一条用户输入再跑一次。',
              '如果是配置问题，先检查模型、Key 或 Base URL。',
            ]}
            compact
            action={<Button className="h-8 rounded-lg px-3 text-xs" onClick={onRetry}><RefreshCcw size={13} className="mr-1" />重新生成</Button>}
          />
        ) : showDualCards ? (
          <div className="grid gap-4 md:grid-cols-2">
            {versionCards.map((version, index) => {
              const isPreferred = preferredCandidate?.sourceMessageId === msg.id && preferredCandidate?.versionKey === version.key;
              return (
              <div key={version.key} className={`rounded-2xl border p-4 ${index === 0 ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold tracking-tight">{version.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">并排候选回复，可直接对比结构和表达。</p>
                  </div>
                  {index === 0 && <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">推荐先看</span>}
                </div>

                {version.sections && version.sections.length > 0 ? (
                  <div className="space-y-3">
                    {version.sections.map((section) => (
                      <div key={`${version.key}-${section.key}`} className="rounded-xl border border-white/10 bg-background/40 p-3">
                        <p className="mb-2 text-sm font-semibold">{section.label}</p>
                        <div className="message-markdown prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{section.body}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="message-markdown prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{version.body}</ReactMarkdown>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectPreferredCandidate(isPreferred ? undefined : {
                      sourceMessageId: msg.id,
                      versionKey: version.key,
                      label: version.label,
                      content: version.body,
                      savedAt: new Date().toISOString(),
                    })}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${isPreferred ? 'border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                  >
                    <Heart size={14} className={isPreferred ? 'fill-current' : ''} />
                    {isPreferred ? '已作为下一轮参考' : '点赞为下一轮参考'}
                  </button>
                </div>
              </div>
            );})}
          </div>
        ) : structuredSections && structuredSections.length > 0 ? (
          <div className="space-y-3">
            {structuredSections.map((section) => (
              <div key={section.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-sm font-semibold">{section.label}</p>
                <div className="message-markdown prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{section.body}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="message-markdown prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{renderedMarkdown}</ReactMarkdown>
          </div>
        )}

        <div className="mt-3 flex gap-2 text-xs opacity-70">
          <button onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
          {isUser && <button onClick={onEdit}><Pencil size={14} /></button>}
          {isUser && <button onClick={onRetry}><RefreshCcw size={14} /></button>}
          {!isUser && isError && <button onClick={onRetry}><RefreshCcw size={14} /></button>}
          <button onClick={onDelete}><Trash2 size={14} /></button>
        </div>
      </div>
      {isUser && <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><UserRound size={15} /></div>}
    </div>
  );
});

