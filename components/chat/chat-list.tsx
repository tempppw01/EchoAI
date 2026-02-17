'use client';

import { motion } from 'framer-motion';
import { Pin, Search, Star, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/stores/chat-store';

export function ChatList({ search, setSearch, closeMobile }: { search: string; setSearch: (v: string) => void; closeMobile?: () => void }) {
  const { sessions, activeSessionId, selectSession, updateSession, deleteSession } = useChatStore();
  const filtered = sessions.filter((s) => `${s.title} ${s.summary}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2"><Search size={15} /><Input placeholder="搜索历史记录..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">没有匹配的历史记录。</p> : filtered.map((item) => (
          <motion.button layout key={item.id} className={`group w-full rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${item.id === (activeSessionId ?? sessions[0]?.id) ? 'border-primary bg-primary/10' : ''}`} onClick={() => {selectSession(item.id); closeMobile?.();}}>
            <div className="flex items-center justify-between text-sm font-medium"><span>{item.title}</span><span className="text-[10px] uppercase text-muted-foreground">{item.mode}</span></div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p>
            <div className="mt-2 hidden gap-1 group-hover:flex">
              <button onClick={(e) => { e.stopPropagation(); updateSession(item.id, { favorite: !item.favorite });}}><Star size={13} /></button>
              <button onClick={(e) => { e.stopPropagation(); updateSession(item.id, { pinned: !item.pinned });}}><Pin size={13} /></button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('确认删除会话？')) deleteSession(item.id);}}><Trash2 size={13} /></button>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
