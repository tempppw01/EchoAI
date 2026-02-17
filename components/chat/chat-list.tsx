'use client';

import { motion } from 'framer-motion';
import { Pin, Search, Star, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/button';

export function ChatList({ search, setSearch, closeMobile }: { search: string; setSearch: (v: string) => void; closeMobile?: () => void }) {
  const { sessions, activeSessionId, selectSession, updateSession, deleteSession, createSession } = useChatStore();
  const filtered = sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2"><Search size={16} /><Input placeholder="搜索会话..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Button onClick={() => createSession('chat')}>+ 新建会话（可切换模式）</Button>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? <p className="rounded border border-dashed p-4 text-xs text-muted-foreground">暂无会话，点击上方按钮创建。</p> : filtered.map((item) => (
          <motion.button layout key={item.id} className={`group w-full rounded-lg border p-3 text-left ${item.id === (activeSessionId ?? sessions[0]?.id) ? 'border-primary bg-primary/10' : ''}`} onClick={() => {selectSession(item.id); closeMobile?.();}}>
            <div className="flex items-center justify-between text-sm font-medium"><span>{item.title}</span><span className="text-xs">{item.mode}</span></div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p>
            <div className="mt-2 hidden gap-1 group-hover:flex">
              <button onClick={(e) => { e.stopPropagation(); updateSession(item.id, { favorite: !item.favorite });}}><Star size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); updateSession(item.id, { pinned: !item.pinned });}}><Pin size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); const title = prompt('重命名', item.title); if (title) updateSession(item.id, { title });}}>重命名</button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('确认删除会话？')) deleteSession(item.id);}}><Trash2 size={14} /></button>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
