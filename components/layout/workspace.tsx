'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Brush,
  ChevronDown,
  ChevronUp,
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
import { useTheme } from 'next-themes';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSettingsStore } from '@/stores/settings-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useUIStore } from '@/stores/ui-store';

type SectionKey = 'chat' | 'videoScript' | 'roleplay' | 'training' | 'image';

type Section = {
  key: SectionKey;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  accent: string;
};

const sections: Section[] = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
  { key: 'videoScript', label: '内容创作', mode: 'videoScript', icon: Video, accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'bg-teal-500/10 text-teal-600 dark:text-teal-300' },
  { key: 'training', label: '学习对练', mode: 'training', icon: Sparkles, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, accent: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
];

const modeToSection = (mode: ChatMode): SectionKey => {
  if (mode === 'copywriting' || mode === 'videoScript') return 'videoScript';
  if (mode === 'roleplay') return 'roleplay';
  if (mode === 'training') return 'training';
  if (mode === 'image' || mode === 'proImage') return 'image';
  return 'chat';
};

export function Workspace({ mode }: { mode: ChatMode }) {
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<SectionKey>(modeToSection(mode));
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    chat: true,
    videoScript: true,
    roleplay: true,
    training: true,
    image: true,
  });
  const [moduleCollapsed, setModuleCollapsed] = useState(false);
  const [trainingTopicDialog, setTrainingTopicDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const [trainingTopicInput, setTrainingTopicInput] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession, startTraining } = useChatStore();
  const { recentCharacterId, activeCharacterId, activeWorldId } = useRoleplayStore();

  const active = useMemo(
    () => sessions.find((sessionItem) => sessionItem.id === (activeSessionId ?? sessions[0]?.id)),
    [sessions, activeSessionId],
  );
  const lastRouteSectionRef = useRef<SectionKey | null>(null);

  useEffect(() => {
    const targetSection = modeToSection(mode);
    if (lastRouteSectionRef.current === targetSection) return;
    lastRouteSectionRef.current = targetSection;
    setSection(targetSection);

    if (active && modeToSection(active.mode) === targetSection) return;

    const existing = sessions.find((item) => modeToSection(item.mode) === targetSection);
    if (existing) {
      selectSession(existing.id);
      return;
    }

    const targetMode = sections.find((item) => item.key === targetSection)?.mode;
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
    const activeSection = modeToSection(active.mode);
    setSection((current) => (current === activeSection ? current : activeSection));
  }, [active]);

  const openSection = (target: SectionKey) => {
    setSearch('');
    setSection(target);
    const targetMode = sections.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    const existing = sessions.find((item) => modeToSection(item.mode) === target);
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

  const createInSection = (target: SectionKey) => {
    setSearch('');
    setSection(target);
    const targetMode = sections.find((item) => item.key === target)?.mode;
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

  const contentMode = active?.mode ?? mode;
  const isRoleplayMode = contentMode === 'roleplay';

  return (
    <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_32%),linear-gradient(180deg,rgba(249,250,251,1),rgba(243,246,248,1))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_32%),linear-gradient(180deg,hsl(222_47%_7%),hsl(222_47%_5%))]">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card/85 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={16} />
          </Button>
          <span className="text-sm font-medium">EchoAI 工作区</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden md:inline-flex"
            onClick={() => setWorkspaceCollapsed((prev) => !prev)}
            aria-label={workspaceCollapsed ? '展开工作区侧栏' : '折叠工作区侧栏'}
          >
            {workspaceCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </Button>
          <ThemeIconButton active={theme === 'light'} label="切换到浅色主题" onClick={() => setTheme('light')} icon={<Sun size={16} />} />
          <ThemeIconButton active={theme === 'dark'} label="切换到深色主题" onClick={() => setTheme('dark')} icon={<Moon size={16} />} />
          <Button variant="ghost" size="icon-sm" aria-label="打开设置中心" title="打开设置中心" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
          </Button>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.08] dark:opacity-[0.04]" />
      </div>

      <div className="relative z-10 flex h-[calc(100vh-56px)] overflow-hidden">
        <aside className={`hidden border-r p-3 md:flex md:flex-col ${workspaceCollapsed ? 'md:hidden' : 'md:w-80'}`}>
          <div className="min-h-0 overflow-y-auto">
            <SidebarNav
              section={section}
              sessions={sessions}
              activeSessionId={active?.id ?? activeSessionId}
              expanded={expanded}
              moduleCollapsed={moduleCollapsed}
              onToggleModule={() => setModuleCollapsed((prev) => !prev)}
              onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              onSelect={openSection}
              onSelectSession={selectSession}
              onCreate={createInSection}
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 border-t pt-3">
            <ChatList search={search} setSearch={setSearch} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {workspaceCollapsed && (
            <div className="px-3 pt-3 md:px-6">
              <Button variant="secondary" size="sm" onClick={() => setWorkspaceCollapsed(false)}>
                <PanelLeftOpen size={14} className="mr-1" />
                展开工作区
              </Button>
            </div>
          )}
          {contentMode !== 'roleplay' && section !== 'chat' && (
            <div className="px-3 pt-3 md:px-6 md:pt-6">
              <WorkspaceIntro section={section} session={active} sessions={sessions} onOpenSection={openSection} />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={section + (active?.id ?? '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className={cn('min-h-0 flex-1 overflow-hidden', isRoleplayMode ? 'overscroll-none p-2 md:p-3' : 'overflow-y-auto p-3 md:p-4')}>
                <div className={cn('mx-auto w-full', isRoleplayMode ? 'h-full max-w-none overflow-hidden' : section === 'chat' ? 'max-w-4xl' : 'max-w-5xl')}>
                  {contentMode === 'proImage' || contentMode === 'image' ? (
                    <div className="space-y-6">
                      <ProImagePanel session={active} />
                      <MessageList session={active} />
                    </div>
                  ) : contentMode === 'roleplay' ? (
                    <RoleplayStudio session={active} />
                  ) : (
                    <MessageList session={active} />
                  )}
                </div>
              </div>
              {contentMode !== 'roleplay' && (
                <div className={cn('mx-auto w-full', section === 'chat' ? 'max-w-4xl' : 'max-w-5xl')}>
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
                sessions={sessions}
                activeSessionId={active?.id ?? activeSessionId}
                expanded={expanded}
                moduleCollapsed={moduleCollapsed}
                onToggleModule={() => setModuleCollapsed((prev) => !prev)}
                onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                onSelect={(key) => {
                  openSection(key);
                  setSidebarOpen(false);
                }}
                onSelectSession={(id) => {
                  selectSession(id);
                  setSidebarOpen(false);
                }}
                onCreate={(key) => {
                  createInSection(key);
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

function ThemeIconButton({ active, label, onClick, icon }: { active: boolean; label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <Button
      type="button"
      variant={active ? 'tint' : 'ghost'}
      size="icon-sm"
      className="rounded-full"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

function WorkspaceIntro({
  section,
  session,
  sessions,
  onOpenSection,
}: {
  section: SectionKey;
  session?: ChatSession;
  sessions: ChatSession[];
  onOpenSection: (key: SectionKey) => void;
}) {
  const hasApiKey = useSettingsStore((state) => Boolean(state.settings.apiKey?.trim()));
  const currentSection = sections.find((item) => item.key === section);
  const sectionSessionCount = sessions.filter((item) => modeToSection(item.mode) === section).length;
  const messageCount = session?.messages.length ?? 0;
  const lastTitle = session?.title || '准备开始新的会话';
  const quickActions: Array<{ key: SectionKey; label: string; hint: string }> = [
    { key: 'chat', label: '通用对话', hint: '问答与思路整理' },
    { key: 'videoScript', label: '内容创作', hint: '文案 / 脚本 / 热点' },
    { key: 'roleplay', label: '角色扮演', hint: '带角色的连续对话' },
    { key: 'image', label: '专业绘图', hint: '提示词与出图工作流' },
  ];
  const stats = [
    { label: '当前会话', value: lastTitle, sublabel: `${messageCount} 条消息` },
    { label: '同类会话', value: `${sectionSessionCount} 条`, sublabel: currentSection?.label || '当前模式' },
    { label: '工作方式', value: 'Markdown + 附件', sublabel: 'Enter 发送，Shift+Enter 换行' },
  ];

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
      {!hasApiKey && (
        <div className="border-b border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-100 md:px-5">
          <span className="inline-flex items-center gap-2 font-medium">
            <Sparkles size={12} />
            还没有配置 API Key
          </span>
          <p className="mt-1 leading-5 text-amber-900/80 dark:text-amber-100/80">
            你可以继续浏览和编辑页面，但真正发送消息前建议先去设置中心补上；如果服务端已有回退密钥，这里也会自动继续工作。
          </p>
        </div>
      )}

      <div className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_0.8fr] md:px-5 md:py-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Sparkles size={12} />
            当前模式 · {currentSection?.label || '工作台'}
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground md:text-2xl">把对话、文件和上下文放进同一张工作台</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            支持 Markdown、附件上传、会话续写和多模式切换。先从一句话开始，后续内容会自动接在同一个上下文里。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.map((item) => {
              const active = item.key === section;
              return (
                <Button
                  key={item.key}
                  variant={active ? 'tint' : 'secondary'}
                  size="pill"
                  className="h-9 px-4"
                  onClick={() => onOpenSection(item.key)}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">{item.hint}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                'rounded-2xl border p-3 shadow-sm',
                index === 0 ? 'border-primary/20 bg-primary/5' : 'border-border/70 bg-background/70',
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sublabel}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/65 px-4 py-3 text-xs text-muted-foreground md:px-5">
        <span>输入后会自动保留上下文，附件、代码块和长文本都会按同一条会话继续整理。</span>
        <div className="flex flex-wrap gap-2">
          {sessions
            .filter((item) => modeToSection(item.mode) === section)
            .slice(0, 3)
            .map((item) => (
              <span key={item.id} className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] text-foreground/80">
                {item.title}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function SidebarNav({
  section,
  sessions,
  activeSessionId,
  expanded,
  moduleCollapsed,
  onToggleModule,
  onToggle,
  onSelect,
  onSelectSession,
  onCreate,
}: {
  section: SectionKey;
  sessions: ReturnType<typeof useChatStore.getState>['sessions'];
  activeSessionId?: string;
  expanded: Record<SectionKey, boolean>;
  moduleCollapsed: boolean;
  onToggleModule: () => void;
  onToggle: (key: SectionKey) => void;
  onSelect: (key: SectionKey) => void;
  onSelectSession: (id: string) => void;
  onCreate: (key: SectionKey) => void;
}) {
  const { deleteSession, regenerateSessionTitle } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; session: ChatSession } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

  return (
    <>
      <div className="space-y-3" onClick={() => setContextMenu(null)}>
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">工作区模块</p>
          <button
            onClick={onToggleModule}
            className="ui-icon-button h-7 w-7 rounded-md border-transparent bg-transparent"
            aria-label={moduleCollapsed ? '展开工作区模块' : '折叠工作区模块'}
          >
            {moduleCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
        {moduleCollapsed && <p className="px-2 text-xs text-muted-foreground">模块列表已折叠</p>}
        {!moduleCollapsed &&
          sections.map((item) => {
            const recentSessions = sessions.filter((sessionItem) => modeToSection(sessionItem.mode) === item.key).slice(0, 3);
            const Icon = item.icon;
            const isOpen = expanded[item.key];

            return (
              <div
                key={item.key}
                className={cn(
                  'group rounded-2xl border p-1.5 transition',
                  section === item.key ? 'border-primary/20 bg-primary/[0.045]' : 'border-transparent hover:border-border/70 hover:bg-card/55',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelect(item.key)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition',
                      section === item.key ? 'bg-background/90 text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground',
                    )}
                    title={`进入${item.label}`}
                  >
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', item.accent)}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {recentSessions.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ui-icon-button h-8 w-8 shrink-0 rounded-xl border-transparent bg-transparent"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggle(item.key);
                    }}
                    aria-label={isOpen ? `收起${item.label}` : `展开${item.label}`}
                  >
                    <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-1.5 space-y-1 pl-10 pr-1">
                    <button
                      type="button"
                      className="flex h-8 w-full items-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/35 px-2.5 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                      onClick={() => onCreate(item.key)}
                      title={`新建${item.label}会话`}
                    >
                      <Plus size={12} />
                      新建{item.label}
                    </button>
                    {recentSessions.length > 0 && (
                      <div className="space-y-1">
                        {recentSessions.map((sessionItem) => {
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
                                'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition',
                                isActiveSession
                                  ? 'border-primary/35 bg-primary/10 text-primary shadow-sm'
                                  : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/70 hover:text-foreground',
                              )}
                              title={`${sessionItem.title}（点击切换，右键管理）`}
                            >
                              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isActiveSession ? 'bg-primary' : 'bg-muted-foreground/35')} />
                              <span className="min-w-0 flex-1 truncate font-medium">{sessionItem.title}</span>
                              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{isActiveSession ? '当前' : '进入'}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
