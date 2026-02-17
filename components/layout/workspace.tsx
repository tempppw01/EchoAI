'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Brush,
  ChevronDown,
  Menu,
  Moon,
  NotebookPen,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Swords,
  Video,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

const nav = [
  { key: 'chat', label: '通用对话', mode: 'chat', icon: Sparkles, accent: 'from-violet-500/20 to-cyan-500/10' },
  { key: 'copywriting', label: '文案生成', mode: 'copywriting', icon: NotebookPen, accent: 'from-blue-500/20 to-indigo-500/10' },
  { key: 'videoScript', label: '视频脚本', mode: 'videoScript', icon: Video, accent: 'from-fuchsia-500/20 to-rose-500/10' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, accent: 'from-emerald-500/20 to-cyan-500/10' },
  { key: 'training', label: '技能训练', mode: 'training', icon: Sparkles, accent: 'from-amber-500/20 to-orange-500/10' },
  { key: 'image', label: '专业绘图', mode: 'proImage', icon: Brush, accent: 'from-pink-500/20 to-purple-500/10' },
] as const;

const copyTypes = ['爆款标题', '产品卖点', '社媒短文', '直播口播'];

type SectionKey = (typeof nav)[number]['key'];

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

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession } = useChatStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);

  const openSection = (key: SectionKey, createFresh = false) => {
    setSection(key);
    const targetMode = nav.find((item) => item.key === key)?.mode as ChatMode | undefined;
    if (!targetMode) return;

    if (createFresh) {
      createSession(targetMode);
      return;
    }

    const existing = sessions.find((item) => item.mode === targetMode);
    if (existing) {
      selectSession(existing.id);
      return;
    }

    createSession(targetMode);
  };

  const sessionCountByMode = useMemo(
    () =>
      sessions.reduce<Record<ChatMode, number>>((acc, cur) => {
        acc[cur.mode] = (acc[cur.mode] || 0) + 1;
        return acc;
      }, { chat: 0, image: 0, proImage: 0, copywriting: 0, videoScript: 0, roleplay: 0, training: 0 }),
    [sessions],
  );

  const contentMode = active?.mode ?? mode;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/40">
      <header className="flex h-14 items-center justify-between border-b bg-card/80 px-3 backdrop-blur md:px-4">
        <div className="flex items-center gap-2">
          <Button className="md:hidden bg-transparent text-foreground" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <p className="text-sm font-semibold">EchoAI 创作空间</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-56px)] md:grid-cols-[300px_1fr]">
        <aside className="hidden border-r bg-card/60 p-3 backdrop-blur md:block">
          <SidebarNav
            section={section}
            expanded={expanded}
            setExpanded={setExpanded}
            sessionCountByMode={sessionCountByMode}
            onSelect={openSection}
            onSettings={() => setSettingsOpen(true)}
          />
          <div className="mt-3 border-t pt-3">
            <ChatList search={search} setSearch={setSearch} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="border-b bg-card/60 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当前工作流</p>
                <p className="text-lg font-semibold">{nav.find((n) => n.key === section)?.label ?? '通用对话'}</p>
              </div>
              <Button onClick={() => openSection(section, true)}><Plus size={15} className="mr-1" />新建</Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={section + (active?.id ?? '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 md:p-6">
                <div className="mx-auto w-full max-w-5xl">
                  {contentMode === 'proImage' || contentMode === 'image' ? (
                    <ProImagePanel />
                  ) : contentMode === 'copywriting' && active && active.messages.length === 0 && !active.subtype ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {copyTypes.map((type) => (
                        <button
                          key={type}
                          className="rounded-xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                          onClick={() => createSession('copywriting', type)}
                        >
                          <p className="text-sm font-semibold">{type}</p>
                          <p className="mt-1 text-xs text-muted-foreground">选择模板后进入创作会话。</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <MessageList session={active} />
                  )}
                </div>
              </div>
              <ChatComposer mode={contentMode} />
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
              setExpanded={setExpanded}
              sessionCountByMode={sessionCountByMode}
              onSelect={(key, createFresh) => {
                openSection(key, createFresh);
                if (!createFresh) setSidebarOpen(false);
              }}
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
  setExpanded,
  sessionCountByMode,
  onSelect,
  onSettings,
}: {
  section: string;
  expanded: Record<SectionKey, boolean>;
  setExpanded: Dispatch<SetStateAction<Record<SectionKey, boolean>>>;
  sessionCountByMode: Record<ChatMode, number>;
  onSelect: (section: SectionKey, createFresh?: boolean) => void;
  onSettings: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-xs text-muted-foreground">工作区模块</p>
      {nav.map((item) => {
        const Icon = item.icon;
        const isOpen = expanded[item.key];
        return (
          <div key={item.key} className="rounded-xl border bg-card/60 p-2">
            <button
              onClick={() => {
                setExpanded((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                onSelect(item.key);
              }}
              className={`flex w-full items-center gap-2 rounded-lg bg-gradient-to-r px-2 py-2 text-sm transition ${item.accent} ${section === item.key ? 'ring-1 ring-primary/40' : ''}`}
            >
              <Icon size={15} />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="rounded bg-background/70 px-1.5 text-[10px]">{sessionCountByMode[item.mode]}</span>
              <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            {isOpen && (
              <div className="mt-2 flex gap-2 px-1">
                <Button className="h-7 flex-1 text-xs" onClick={() => onSelect(item.key, true)}>
                  <Plus size={12} className="mr-1" /> 新建
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-muted"><Settings size={15} /> 设置</button>
    </div>
  );
}
