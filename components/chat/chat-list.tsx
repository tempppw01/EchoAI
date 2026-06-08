'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat-store';
import { useShallow } from 'zustand/react/shallow';

const modeLabelMap: Record<string, string> = {
  chat: '对话',
  copywriting: '内容',
  videoScript: '内容',
  roleplay: '角色',
  training: '对练',
  image: '绘图',
  proImage: '绘图',
};

export function ChatList({
  search,
  setSearch,
  closeMobile,
}: {
  search: string;
  setSearch: (value: string) => void;
  closeMobile?: () => void;
}) {
  const { sessions, activeSessionId, selectSession, renameSession, deleteSession, clearAllSessions, togglePinSession } = useChatStore(
    useShallow((state) => ({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      selectSession: state.selectSession,
      renameSession: state.renameSession,
      deleteSession: state.deleteSession,
      clearAllSessions: state.clearAllSessions,
      togglePinSession: state.togglePinSession,
    })),
  );

  const [listOpen, setListOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: (typeof sessions)[number] } | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () => sessions.filter((session) => `${session.title} ${session.summary}`.toLowerCase().includes(normalizedSearch)),
    [sessions, normalizedSearch],
  );

  useEffect(() => {
    if (search.trim()) setListOpen(true);
  }, [search]);

  return (
    <div className="flex min-h-0 flex-col gap-2 rounded-2xl border bg-card/60 p-2" onClick={() => setContextMenu(null)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setListOpen((value) => !value)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-primary/5 hover:text-primary"
        >
          <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition ${listOpen ? 'rotate-0' : '-rotate-90'}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-foreground">全部话题</span>
            <span className="block truncate text-[11px] text-muted-foreground">共 {sessions.length} 个，可展开搜索和管理</span>
          </span>
        </button>
      </div>

      {listOpen && (
        <>
          <div className="flex items-center gap-2">
            <Search size={15} className="text-muted-foreground" />
            <Input
              placeholder="搜索会话..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 rounded-xl"
            />
          </div>

          <div className="max-h-72 min-h-0 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">没有匹配的会话。</p>
            ) : (
              filtered.map((item) => (
                <motion.button
                  layout
                  key={item.id}
                  className={`group w-full cursor-pointer rounded-xl border px-2.5 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                    item.id === (activeSessionId ?? sessions[0]?.id)
                      ? 'border-primary/35 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/60 bg-background/55 text-foreground hover:border-primary/30 hover:bg-primary/5'
                  }`}
                  onClick={() => {
                    selectSession(item.id);
                    closeMobile?.();
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setContextMenu({ x: event.clientX, y: event.clientY, session: item });
                  }}
                  title={`${item.title}（点击进入，右键管理）`}
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span className="line-clamp-1">{item.pinned ? '置顶 · ' : ''}{item.title}</span>
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] uppercase text-muted-foreground">
                      {modeLabelMap[item.mode] ?? item.mode}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                    {item.summary && item.summary !== '开始你的第一条消息' ? item.summary : '点击切换到这个会话'}
                  </p>
                </motion.button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-2">
            <span className="text-[11px] text-muted-foreground">右键话题可置顶、重命名或删除</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600" onClick={() => setConfirmClearOpen(true)} disabled={sessions.length === 0}>
              清空全部
            </Button>
          </div>
        </>
      )}

      {contextMenu && (
        <>
          <button className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setContextMenu(null)} aria-label="关闭话题菜单" />
          <div className="fixed z-50 min-w-[168px] rounded-xl border border-border bg-card p-1 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              onClick={() => {
                const nextTitle = window.prompt('重命名话题', contextMenu.session.title);
                if (nextTitle !== null) renameSession(contextMenu.session.id, nextTitle);
                setContextMenu(null);
              }}
            >
              重命名话题
            </button>
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              onClick={() => {
                togglePinSession(contextMenu.session.id);
                setContextMenu(null);
              }}
            >
              {contextMenu.session.pinned ? '取消置顶' : '置顶话题'}
            </button>
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-500 transition hover:bg-muted"
              onClick={() => {
                if (window.confirm(`确认删除“${contextMenu.session.title}”吗？`)) deleteSession(contextMenu.session.id);
                setContextMenu(null);
              }}
            >
              删除话题
            </button>
          </div>
        </>
      )}

      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-2xl">
            <h3 className="text-base font-semibold">清空所有话题</h3>
            <p className="mt-2 text-sm text-muted-foreground">确认删除全部会话话题吗？系统会保留一个新的空白通用对话。</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmClearOpen(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearAllSessions();
                  setSearch('');
                  setListOpen(false);
                  setConfirmClearOpen(false);
                  closeMobile?.();
                }}
              >
                清空
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
