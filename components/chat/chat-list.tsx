'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Pin, PinOff, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
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
  const [renameTarget, setRenameTarget] = useState<(typeof sessions)[number] | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<(typeof sessions)[number] | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleSessions = useMemo(() => sessions, [sessions]);
  const filtered = useMemo(
    () => visibleSessions.filter((session) => `${session.title} ${session.summary}`.toLowerCase().includes(normalizedSearch)),
    [visibleSessions, normalizedSearch],
  );

  useEffect(() => {
    if (search.trim()) setListOpen(true);
  }, [search]);

  return (
    <div className="flex min-h-0 flex-col gap-2" onClick={() => setContextMenu(null)}>
      <button
        type="button"
        onClick={() => setListOpen((value) => !value)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted/60"
      >
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform ${listOpen ? '' : '-rotate-90'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-tight text-foreground">全部话题</span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
            共 {visibleSessions.length} 个，可展开搜索和管理
          </span>
        </span>
      </button>

      {listOpen && (
        <>
          <div className="flex items-center gap-2">
            <Search size={15} className="shrink-0 text-muted-foreground" />
            <Input
              placeholder="搜索会话..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8"
            />
          </div>

          <div className="max-h-72 min-h-0 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                没有匹配的会话。
              </p>
            ) : (
              filtered.map((item) => (
                <motion.button
                  layout
                  key={item.id}
                  type="button"
                  className={`group w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors ${
                    item.id === (activeSessionId ?? visibleSessions[0]?.id)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/85 hover:bg-muted/60 hover:text-foreground'
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-[13px] font-medium">
                      {item.pinned ? '置顶 · ' : ''}
                      {item.title}
                    </span>
                    <span className="shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {modeLabelMap[item.mode] ?? item.mode}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-muted-foreground">
                    {item.summary && item.summary !== '开始你的第一条消息' ? item.summary : '点击切换到这个会话'}
                  </p>
                </motion.button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="text-[11px] text-muted-foreground">右键话题可置顶、重命名或删除</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setConfirmClearOpen(true)}
              disabled={visibleSessions.length === 0}
            >
              清空全部
            </Button>
          </div>
        </>
      )}

      {contextMenu && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setContextMenu(null)}
            aria-label="关闭话题菜单"
          />
          <div
            className="fixed z-50 min-w-[168px] rounded-lg border border-border bg-card p-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                setRenameTarget(contextMenu.session);
                setRenameValue(contextMenu.session.title);
                setContextMenu(null);
              }}
            >
              重命名话题
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                togglePinSession(contextMenu.session.id);
                setContextMenu(null);
              }}
            >
              {contextMenu.session.pinned ? <PinOff size={13} /> : <Pin size={13} />}
              {contextMenu.session.pinned ? '取消置顶' : '置顶话题'}
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger transition-colors hover:bg-danger/10"
              onClick={() => {
                setDeleteTarget(contextMenu.session);
                setContextMenu(null);
              }}
            >
              <Trash2 size={13} />
              删除话题
            </button>
          </div>
        </>
      )}

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="重命名话题"
        description="给这个会话一个更容易识别的名字。"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button
              size="sm"
              disabled={!renameValue.trim()}
              onClick={() => {
                if (!renameTarget) return;
                renameSession(renameTarget.id, renameValue.trim());
                setRenameTarget(null);
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!renameTarget || !renameValue.trim()) return;
            renameSession(renameTarget.id, renameValue.trim());
            setRenameTarget(null);
          }}
          placeholder="输入新的会话名称"
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteSession(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="确认删除话题"
        description={`确认删除“${deleteTarget?.title ?? ''}”吗？删除后将无法恢复。`}
        confirmLabel="删除"
        danger
      />

      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearAllSessions();
          setSearch('');
          setListOpen(false);
          setConfirmClearOpen(false);
          closeMobile?.();
        }}
        title="清空所有话题"
        description="确认删除全部会话话题吗？系统会保留一个新的空白通用对话话题。"
        confirmLabel="清空"
        danger
      />
    </div>
  );
}
