'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Brush, ChevronDown, Menu, Moon, Plus, Settings, Sparkles, Sun, Swords, Video, PenSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { RoleplayStudio } from '@/components/chat/roleplay-studio';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { useRoleplayStore } from '@/stores/roleplay-store';

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
  { key: 'training', label: '技能训练', mode: 'training', icon: Sparkles, accent: 'bg-amber-50 dark:bg-amber-500/10' },
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession } = useChatStore();
  const { recentCharacterId, activeCharacterId, activeWorldId } = useRoleplayStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);

  const sessionCountByMode = useMemo(
    () =>
      sessions.reduce<Record<ChatMode, number>>((acc, cur) => {
        acc[cur.mode] = (acc[cur.mode] || 0) + 1;
        return acc;
      }, { chat: 0, image: 0, proImage: 0, copywriting: 0, videoScript: 0, roleplay: 0, training: 0 }),
    [sessions],
  );

  const openSection = (target: SectionKey) => {
    setSection(target);
    const targetMode = sections.find((item) => item.key === target)?.mode;
    if (!targetMode) return;

    const existing = sessions.find((item) => item.mode === targetMode);
    if (existing) {
      selectSession(existing.id);
      return;
    }

    if (targetMode === 'roleplay') {
      createSession('roleplay', undefined, undefined, { characterId: recentCharacterId ?? activeCharacterId, worldId: activeWorldId });
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
    createSession(targetMode);
  };

  const contentMode = active?.mode ?? mode;

  if (!mounted) {
    return <div className="h-screen bg-muted/30" />;
  }

  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground md:hidden" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <p className="text-sm font-semibold">EchoAI 创作空间</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-56px)] md:grid-cols-[300px_1fr]">
        <aside className="hidden border-r bg-card px-3 py-2 md:flex md:flex-col">
          <SidebarNav
            section={section}
            expanded={expanded}
            onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
            onSelect={openSection}
            onCreate={createInSection}
            sessionCountByMode={sessionCountByMode}
            onSettings={() => setSettingsOpen(true)}
          />
          <div className="mt-3 border-t pt-3">
            <ChatList search={search} setSearch={setSearch} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="border-b bg-card px-4 py-3">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当前工作流</p>
                <p className="text-3xl font-bold leading-tight">{sections.find((n) => n.key === section)?.label ?? '通用对话'}</p>
              </div>
              <Button onClick={() => createInSection(section)}><Plus size={15} className="mr-1" />新建</Button>
            </div>
          </div>

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

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} className="fixed inset-y-0 left-0 z-40 w-80 border-r bg-card p-3 md:hidden">
            <SidebarNav
              section={section}
              expanded={expanded}
              onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              onSelect={(key) => {
                openSection(key);
                setSidebarOpen(false);
              }}
              onCreate={(key) => {
                createInSection(key);
                setSidebarOpen(false);
              }}
              sessionCountByMode={sessionCountByMode}
              onSettings={() => setSettingsOpen(true)}
            />
            <div className="mt-3 border-t pt-3"><ChatList search={search} setSearch={setSearch} closeMobile={() => setSidebarOpen(false)} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsCenter open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function SidebarNav({
  section,
  expanded,
  onToggle,
  onSelect,
  onCreate,
  sessionCountByMode,
  onSettings,
}: {
  section: SectionKey;
  expanded: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  onSelect: (key: SectionKey) => void;
  onCreate: (key: SectionKey) => void;
  sessionCountByMode: Record<ChatMode, number>;
  onSettings: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="px-2 text-sm">工作区模块</p>
      {sections.map((item) => {
        const Icon = item.icon;
        const isOpen = expanded[item.key];
        return (
          <div key={item.key} className="rounded-xl border bg-card p-2">
            <button
              onClick={() => onSelect(item.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm ${item.accent} ${section === item.key ? 'ring-1 ring-primary/40' : ''}`}
            >
              <Icon size={15} />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="rounded bg-background/90 px-1.5 text-[10px]">{sessionCountByMode[item.mode]}</span>
              <span
                className="rounded p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(item.key);
                }}
              >
                <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
              </span>
            </button>
            {isOpen && (
              <div className="mt-2 px-1">
                <Button className="h-8 w-full text-xs" onClick={() => onCreate(item.key)}>
                  <Plus size={12} className="mr-1" /> 新建
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-muted">
        <Settings size={15} /> 设置
      </button>
    </div>
  );
}
