'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brush,
  Database,
  History,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Swords,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { RoleplayStudio } from '@/components/chat/roleplay-studio';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { ChatMode, ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useUIStore } from '@/stores/ui-store';

type FeatureKey = 'chat' | 'videoScript' | 'roleplay' | 'training' | 'image';

type WorkspaceFeature = {
  key: FeatureKey;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  accent: string;
  description: string;
};

const features: WorkspaceFeature[] = [
  { key: 'videoScript', label: '内容创作', mode: 'videoScript', icon: Video, accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300', description: '文案、脚本、拆解与剪辑思路' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'bg-teal-500/10 text-teal-600 dark:text-teal-300', description: '角色设定、世界观与沉浸对话' },
  { key: 'training', label: '学习对练', mode: 'training', icon: BookOpen, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', description: '测验、问答、连续训练' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, accent: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', description: '图片生成与绘图参数' },
];

const modeToFeature = (mode: ChatMode): FeatureKey => {
  if (mode === 'copywriting' || mode === 'videoScript') return 'videoScript';
  if (mode === 'roleplay') return 'roleplay';
  if (mode === 'training') return 'training';
  if (mode === 'image' || mode === 'proImage') return 'image';
  return 'videoScript';
};

const isSessionInFeature = (session: ChatSession, feature: FeatureKey) => session.mode !== 'chat' && modeToFeature(session.mode) === feature;
const SIDEBAR_MIN_WIDTH = 248;
const SIDEBAR_MAX_WIDTH = 340;
const SIDEBAR_DEFAULT_WIDTH = 280;

export function Workspace({ mode }: { mode: ChatMode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<FeatureKey>(modeToFeature(mode));
  const [trainingTopicDialog, setTrainingTopicDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const [trainingTopicInput, setTrainingTopicInput] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession, startTraining } = useChatStore();
  const { recentCharacterId, activeCharacterId, activeWorldId } = useRoleplayStore();

  const active = useMemo(
    () => sessions.find((sessionItem) => sessionItem.id === (activeSessionId ?? sessions[0]?.id)),
    [sessions, activeSessionId],
  );
  const lastRouteSectionRef = useRef<FeatureKey | null>(null);

  useEffect(() => {
    const targetSection = modeToFeature(mode);
    if (lastRouteSectionRef.current === targetSection) return;
    lastRouteSectionRef.current = targetSection;
    setSection(targetSection);

    if (active && isSessionInFeature(active, targetSection)) return;

    const existing = sessions.find((item) => isSessionInFeature(item, targetSection));
    if (existing) {
      selectSession(existing.id);
      return;
    }

    const targetMode = features.find((item) => item.key === targetSection)?.mode;
    if (!targetMode) return;

    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, {
        characterId: recentCharacterId ?? activeCharacterId,
        worldId: activeWorldId,
      });
      return;
    }

    if (targetMode === 'training') {
      const sessionId = createSession('training');
      setTrainingTopicDialog({ open: true, sessionId });
      return;
    }

    createSession(targetMode);
  }, [mode, active, sessions, selectSession, createSession, recentCharacterId, activeCharacterId, activeWorldId]);

  useEffect(() => {
    if (!active) return;
    const activeSection = modeToFeature(active.mode);
    setSection((current) => (current === activeSection ? current : activeSection));
  }, [active]);

  const openFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);
    const targetMode = features.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    const existing = sessions.find((item) => isSessionInFeature(item, target));
    if (existing) {
      selectSession(existing.id);
      return;
    }

    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, {
        characterId: recentCharacterId ?? activeCharacterId,
        worldId: activeWorldId,
      });
      return;
    }

    if (targetMode === 'training') {
      const sessionId = createSession('training');
      setTrainingTopicDialog({ open: true, sessionId });
      return;
    }

    createSession(targetMode);
  };

  const createInFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);
    const targetMode = features.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, {
        characterId: recentCharacterId ?? activeCharacterId,
        worldId: activeWorldId,
      });
      return;
    }

    if (targetMode === 'training') {
      const sessionId = createSession('training');
      setTrainingTopicDialog({ open: true, sessionId });
      return;
    }

    createSession(targetMode);
  };

  const sectionFeature = features.find((item) => item.key === section);
  const visibleSession = active && isSessionInFeature(active, section)
    ? active
    : sessions.find((sessionItem) => isSessionInFeature(sessionItem, section));
  const contentMode = visibleSession?.mode ?? sectionFeature?.mode ?? mode;
  const isRoleplayMode = contentMode === 'roleplay';
  const isDarkTheme = resolvedTheme === 'dark';

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + moveEvent.clientX - startX));
      setSidebarWidth(nextWidth);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(249,250,251,1),rgba(243,246,248,1))] text-sm text-muted-foreground dark:bg-[linear-gradient(180deg,hsl(222_47%_7%),hsl(222_47%_5%))]">
        EchoAI 正在启动...
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_32%),linear-gradient(180deg,rgba(249,250,251,1),rgba(243,246,248,1))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_32%),linear-gradient(180deg,hsl(222_47%_7%),hsl(222_47%_5%))]">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card/85 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="打开工作区侧栏" onClick={() => setSidebarOpen(true)}>
            <Menu size={16} />
          </Button>
          <span className="text-sm font-medium">EchoAI</span>
          {!workspaceCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden h-8 w-8 rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-primary md:inline-flex"
              onClick={() => setWorkspaceCollapsed(true)}
              aria-label="折叠工作区侧栏"
              title="折叠工作区侧栏"
              aria-expanded={!workspaceCollapsed}
            >
              <PanelLeftClose size={15} />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggleButton isDark={isDarkTheme} onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')} />
          <Link
            href="/trends"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
            aria-label="打开热搜历史"
            title="打开热搜历史"
          >
            <History size={16} />
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label="打开设置中心" title="打开设置中心" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
          </Button>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.08] dark:opacity-[0.04]" />
      </div>

      <div className="relative z-10 flex h-[calc(100vh-56px)] overflow-hidden">
        {!workspaceCollapsed && (
          <aside
            className="relative hidden min-w-0 overflow-hidden border-r bg-card/30 p-3 md:flex md:flex-col"
            style={{ width: sidebarWidth }}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="拖动调整侧栏宽度"
              aria-valuemin={SIDEBAR_MIN_WIDTH}
              aria-valuemax={SIDEBAR_MAX_WIDTH}
              aria-valuenow={sidebarWidth}
              tabIndex={0}
              onPointerDown={startSidebarResize}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') setSidebarWidth((width) => Math.max(SIDEBAR_MIN_WIDTH, width - 16));
                if (event.key === 'ArrowRight') setSidebarWidth((width) => Math.min(SIDEBAR_MAX_WIDTH, width + 16));
              }}
              className="group absolute -right-1 top-12 z-20 h-[calc(100%-3rem)] w-2 cursor-col-resize outline-none"
              title="拖动调整侧栏宽度"
            >
              <span className="absolute left-1/2 top-10 h-14 w-1 -translate-x-1/2 rounded-full bg-border/70 transition group-hover:bg-primary/50 group-focus-visible:bg-primary/70" />
            </div>
            <div className="no-scrollbar min-h-0 overflow-y-auto">
              <SidebarNav
                section={section}
                sessions={sessions}
                activeSessionId={visibleSession?.id ?? activeSessionId}
                onSelectFeature={openFeature}
                onSelectSession={selectSession}
                onCreate={createInFeature}
              />
            </div>
            <div className="mt-3 min-h-0 flex-1 border-t pt-3">
              <ChatList search={search} setSearch={setSearch} />
            </div>
          </aside>
        )}
        {workspaceCollapsed && (
          <CollapsedSidebarNav
            section={section}
            sessions={sessions}
            onExpand={() => setWorkspaceCollapsed(false)}
            onSelectFeature={openFeature}
          />
        )}

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={section + (visibleSession?.id ?? '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className={cn('min-h-0 flex-1 overflow-hidden', isRoleplayMode ? 'overscroll-none p-2 md:p-3' : 'overflow-y-auto px-3 py-3 md:px-5')}>
                <div className={cn('mx-auto w-full', isRoleplayMode ? 'h-full max-w-none overflow-hidden' : section === 'chat' ? 'max-w-4xl' : 'max-w-5xl')}>
                  {contentMode === 'proImage' || contentMode === 'image' ? (
                    <div className="space-y-6">
                      <ProImagePanel session={visibleSession} />
                      <MessageList session={visibleSession} />
                    </div>
                  ) : contentMode === 'roleplay' ? (
                    <RoleplayStudio session={visibleSession} />
                  ) : (
                    <MessageList session={visibleSession} />
                  )}
                </div>
              </div>
              {contentMode !== 'roleplay' && (
                <div className="w-full">
                  <ChatComposer mode={contentMode} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button className="absolute inset-0 bg-black/45" onClick={() => setSidebarOpen(false)} aria-label="关闭侧边栏" />
          <aside className="absolute left-0 top-0 flex h-full w-[84vw] max-w-xs flex-col border-r bg-background p-3 shadow-xl">
            <div className="no-scrollbar min-h-0 overflow-y-auto">
              <SidebarNav
                section={section}
                sessions={sessions}
                activeSessionId={visibleSession?.id ?? activeSessionId}
                onSelectFeature={(key) => {
                  openFeature(key);
                  setSidebarOpen(false);
                }}
                onSelectSession={(id) => {
                  selectSession(id);
                  setSidebarOpen(false);
                }}
                onCreate={(key) => {
                  createInFeature(key);
                  setSidebarOpen(false);
                }}
              />
            </div>
            <div className="mt-3 min-h-0 flex-1 border-t pt-3">
              <ChatList search={search} setSearch={setSearch} />
            </div>
          </aside>
        </div>
      )}

      {trainingTopicDialog.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">开始学习对练</h3>
            <p className="mt-1 text-sm text-muted-foreground">输入一个你想持续练习的主题，确认后系统会自动连续出题。</p>
            <input
              value={trainingTopicInput}
              onChange={(event) => setTrainingTopicInput(event.target.value)}
              placeholder="例如：Python 基础、英语语法、产品经理面试"
              className="mt-4 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setTrainingTopicDialog({ open: false })}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (!trainingTopicDialog.sessionId || !trainingTopicInput.trim()) return;
                  await startTraining(trainingTopicDialog.sessionId, trainingTopicInput.trim());
                  setTrainingTopicDialog({ open: false });
                  setTrainingTopicInput('');
                }}
              >
                开始测验
              </Button>
            </div>
          </div>
        </div>
      )}

      <SettingsCenter open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function ThemeToggleButton({ isDark, onClick }: { isDark: boolean; onClick: () => void }) {
  const label = isDark ? '切换到浅色主题' : '切换到深色主题';

  return (
    <Button
      type="button"
      variant="tint"
      size="icon-sm"
      className="rounded-full"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </Button>
  );
}

