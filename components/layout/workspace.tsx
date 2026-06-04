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
  PenSquare,
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
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useUIStore } from '@/stores/ui-store';

type SectionKey = 'chat' | 'copywriting' | 'videoScript' | 'roleplay' | 'training' | 'image';

type Section = {
  key: SectionKey;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  accent: string;
};

const sections: Section[] = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, accent: 'bg-blue-50 dark:bg-blue-500/10' },
  { key: 'copywriting', label: '文案生成', mode: 'copywriting', icon: PenSquare, accent: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { key: 'videoScript', label: '视频脚本', mode: 'videoScript', icon: Video, accent: 'bg-pink-50 dark:bg-pink-500/10' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'bg-teal-50 dark:bg-teal-500/10' },
  { key: 'training', label: '学习对练', mode: 'training', icon: Sparkles, accent: 'bg-amber-50 dark:bg-amber-500/10' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, accent: 'bg-purple-50 dark:bg-purple-500/10' },
];

const modeToSection = (mode: ChatMode): SectionKey => {
  if (mode === 'copywriting') return 'copywriting';
  if (mode === 'videoScript') return 'videoScript';
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
    copywriting: true,
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
    <div className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,rgba(246,247,251,0.98),rgba(240,242,247,0.96))] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,hsl(222_47%_7%),hsl(222_47%_5%))]">
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
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.12] dark:opacity-[0.06]" />
      </div>

      <div className="relative z-10 flex h-[calc(100vh-56px)] overflow-hidden">
        <aside className={`hidden border-r p-3 md:flex md:flex-col ${workspaceCollapsed ? 'md:hidden' : 'md:w-80'}`}>
          <div className="min-h-0 overflow-y-auto">
            <SidebarNav
              section={section}
              sessions={sessions}
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
          {contentMode !== 'roleplay' && (
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
              <div className={cn('min-h-0 flex-1 overflow-hidden', isRoleplayMode ? 'overscroll-none p-2 md:p-3' : 'overflow-y-auto p-3 md:p-6')}>
                <div className={cn('mx-auto w-full', isRoleplayMode ? 'h-full max-w-none overflow-hidden' : 'max-w-6xl')}>
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
              {contentMode !== 'roleplay' && <ChatComposer mode={contentMode} />}
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
  const currentSection = sections.find((item) => item.key === section);
  const sectionSessionCount = sessions.filter((item) => modeToSection(item.mode) === section).length;
  const messageCount = session?.messages.length ?? 0;
  const lastTitle = session?.title || '准备开始新的会话';
  const quickActions: Array<{ key: SectionKey; label: string; hint: string }> = [
    { key: 'chat', label: '通用对话', hint: '问答与思路整理' },
    { key: 'copywriting', label: '文案生成', hint: '海报 / 广告 / 社媒' },
    { key: 'videoScript', label: '视频脚本', hint: '分镜 / 口播 / 爆款拆解' },
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
              <div key={item.key} className="rounded-2xl border bg-card/90 p-2.5 shadow-sm">
                <button
                  onClick={() => onSelect(item.key)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${item.accent} ${
                    section === item.key ? 'ring-1 ring-primary/40 shadow-sm' : 'hover:ring-1 hover:ring-border/70'
                  }`}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <span
                    className="ui-icon-button h-7 w-7 rounded-lg border-transparent bg-white/55 dark:bg-white/5"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggle(item.key);
                    }}
                  >
                    <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-2 space-y-2 px-1">
                    <Button variant="secondary" size="sm" className="w-full justify-center" onClick={() => onCreate(item.key)}>
                      <Plus size={12} className="mr-1" />
                      新建
                    </Button>
                    {recentSessions.length > 0 && (
                      <div className="space-y-2">
                        {recentSessions.map((sessionItem) => (
                          <button
                            key={sessionItem.id}
                            onClick={() => onSelectSession(sessionItem.id)}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setContextMenu({ x: event.clientX, y: event.clientY, session: sessionItem });
                            }}
                            className="block w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-muted/40"
                            title={sessionItem.title}
                          >
                            <div className="line-clamp-1 text-sm font-medium text-foreground">{sessionItem.title}</div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {sessionItem.summary || '开始你的第一条消息'}
                            </div>
                          </button>
                        ))}
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
