'use client';

import { motion } from 'framer-motion';
import { Check, Edit2, Pin, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/stores/chat-store';

export function ChatList({ search, setSearch, closeMobile }: { search: string; setSearch: (v: string) => void; closeMobile?: () => void }) {
  // 会话列表只负责“展示 + 轻交互”，实际数据更新交给 zustand store。
  const { sessions, activeSessionId, selectSession, renameSession, deleteSession, togglePinSession } = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const filtered = sessions.filter((s) => `${s.title} ${s.summary}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="chat-panel flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex items-center gap-2"><Search size={15} className="text-muted-foreground" /><Input placeholder="搜索会话..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl" /></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">没有匹配的会话。</p> : filtered.map((item) => (
          <motion.button layout key={item.id} className={`group w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${item.id === (activeSessionId ?? sessions[0]?.id) ? 'border-primary bg-primary/10 shadow-sm' : 'bg-background/70'}`} onClick={() => {selectSession(item.id); closeMobile?.();}}>
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              {editingId === item.id ? (
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7"
                />
              ) : (
                <span className="line-clamp-1">{item.pinned ? '📌 ' : ''}{item.title}</span>
              )}
              <span className="text-[10px] uppercase text-muted-foreground">{item.mode}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p>
            <div className="mt-2 flex gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100">
              {editingId === item.id ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); renameSession(item.id, draftTitle); setEditingId(null); }}><Check size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}><X size={13} /></button>
                </>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setDraftTitle(item.title); }}><Edit2 size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); togglePinSession(item.id); }}><Pin size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('确认删除会话？')) deleteSession(item.id); }}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
