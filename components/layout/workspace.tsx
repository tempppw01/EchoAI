'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brush,
  Database,
  History,
  Menu,
  MessageSquarePlus,
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
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { RoleplayStudio } from '@/components/chat/roleplay-studio';
import { VideoScriptStateCard } from '@/components/chat/video-script-state-card';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { ChatMode, ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useUIStore } from '@/stores/ui-store';

type FeatureKey = 'chat' | 'videoScript' | 'roleplay' | 'training' | 'image';

/** 模块语义色：每个模块固定一个色相，避免图标底色在模块之间跳动。 */
type FeatureTone = 'primary' | 'info' | 'accent' | 'success' | 'warning';

type WorkspaceFeature = {
  key: FeatureKey;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  description: string;
  tone: FeatureTone;
};

const features: WorkspaceFeature[] = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, description: '问答、头脑风暴与通用任务', tone: 'primary' },
  { key: 'videoScript', label: '内容创作', mode: 'videoScript', icon: Video, description: '文案、脚本、拆解与剪辑思路', tone: 'info' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, description: '角色设定、世界观与沉浸对话', tone: 'accent' },
  { key: 'training', label: '学习对练', mode: 'training', icon: BookOpen, description: '测验、问答、连续训练', tone: 'success' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, description: '图片生成与绘图参数', tone: 'warning' },
];

const toneIconClasses: Record<FeatureTone, string> = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

const toneSolidClasses: Record<FeatureTone, string> = {
  primary: 'bg-primary',
  info: 'bg-info',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
};

const modeToFeature = (mode: ChatMode): FeatureKey => {
  if (mode === 'chat') return 'chat';
  if (mode === 'copywriting' || mode === 'videoScript') return 'videoScript';
  if (mode === 'roleplay') return 'roleplay';
  if (mode === 'training') return 'training';
  if (mode === 'image' || mode === 'proImage') return 'image';
  return 'videoScript';
};

const featureMode = (feature: FeatureKey): ChatMode =>
  features.find((item) => item.key === feature)?.mode ?? 'chat';

