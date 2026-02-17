'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Brush, ChevronDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Settings, Sparkles, Sun, Swords, Video, PenSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ReactNode, useMemo, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { RoleplayStudio } from '@/components/chat/roleplay-studio';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useUIStore } from '@/stores/ui-store';

type SectionKey = 'chat' | 'copywriting' | 'videoScript' | 'roleplay' | 'training' | 'image';

type Section = { key: SectionKey; label: string; mode: ChatMode; icon: typeof Sparkles; accent: string };

const sections: Section[] = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, accent: 'bg-blue-50 dark:bg-blue-500/10' },
  { key: 'copywriting', label: '文案生成', mode: 'copywriting', icon: PenSquare, accent: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { key: 'videoScript', label: '视频脚本', mode: 'videoScript', icon: Video, accent: 'bg-pink-50 dark:bg-pink-500/10' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'bg-teal-50 dark:bg-teal-500/10' },
  { key: 'training', label: '学习型聊天', mode: 'training', icon: Sparkles, accent: 'bg-amber-50 dark:bg-amber-500/10' },
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
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({ chat: true, copywriting: true, videoScript: true, roleplay: true, training: true, image: true });
  const [moduleCollapsed, setModuleCollapsed] = useState(false);
  const [trainingTopicDialog, setTrainingTopicDialog] = useState<{ open: boolean; sessionId?: string }>({ open: false });
  const [trainingTopicInput, setTrainingTopicInput] = useState('');
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession, startTraining } = useChatStore();
  const { recentCharacterId, activeCharacterId, activeWorldId } = useRoleplayStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);

  const openSection = (target: SectionKey) => {
    setSection(target);
    const targetMode = sections.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    const existing = sessions.find((item) => item.mode === targetMode);
    if (existing) return selectSession(existing.id);

    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, { characterId: recentCharacterId ?? activeCharacterId, worldId: activeWorldId });
      return;
    }
    if (targetMode === 'training') {
      const sid = createSession('training');
      setTrainingTopicDialog({ open: true, sessionId: sid });
      return;
    }
    createSession(targetMode);
  };

  const createInSection = (target: SectionKey) => {
    setSection(target);
    const targetMode = sections.find((item) => item.key === target)?.mode;
    if (!targetMode) return;
    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, { characterId: recentCharacterId ?? activeCharacterId, worldId: activeWorldId });
      return;
    }
    if (targetMode === 'training') {
      const sid = createSession('training');
      setTrainingTopicDialog({ open: true, sessionId: sid });
      return;
    }
    createSession(targetMode);
  };

  const contentMode = active?.mode ?? mode;

  return (
    <div className="h-screen overflow-hidden bg-[#f6f6f8] dark:bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card/85 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground md:hidden" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <span className="text-sm font-medium">EchoAI 工作区</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="hidden bg-transparent text-foreground md:inline-flex"
            onClick={() => setWorkspaceCollapsed((prev) => !prev)}
            aria-label={workspaceCollapsed ? '展开工作区侧栏' : '折叠工作区侧栏'}
          >
            {workspaceCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </Button>
          <ThemeIconButton active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={16} />} />
          <ThemeIconButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<Moon size={16} />} />
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        <aside className={`hidden border-r p-3 md:flex md:flex-col ${workspaceCollapsed ? 'md:hidden' : 'md:w-80'}`}>
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
          <div className="mt-3 min-h-0 flex-1 border-t pt-3">
            <ChatList search={search} setSearch={setSearch} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {workspaceCollapsed && (
            <div className="px-3 pt-3 md:px-6">
              <Button className="h-8 bg-transparent text-foreground" onClick={() => setWorkspaceCollapsed(false)}>
                <PanelLeftOpen size={14} className="mr-1" />展开工作区
              </Button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={section + (active?.id ?? '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 md:p-6">
                <div className="mx-auto w-full max-w-6xl">
                  {contentMode === 'proImage' || contentMode === 'image' ? <ProImagePanel /> : contentMode === 'roleplay' ? <RoleplayStudio session={active} /> : <MessageList session={active} />}
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
            <div className="mt-3 min-h-0 flex-1 border-t pt-3">
              <ChatList search={search} setSearch={setSearch} />
            </div>
          </aside>
        </div>
      )}


      {trainingTopicDialog.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">开始学习型聊天</h3>
            <p className="mt-1 text-sm text-muted-foreground">请输入你想学习/测验的主题，确认后将持续无限出题。</p>
            <input
              value={trainingTopicInput}
              onChange={(e) => setTrainingTopicInput(e.target.value)}
              placeholder="例如：Python 基础、英语语法、产品经理面试"
              className="mt-4 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button className="bg-transparent text-foreground" onClick={() => setTrainingTopicDialog({ open: false })}>取消</Button>
              <Button
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

function ThemeIconButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>{icon}</button>;
}

function SidebarNav({ section, sessions, expanded, moduleCollapsed, onToggleModule, onToggle, onSelect, onSelectSession, onCreate }: { section: SectionKey; sessions: ReturnType<typeof useChatStore.getState>['sessions']; expanded: Record<SectionKey, boolean>; moduleCollapsed: boolean; onToggleModule: () => void; onToggle: (key: SectionKey) => void; onSelect: (key: SectionKey) => void; onSelectSession: (id: string) => void; onCreate: (key: SectionKey) => void }) {
  const { deleteSession } = useChatStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <p className="text-sm">工作区模块</p>
        <button onClick={onToggleModule} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label={moduleCollapsed ? '展开工作区模块' : '折叠工作区模块'}>
          {moduleCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
      {moduleCollapsed && <p className="px-2 text-xs text-muted-foreground">模块列表已折叠</p>}
      {!moduleCollapsed && sections.map((item) => {
        const recentSessions = sessions.filter((session) => modeToSection(session.mode) === item.key).slice(0, 3);
        const Icon = item.icon;
        const isOpen = expanded[item.key];
        return (
          <div key={item.key} className="rounded-xl border bg-card p-2">
            <button onClick={() => onSelect(item.key)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm ${item.accent} ${section === item.key ? 'ring-1 ring-primary/40' : ''}`}>
              <Icon size={15} />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="rounded p-1" onClick={(e) => { e.stopPropagation(); onToggle(item.key); }}>
                <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
              </span>
            </button>
            {isOpen && (
              <div className="mt-2 space-y-2 px-1">
                <Button className="h-8 w-full text-xs" onClick={() => onCreate(item.key)}><Plus size={12} className="mr-1" />新建</Button>
                {recentSessions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recentSessions.map((sessionItem) => (
                      <button
                        key={sessionItem.id}
                        onClick={() => onSelectSession(sessionItem.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (confirm(`删除「${sessionItem.title}」会话？`)) {
                            deleteSession(sessionItem.id);
                          }
                        }}
                        className="max-w-full rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                        title={sessionItem.title}
                      >
                        <span className="line-clamp-1">{sessionItem.title}</span>
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
  );
}