function CollapsedSidebarNav({
  section,
  sessions,
  onExpand,
  onSelectFeature,
}: {
  section: FeatureKey;
  sessions: ReturnType<typeof useChatStore.getState>['sessions'];
  onExpand: () => void;
  onSelectFeature: (key: FeatureKey) => void;
}) {
  return (
    <aside className="relative hidden w-16 shrink-0 border-r bg-card/55 px-2 py-3 backdrop-blur md:flex md:flex-col md:items-center">
      <Button
        variant="secondary"
        size="icon-sm"
        className="h-10 w-10 rounded-2xl border-primary/20 bg-background/90 shadow-sm"
        onClick={onExpand}
        aria-label="展开工作区侧栏"
        title="展开工作区侧栏"
        aria-expanded={false}
      >
        <PanelLeftOpen size={16} />
      </Button>

      <div className="mt-4 flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isActive = section === feature.key;
          const count = sessions.filter((sessionItem) => isSessionInFeature(sessionItem, feature.key)).length;

          return (
            <button
              key={feature.key}
              type="button"
              onClick={() => onSelectFeature(feature.key)}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-primary',
                isActive ? 'border-primary/45 bg-primary/10 text-primary shadow-sm' : 'border-transparent bg-transparent text-muted-foreground',
              )}
              aria-label={`切换到${feature.label}`}
              title={feature.label}
            >
              <Icon size={17} />
              {isActive && <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          );
        })}
        <Link
          href="/samples"
          className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-transparent text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
          aria-label="打开样本库"
          title="样本库"
        >
          <Database size={17} />
        </Link>
      </div>
    </aside>
  );
}

