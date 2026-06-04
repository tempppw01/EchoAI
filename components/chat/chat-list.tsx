'use client';

import { motion } from 'framer-motion';
import { Check, Edit2, Pin, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/stores/chat-store';
import { useShallow } from 'zustand/react/shallow';

export function ChatList({
  search,
  setSearch,
  closeMobile,
}: {
  search: string;
  setSearch: (value: string) => void;
  closeMobile?: () => void;
}) {
  const { sessions, activeSessionId, selectSession, renameSession, deleteSession, togglePinSession } = useChatStore(
    useShallow((state) => ({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      selectSession: state.selectSession,
      renameSession: state.renameSession,
      deleteSession: state.deleteSession,
      togglePinSession: state.togglePinSession,
    })),
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () => sessions.filter((session) => `${session.title} ${session.summary}`.toLowerCase().includes(normalizedSearch)),
    [sessions, normalizedSearch],
  );

  return (
    <div className="chat-panel flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Search size={15} className="text-muted-foreground" />
        <Input
          placeholder="搜索会话..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded-xl"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">没有匹配的会话。</p>
        ) : (
          filtered.map((item) => (
            <motion.button
              layout
              key={item.id}
              className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                item.id === (activeSessionId ?? sessions[0]?.id) ? 'border-primary bg-primary/10 shadow-sm' : 'bg-background/72'
              }`}
              onClick={() => {
                selectSession(item.id);
                closeMobile?.();
              }}
            >
              <div className="flex items-center justify-between gap-2 text-sm font-medium">
                {editingId === item.id ? (
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="h-7"
                  />
                ) : (
                  <span className="line-clamp-1">{item.pinned ? '置顶 · ' : ''}{item.title}</span>
                )}
                <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] uppercase text-muted-foreground">
                  {item.mode}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary || '暂时还没有摘要。'}</p>

              <div className="mt-2 flex gap-1 opacity-90 md:opacity-0 md:group-hover:opacity-100">
                {editingId === item.id ? (
                  <>
                    <button
                      className="ui-icon-button h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        renameSession(item.id, draftTitle);
                        setEditingId(null);
                      }}
                      aria-label="保存标题"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      className="ui-icon-button h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(null);
                      }}
                      aria-label="取消编辑"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="ui-icon-button h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(item.id);
                        setDraftTitle(item.title);
                      }}
                      aria-label="重命名会话"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="ui-icon-button h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePinSession(item.id);
                      }}
                      aria-label="切换置顶"
                    >
                      <Pin size={13} />
                    </button>
                    <button
                      className="ui-icon-button h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (confirm('确认删除会话？')) deleteSession(item.id);
                      }}
                      aria-label="删除会话"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
