'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, Trash2 } from 'lucide-react';
import { ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';

export function MessageList({ session }: { session?: ChatSession; onSelect?: (id: string) => void }) {
  const { updateSession } = useChatStore();
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs" onClick={exportContent}><Download size={13} />导出内容</button>
      </div>
      {session.messages.map((msg) => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={msg.id} className={`rounded-xl border p-3 ${msg.role === 'user' ? 'ml-8 bg-primary/10' : 'mr-8 bg-card'}`}>
          <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          <div className="mt-2 flex gap-2 text-xs opacity-70">
            <button onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
            <button onClick={() => updateSession(session.id, { messages: session.messages.filter((m) => m.id !== msg.id) })}><Trash2 size={14} /></button>
            {msg.status === 'streaming' && <span className="animate-pulse">streaming...</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