function SidebarNav({
  section,
  sessions,
  activeSessionId,
  onSelectFeature,
  onSelectSession,
  onCreate,
}: {
  section: FeatureKey;
  sessions: ReturnType<typeof useChatStore.getState>['sessions'];
  activeSessionId?: string;
  onSelectFeature: (key: FeatureKey) => void;
  onSelectSession: (id: string) => void;
  onCreate: (key: FeatureKey) => void;
}) {
  const { deleteSession, regenerateSessionTitle } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: ChatSession } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const activeFeature = features.find((item) => item.key === section) || features[0];
  const activeFeatureSessions = sessions.filter((sessionItem) => isSessionInFeature(sessionItem, section)).slice(0, 6);

  return (
    <>
      <div className="min-w-0 space-y-3 overflow-hidden" onClick={() => setContextMenu(null)}>
        <div className="grid gap-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            const count = sessions.filter((sessionItem) => isSessionInFeature(sessionItem, feature.key)).length;
            const isActive = section === feature.key;

            return (
              <button
                key={feature.key}
                type="button"
                onClick={() => onSelectFeature(feature.key)}
                className={cn(
                  'min-w-0 cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm',
                  isActive ? 'border-primary/35 bg-primary/[0.07] text-primary shadow-sm' : 'border-border/60 bg-background/70 text-foreground',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', feature.accent)}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{feature.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{feature.description}</span>
                  </span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', isActive ? 'border-primary/20 bg-background/85 text-primary' : 'border-border/70 bg-background/75 text-muted-foreground')}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}

          <Link
            href="/samples"
            className="cursor-pointer rounded-2xl border border-border/60 bg-background/70 p-3 text-left text-foreground transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
                <Database size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">样本库</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">管理参考样本与召回素材</span>
              </span>
            </div>
          </Link>
        </div>

        <div className="min-w-0 rounded-[24px] border border-primary/20 bg-background/72 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">当前：{activeFeature.label}</p>
            <Button size="sm" variant="primary" className="h-8 px-2.5 text-[11px]" onClick={() => onCreate(section)}>
              <Plus size={13} />
              新建
            </Button>
          </div>

          <div className="mt-3 space-y-1.5">
            {activeFeatureSessions.length === 0 ? (
              <button
                type="button"
                onClick={() => onCreate(section)}
                className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/45 bg-primary/5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
              >
                <Plus size={12} />
                新建{activeFeature.label}
              </button>
            ) : (
              activeFeatureSessions.map((sessionItem) => {
                const isActiveSession = sessionItem.id === activeSessionId;
                return (
                  <button
                    key={sessionItem.id}
                    onClick={() => onSelectSession(sessionItem.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setContextMenu({ x: event.clientX, y: event.clientY, session: sessionItem });
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm',
                      isActiveSession
                        ? 'border-primary/45 bg-primary/10 text-primary shadow-sm'
                        : 'border-border/70 bg-background/75 text-foreground hover:border-primary/30 hover:bg-primary/5',
                    )}
                    title={`${sessionItem.title}（点击切换，右键管理）`}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isActiveSession ? 'bg-primary' : 'bg-muted-foreground/35')} />
                    <span className="min-w-0 flex-1 truncate font-medium">{sessionItem.title}</span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', isActiveSession ? 'bg-background/90 text-primary' : 'bg-primary/10 text-primary')}>
                      {isActiveSession ? '当前' : '点击进入'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {contextMenu && (
        <>
          <button className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setContextMenu(null)} aria-label="关闭会话菜单" />
          <div
            className="fixed z-50 min-w-[180px] rounded-xl border border-border bg-card p-1 shadow-2xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              onClick={async () => {
                const sessionId = contextMenu.session.id;
                setContextMenu(null);
                await regenerateSessionTitle(sessionId);
              }}
            >
              重新生成标题
            </button>
            <button
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-500 transition hover:bg-muted"
              onClick={() => {
                setDeleteTarget(contextMenu.session);
                setContextMenu(null);
              }}
            >
              删除会话
            </button>
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-2xl">
            <h3 className="text-base font-semibold">确认删除会话</h3>
            <p className="mt-2 text-sm text-muted-foreground">确认删除“{deleteTarget.title}”吗？删除后将无法恢复。</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  deleteSession(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
