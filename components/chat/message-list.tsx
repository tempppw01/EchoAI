'use client';

import { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Copy, Download, Pencil, RefreshCcw, RotateCw, Trash2, UserRound } from 'lucide-react';
import { ChatMode, ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';

const modeStarterMap: Record<Exclude<ChatMode, 'image' | 'proImage'>, { title: string; hint: string; prompts: string[] }> = {
  chat: { title: '通用对话工作台', hint: '从任意问题开始，系统会保留上下文。', prompts: ['总结今天的工作重点。', '优化一个个人知识管理系统。'] },
  copywriting: { title: '文案生成中心', hint: '支持广告文案、社媒口播等。', prompts: ['写 3 条电商卖点文案。', '给“周年庆 7 折”生成标题。'] },
  videoScript: { title: '视频脚本工坊', hint: '可快速生成分镜和口播结构。', prompts: ['写一个 60 秒短视频脚本。', '按“钩子-痛点-方案-CTA”输出口播。'] },
  roleplay: { title: '角色扮演模式', hint: '让 AI 扮演特定身份进行陪练。', prompts: ['你扮演产品面试官，连续问我 5 个问题。', '你扮演英语口语教练。'] },
  training: { title: '学习型聊天窗口', hint: '专注做题、讲解、批改与进度跟踪。', prompts: ['请给我一道 Python 基础选择题。', '按选择/判断/填空轮换给我出题。'] },
};

const stabilizeMarkdownForStreaming = (content: string) => {
  let stabilized = content;
  const fenceCount = (stabilized.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) stabilized += '\n```';
  return stabilized;
};

export function MessageList({ session }: { session?: ChatSession }) {
  const { retryMessage, regenerateLastAssistant, sendMessage, deleteMessage, editUserMessage } = useChatStore();
  const apiKey = useSettingsStore((state) => state.settings.apiKey);
  const normalizedApiKey = (apiKey ?? '').trim();
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const [editingId, setEditingId] = useState<string>();
  const [editingText, setEditingText] = useState('');

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
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {modeStarterMap[session.mode].prompts.map((prompt) => (
              <button key={prompt} onClick={() => sendMessage(prompt, session.id)} className="rounded-xl border bg-muted/30 px-3 py-2 text-left text-sm">
                {prompt}
              </button>
            ))}
          </div>
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
  const renderedMarkdown = useMemo(() => (msg.status === 'streaming' ? stabilizeMarkdownForStreaming(msg.content) : msg.content), [msg.content, msg.status]);

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border"><Bot size={15} /></div>}
      <div className={`${isUser ? 'chat-bubble-user ml-auto max-w-[88%]' : 'chat-bubble-assistant mr-auto max-w-[92%]'} p-4`}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{isUser ? '你' : 'EchoAI 助手'}</p>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{renderedMarkdown}</ReactMarkdown>
        </div>
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