const isSessionInFeature = (session: ChatSession, feature: FeatureKey) =>
  modeToFeature(session.mode) === feature;

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

  /**
   * 创建一个属于指定模块的会话。
   * 角色扮演与学习对练需要额外配置，这两种模式必须走这里，
   * 否则新会话会缺少角色 / 世界观 / 训练主题。
   */
  const createSessionForFeature = useCallback(
    (target: FeatureKey) => {
      const targetMode = featureMode(target);

      if (targetMode === 'roleplay') {
        return createSession('roleplay', undefined, undefined, {
          characterId: recentCharacterId ?? activeCharacterId,
          worldId: activeWorldId,
        });
      }

      if (targetMode === 'training') {
        const sessionId = createSession('training');
        setTrainingTopicDialog({ open: true, sessionId });
        return sessionId;
      }

      return createSession(targetMode);
    },
    [createSession, recentCharacterId, activeCharacterId, activeWorldId],
  );

  // 路由变化时定位到目标模块：有可用会话就复用，没有就创建一个。
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

    createSessionForFeature(targetSection);
  }, [mode, active, sessions, selectSession, createSessionForFeature]);

  // 当前会话切换时，模块跟随会话所在的模块。
  useEffect(() => {
    if (!active) return;
    const activeSection = modeToFeature(active.mode);
    setSection((current) => (current === activeSection ? current : activeSection));
  }, [active]);

  /** 打开模块：优先复用已有会话，否则新建。 */
  const openFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);

    const existing = sessions.find((item) => isSessionInFeature(item, target));
    if (existing) {
      selectSession(existing.id);
      return;
    }

    createSessionForFeature(target);
  };

  /** 在模块内总是新建一个会话。 */
  const createInFeature = (target: FeatureKey) => {
    setSearch('');
    setSection(target);
    createSessionForFeature(target);
  };

  const sectionFeature = features.find((item) => item.key === section) ?? features[0];
  const visibleSession =
    active && isSessionInFeature(active, section)
      ? active
      : sessions.find((sessionItem) => isSessionInFeature(sessionItem, section));
  const contentMode = visibleSession?.mode ?? sectionFeature.mode;
  const isRoleplayMode = contentMode === 'roleplay';
  const isImageMode = contentMode === 'image' || contentMode === 'proImage';
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
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        EchoAI 正在启动...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-3 backdrop-blur md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="打开工作区侧栏"
            title="打开工作区侧栏"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={16} />
          </Button>

          {!workspaceCollapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden md:inline-flex"
              onClick={() => setWorkspaceCollapsed(true)}
              aria-label="折叠工作区侧栏"
              title="折叠工作区侧栏"
              aria-expanded={!workspaceCollapsed}
            >
              <PanelLeftClose size={15} />
            </Button>
          )}

          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
              <Sparkles size={13} />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">EchoAI</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggleButton isDark={isDarkTheme} onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            aria-label="打开设置中心"
            title="打开设置中心"
          >
            <Settings size={16} />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {!workspaceCollapsed && (
          <aside
            className="relative hidden min-w-0 shrink-0 overflow-hidden border-r bg-surface-soft/40 md:flex md:flex-col"
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
              className="group absolute -right-1 top-10 z-20 h-[calc(100%-2.5rem)] w-2 cursor-col-resize outline-none"
              title="拖动调整侧栏宽度"
            >
              <span className="absolute left-1/2 top-10 h-14 w-1 -translate-x-1/2 rounded-full bg-border transition group-hover:bg-primary/50 group-focus-visible:bg-primary/70" />
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
              <SidebarNav
                section={section}
                sessions={sessions}
                activeSessionId={visibleSession?.id ?? activeSessionId}
                onSelectFeature={openFeature}
                onSelectSession={selectSession}
                onCreate={createInFeature}
              />
            </div>

            <div className="min-h-0 border-t px-2.5 py-3">
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
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-card/60 px-3 md:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  toneIconClasses[sectionFeature.tone],
                )}
              >
                <sectionFeature.icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {sectionFeature.label}
                </p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {sectionFeature.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {visibleSession && (
                <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground lg:block">
                  {visibleSession.title}
                </span>
              )}
              <Button size="sm" variant="secondary" onClick={() => createInFeature(section)}>
                <Plus size={14} />
                新建会话
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={section + (visibleSession?.id ?? '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div
                className={cn(
                  'min-h-0 flex-1 overflow-hidden',
                  isRoleplayMode ? 'overscroll-none p-2 md:p-3' : 'overflow-y-auto px-3 py-4 md:px-6',
                )}
              >
                <div
                  className={cn(
                    'mx-auto w-full',
                    isRoleplayMode
                      ? 'h-full max-w-none overflow-hidden'
                      : section === 'chat'
                        ? 'max-w-3xl'
                        : 'max-w-5xl',
                  )}
                >
                  {!visibleSession && !isRoleplayMode ? (
                    section === 'videoScript' ? (
                      <VideoScriptStateCard
                        variant="empty"
                        title="还没有内容创作会话"
                        description="从选题、脚本到爆款拆解，输出结构化到可以直接开拍的程度。"
                        tips={[
                          '先给一个主题或对标账号，剩下的交给它补齐。',
                          '脚本会按标题、开头钩子、正文、结尾 CTA 组织。',
                          '生成的版本可以直接导出，也可以继续追问细化。',
                        ]}
                        action={
                          <Button size="sm" onClick={() => createInFeature(section)}>
                            <Plus size={14} />
                            新建会话
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={MessageSquarePlus}
                        title={`还没有${sectionFeature.label}会话`}
                        description={sectionFeature.description}
                        action={
                          <Button size="sm" onClick={() => createInFeature(section)}>
                            <Plus size={14} />
                            新建会话
                          </Button>
                        }
                      />
                    )
                  ) : isImageMode ? (
                    <div className="space-y-6">
                      <ProImagePanel session={visibleSession} />
                      <MessageList session={visibleSession} />
                    </div>
                  ) : isRoleplayMode ? (
                    <RoleplayStudio session={visibleSession} />
                  ) : (
                    <MessageList session={visibleSession} />
                  )}
                </div>
              </div>

              {!isRoleplayMode && visibleSession && (
                <div className="w-full">
                  <ChatComposer mode={contentMode} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 bg-scrim/45 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[86vw] max-w-xs flex-col border-r bg-background shadow-xl">
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
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
            <div className="min-h-0 border-t px-2.5 py-3">
              <ChatList
                search={search}
                setSearch={setSearch}
                closeMobile={() => setSidebarOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}

      <Modal
        open={trainingTopicDialog.open}
        onClose={() => {
          setTrainingTopicDialog({ open: false });
          setTrainingTopicInput('');
        }}
        title="开始学习对练"
        description="输入一个你想持续练习的主题，确认后系统会自动连续出题。"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTrainingTopicDialog({ open: false });
                setTrainingTopicInput('');
              }}
            >
              取消
            </Button>
            <Button
              size="sm"
              disabled={!trainingTopicInput.trim() || !trainingTopicDialog.sessionId}
              onClick={async () => {
                if (!trainingTopicDialog.sessionId || !trainingTopicInput.trim()) return;
                await startTraining(trainingTopicDialog.sessionId, trainingTopicInput.trim());
                setTrainingTopicDialog({ open: false });
                setTrainingTopicInput('');
              }}
            >
              开始测验
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={trainingTopicInput}
          onChange={(event) => setTrainingTopicInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!trainingTopicDialog.sessionId || !trainingTopicInput.trim()) return;
            void startTraining(trainingTopicDialog.sessionId, trainingTopicInput.trim()).then(() => {
              setTrainingTopicDialog({ open: false });
              setTrainingTopicInput('');
            });
          }}
          placeholder="例如：Python 基础、英语语法、产品经理面试"
        />
      </Modal>

      <SettingsCenter open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function ThemeToggleButton({ isDark, onClick }: { isDark: boolean; onClick: () => void }) {
  const label = isDark ? '切换到浅色主题' : '切换到深色主题';

  return (
    <Button
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
  sessions: ChatSession[];
  onExpand: () => void;
  onSelectFeature: (key: FeatureKey) => void;
}) {
  return (
    <aside className="relative hidden w-16 shrink-0 flex-col items-center border-r bg-surface-soft/40 py-3 md:flex">
      <Button
        variant="secondary"
        size="icon-sm"
        className="h-9 w-9"
        onClick={onExpand}
        aria-label="展开工作区侧栏"
        title="展开工作区侧栏"
        aria-expanded={false}
      >
        <PanelLeftOpen size={16} />
      </Button>

      <div className="no-scrollbar mt-4 flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto pb-2">
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
                'group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? cn(toneIconClasses[feature.tone], 'shadow-xs')
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label={`切换到${feature.label}`}
              title={feature.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} />
              {isActive && (
                <span
                  className={cn(
                    'absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full',
                    toneSolidClasses[feature.tone],
                  )}
                />
              )}
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          );
        })}

        <Link
          href="/trends"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="打开热搜历史"
          title="热搜历史"
        >
          <History size={16} />
        </Link>

        <Link
          href="/samples"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="打开样本库"
          title="样本库"
        >
          <Database size={16} />
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
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelectFeature: (key: FeatureKey) => void;
  onSelectSession: (id: string) => void;
  onCreate: (key: FeatureKey) => void;
}) {
  const { deleteSession, regenerateSessionTitle } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: ChatSession } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

  const activeFeature = features.find((item) => item.key === section) ?? features[0];
  const activeFeatureSessions = sessions.filter((sessionItem) => isSessionInFeature(sessionItem, section));

  return (
    <>
      <div className="space-y-3" onClick={() => setContextMenu(null)}>
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">模块</p>

        <nav className="space-y-0.5">
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
                  'group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors',
                  isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                    isActive ? toneIconClasses[feature.tone] : 'bg-muted text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  <Icon size={14} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-tight">{feature.label}</span>
                  {isActive ? (
                    <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                      {feature.description}
                    </span>
                  ) : null}
                </span>

                <span
                  className={cn(
                    'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                    isActive ? 'bg-card text-muted-foreground' : 'text-muted-foreground/70',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <Link
            href="/samples"
            className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
              <Database size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-tight">样本库</span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                参考样本与召回素材
              </span>
            </span>
          </Link>
        </nav>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {activeFeature.label}会话
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => onCreate(section)}
            >
              <Plus size={13} />
              新建
            </Button>
          </div>

          <div className="mt-1.5 space-y-0.5">
            {activeFeatureSessions.length === 0 ? (
              <button
                type="button"
                onClick={() => onCreate(section)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
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
                    type="button"
                    onClick={() => onSelectSession(sessionItem.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setContextMenu({ x: event.clientX, y: event.clientY, session: sessionItem });
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                      isActiveSession
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/85 hover:bg-muted/60 hover:text-foreground',
                    )}
                    title={`${sessionItem.title}（点击切换，右键管理）`}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        isActiveSession ? 'bg-primary' : 'bg-border-strong',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{sessionItem.title}</span>
                    {isActiveSession ? (
                      <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        当前
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {contextMenu && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setContextMenu(null)}
            aria-label="关闭会话菜单"
          />
          <div
            className="fixed z-50 min-w-[176px] rounded-lg border border-border bg-card p-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
              onClick={async () => {
                const sessionId = contextMenu.session.id;
                setContextMenu(null);
                await regenerateSessionTitle(sessionId);
              }}
            >
              重新生成标题
            </button>
            <button
              className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger transition-colors hover:bg-danger/10"
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteSession(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="确认删除会话"
        description={`确认删除“${deleteTarget?.title ?? ''}”吗？删除后将无法恢复。`}
        confirmLabel="删除"
        danger
      />
    </>
  );
}
