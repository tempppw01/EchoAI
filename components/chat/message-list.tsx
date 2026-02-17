'use client';

import ReactMarkdown from 'react-markdown';
import { Copy, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { ChatSession } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';

export function MessageList({ session }: { session?: ChatSession; onSelect?: (id: string) => void }) {
  const { updateSession } = useChatStore();
  if (!session) return null;
  return (
    <div className="space-y-3">
      {session.messages.map((msg) => (
        <div key={msg.id} className={`rounded-xl border p-3 ${msg.role === 'user' ? 'ml-8 bg-primary/10' : 'mr-8 bg-card'}`}>
          <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
          {msg.imageUrl && <div className="mt-2 rounded border p-2"><img src={msg.imageUrl} alt="generated" className="w-full rounded" /><div className="mt-2 flex gap-2 text-xs"><button>放大预览</button><button>下载</button><button>生成相似</button><button>重新生成</button></div></div>}
          <div className="mt-2 flex gap-2 text-xs opacity-70">
            <button onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
            <button><RotateCcw size={14} /></button>
            <button><RefreshCw size={14} /></button>
            <button onClick={() => updateSession(session.id, { messages: session.messages.filter((m) => m.id !== msg.id) })}><Trash2 size={14} /></button>
            {msg.status === 'streaming' && <span className="animate-pulse">streaming...</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
