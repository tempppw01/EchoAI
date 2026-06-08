'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brush,
  History,
  Menu,
  MessageCircle,
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
type WorkspaceGroupKey = 'dialogue' | 'learning' | 'drawing';

type WorkspaceFeature = {
  key: FeatureKey;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  accent: string;
  group: WorkspaceGroupKey;
};

type WorkspaceGroup = {
  key: WorkspaceGroupKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
};

const workspaceGroups: WorkspaceGroup[] = [
  { key: 'dialogue', label: '对话', description: '聊天、内容创作、角色扮演', icon: MessageCircle, accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
  { key: 'learning', label: '学习', description: '测验、对练、复盘', icon: BookOpen, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  { key: 'drawing', label: '绘图', description: '专业图片生成', icon: Brush, accent: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
];

const features: WorkspaceFeature[] = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-300', group: 'dialogue' },
  { key: 'videoScript', label: '内容创作', mode: 'videoScript', icon: Video, accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300', group: 'dialogue' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'bg-teal-500/10 text-teal-600 dark:text-teal-300', group: 'dialogue' },
  { key: 'training', label: '学习对练', mode: 'training', icon: BookOpen, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', group: 'learning' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, accent: 'bg-slate-500/10 text-slate-600 dark:text-slate-300', group: 'drawing' },
];

const modeToFeature = (mode: ChatMode): FeatureKey => {
  if (mode === 'copywriting' || mode === 'videoScript') return 'videoScript';
  if (mode === 'roleplay') return 'roleplay';
  if (mode === 'training') return 'training';
  if (mode === 'image' || mode === 'proImage') return 'image';
  return 'chat';
};

const featureToGroup = (feature: FeatureKey): WorkspaceGroupKey => features.find((item) => item.key === feature)?.group || 'dialogue';
const groupFeatures = (group: WorkspaceGroupKey) => features.filter((feature) => feature.group === group);
const defaultFeatureForGroup = (group: WorkspaceGroupKey) => groupFeatures(group)[0]?.key || 'chat';
const SIDEBAR_MIN_WIDTH = 248;
const SIDEBAR_MAX_WIDTH = 340;
const SIDEBAR_DEFAULT_WIDTH = 280;

export function Workspace({ mode }: { mode: ChatMode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<FeatureKey>(modeToFeature(mode));
  const [activeGroup, setActiveGroup] = useState<WorkspaceGroupKey>(featureToGroup(modeToFeature(mode)));
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
    setActiveGroup(featureToGroup(targetSection));

    if (active && modeToFeature(active.mode) === targetSection) return;

    const existing = sessions.find((item) => modeToFeature(item.mode) === targetSection);
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
    setActiveGroup((current) => {
      const nextGroup = featureToGroup(activeSection);
      return current === nextGroup ? current : nextGroup;
    });
  }, [active]);

  useEffect(() => {
    if (active && modeToFeature(active.mode) === section) return;

    const existing = sessions.find((item) => modeToFeature(item.mode) === section);
    if (existing) {
      selectSession(existing.id);
      return;
    }

    const targetMode = features.find((item) => item.key === section)?.mode;
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
  }, [active, activeCharacterId, activeWorldId, createSession, recentCharacterId, section, selectSession, sessions]);

  const openFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);
    setActiveGroup(featureToGroup(target));
    const targetMode = features.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    const existing = sessions.find((item) => modeToFeature(item.mode) === target);
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

  const openGroup = (target: WorkspaceGroupKey) => {
    setSearch('');
    setActiveGroup(target);
    const activeFeature = active ? modeToFeature(active.mode) : undefined;
    if (activeFeature && featureToGroup(activeFeature) === target) {
      setSection(activeFeature);
      return;
    }

    const existing = sessions.find((item) => featureToGroup(modeToFeature(item.mode)) === target);
    if (existing) {
      const nextFeature = modeToFeature(existing.mode);
      setSection(nextFeature);
      selectSession(existing.id);
      return;
    }

    openFeature(defaultFeatureForGroup(target));
  };

  const createInFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);
    setActiveGroup(featureToGroup(target));
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
  const visibleSession = active && modeToFeature(active.mode) === section
    ? active
    : sessions.find((sessionItem) => modeToFeature(sessionItem.mode) === section);
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
            className="relative hidden min-w-0 overflow-visible border-r bg-card/30 p-3 md:flex md:flex-col"
            style={{ width: sidebarWidth }}
          >
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute -right-4 top-4 z-30 rounded-full border-primary/20 bg-card shadow-lg shadow-slate-900/10"
              onClick={() => setWorkspaceCollapsed(true)}
              aria-label="折叠工作区侧栏"
              title="折叠工作区侧栏"
              aria-expanded={!workspaceCollapsed}
            >
              <PanelLeftClose size={15} />
            </Button>
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
              className="group absolute -right-1.5 top-0 z-20 h-full w-3 cursor-col-resize outline-none"
              title="拖动调整侧栏宽度"
            >
              <span className="absolute left-1/2 top-16 h-14 w-1 -translate-x-1/2 rounded-full bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/70" />
            </div>
            <div className="min-h-0 overflow-y-auto">
              <SidebarNav
                section={section}
                activeGroup={activeGroup}
                sessions={sessions}
                activeSessionId={visibleSession?.id ?? activeSessionId}
                onSelectGroup={openGroup}
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

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {workspaceCollapsed && (
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute left-3 top-3 z-20 rounded-full border-primary/20 bg-card shadow-lg shadow-slate-900/10 md:left-4"
              onClick={() => setWorkspaceCollapsed(false)}
              aria-label="展开工作区侧栏"
              title="展开工作区侧栏"
              aria-expanded={!workspaceCollapsed}
            >
              <PanelLeftOpen size={15} />
            </Button>
          )}
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
            <div className="min-h-0 overflow-y-auto">
              <SidebarNav
                section={section}
                activeGroup={activeGroup}
                sessions={sessions}
                activeSessionId={visibleSession?.id ?? activeSessionId}
                onSelectGroup={(key) => {
                  openGroup(key);
                  setSidebarOpen(false);
                }}
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

function SidebarNav({
  section,
  activeGroup,
  sessions,
  activeSessionId,
  onSelectGroup,
  onSelectFeature,
  onSelectSession,
  onCreate,
}: {
  section: FeatureKey;
  activeGroup: WorkspaceGroupKey;
  sessions: ReturnType<typeof useChatStore.getState>['sessions'];
  activeSessionId?: string;
  onSelectGroup: (key: WorkspaceGroupKey) => void;
  onSelectFeature: (key: FeatureKey) => void;
  onSelectSession: (id: string) => void;
  onCreate: (key: FeatureKey) => void;
}) {
  const { deleteSession, regenerateSessionTitle } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: ChatSession } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const activeFeature = features.find((item) => item.key === section) || features[0];
  const activeFeatures = groupFeatures(activeGroup);
  const activeFeatureSessions = sessions.filter((sessionItem) => modeToFeature(sessionItem.mode) === section).slice(0, 6);

  return (
    <>
      <div className="min-w-0 space-y-3 overflow-hidden" onClick={() => setContextMenu(null)}>
        <div className="grid gap-2">
          {workspaceGroups.map((group) => {
            const Icon = group.icon;
            const count = sessions.filter((sessionItem) => featureToGroup(modeToFeature(sessionItem.mode)) === group.key).length;
            const isActive = activeGroup === group.key;

            if (!isActive) {
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => onSelectGroup(group.key)}
                  className="cursor-pointer rounded-2xl border border-border/60 bg-background/70 p-3 text-left text-foreground transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', group.accent)}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{group.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{group.description}</span>
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/75 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {count}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <div key={group.key} className="min-w-0 overflow-hidden rounded-[24px] border border-primary/30 bg-primary/[0.06] p-2.5 text-primary shadow-sm">
                <div className="flex items-center gap-3 px-0.5">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', group.accent)}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{group.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{group.description}</span>
                  </span>
                  <span className="rounded-full border border-primary/20 bg-background/85 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {count}
                  </span>
                </div>

                <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-primary/15 bg-background/72 p-2.5 text-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">当前：{activeFeature.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">选择功能，或新建一个话题</p>
                    </div>
                    <Button size="sm" variant="primary" className="h-8 px-2.5 text-[11px]" onClick={() => onCreate(section)}>
                      <Plus size={13} />
                      新建话题
                    </Button>
                  </div>

                  <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
                    {activeFeatures.map((feature) => {
                      const FeatureIcon = feature.icon;
                      const isActiveFeature = section === feature.key;

                      return (
                        <button
                          key={feature.key}
                          type="button"
                          onClick={() => onSelectFeature(feature.key)}
                          className={cn(
                            'inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition hover:-translate-y-0.5',
                            isActiveFeature ? 'border-primary bg-primary text-white shadow-sm shadow-primary/15' : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
                          )}
                        >
                          <FeatureIcon size={12} className="shrink-0" />
                          <span className="truncate">{feature.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {section === 'videoScript' && (
                    <div className="mt-3 min-w-0 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      参数在底部输入区，可填写产品、样本和热搜。
                    </div>
                  )}

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
            );
          })}
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
