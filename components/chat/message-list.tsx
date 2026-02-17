'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, RefreshCcw, RotateCw, Trash2 } from 'lucide-react';
import { ChatMode, ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';

const modeStarterMap: Record<Exclude<ChatMode, 'image' | 'proImage'>, { title: string; hint: string; prompts: string[] }> = {
  chat: {
    title: '通用对话工作台',
    hint: '从任意问题开始，系统会保留上下文并支持导出。',
    prompts: ['请帮我总结今天的工作重点，并按优先级排序。', '用 5 条建议优化一个个人知识管理系统。', '把下面内容改写成更专业、简洁的表达。'],
  },
  copywriting: {
    title: '文案生成中心',
    hint: '支持广告文案、社媒口播、活动标题等快速生成。',
    prompts: ['写 3 条电商产品卖点文案，语气年轻，包含行动号召。', '为“效率工具”写一条小红书风格开场文案。', '根据“周年庆 7 折”主题，给我 10 个宣传标题。'],
  },
  videoScript: {
    title: '视频脚本工坊',
    hint: '可快速生成分镜、旁白和短视频节奏脚本。',
    prompts: ['写一个 60 秒短视频脚本，主题是“早起提升效率”。', '按“开场钩子-痛点-方案-CTA”结构生成口播脚本。', '把这个产品介绍改成 3 段式视频解说词。'],
  },
  roleplay: {
    title: '角色扮演模式',
    hint: '让 AI 扮演特定身份进行陪练、问答或模拟对话。',
    prompts: ['你现在扮演产品面试官，连续问我 5 个问题并点评。', '扮演英语口语教练，和我进行一轮情景对话。', '扮演严谨的代码 reviewer，帮我检查一个 PR 描述。'],
  },
  training: {
    title: '技能训练台',
    hint: '可进行结构化训练：计划、打卡、复盘与纠偏。',
    prompts: ['帮我制定一个 14 天的 Prompt 工程训练计划。', '给我一个“每日写作训练”模板，包含评分标准。', '根据“沟通表达”目标，设计 7 天练习任务。'],
  },
};

export function MessageList({ session }: { session?: ChatSession }) {
  const { updateSession, retryMessage, regenerateLastAssistant, sendMessage } = useChatStore();
  if (!session) return null;

  // 导出当前会话为纯文本，便于用户做二次整理。
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
      <div className="flex justify-end gap-2">
        <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={() => regenerateLastAssistant(session.id)}><RotateCw size={13} />重新生成</button>
        <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={exportContent}><Download size={13} />导出内容</button>
      </div>
      {session.messages.length === 0 && session.mode !== 'image' && session.mode !== 'proImage' && (
        <div className="chat-panel p-5">
          <h3 className="text-base font-semibold">{modeStarterMap[session.mode].title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{modeStarterMap[session.mode].hint}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {modeStarterMap[session.mode].prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt, session.id)}
                className="rounded-xl border bg-muted/30 px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      {session.messages.map((msg) => (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`${msg.role === 'user' ? 'chat-bubble-user ml-auto max-w-[90%] md:max-w-[78%]' : 'chat-bubble-assistant mr-auto max-w-[95%] md:max-w-[82%]'} p-4`}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className } = props;
                  const value = String(children).replace(/\n$/, '');
                  const isBlock = className?.includes('language-');
                  if (!isBlock) return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
                  return (
                    <div className="relative">
                      <pre className="overflow-x-auto rounded bg-muted p-2"><code>{value}</code></pre>
                      <button className="absolute right-2 top-2 rounded border bg-background px-1 py-0.5 text-xs" onClick={() => navigator.clipboard.writeText(value)}>复制代码</button>
                    </div>
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
          <div className="mt-2 flex gap-2 text-xs opacity-70">
            <button onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
            {msg.role === 'user' && <button onClick={() => retryMessage(session.id, msg.id)}><RefreshCcw size={14} /></button>}
            <button onClick={() => updateSession(session.id, { messages: session.messages.filter((m) => m.id !== msg.id) })}><Trash2 size={14} /></button>
            {msg.status === 'streaming' && <span className="animate-pulse">streaming...</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
