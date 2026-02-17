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
import { useMemo, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';

type NavSection = {
  key: string;
  label: string;
  mode: ChatMode;
  icon: typeof Sparkles;
  description: string;
};

const nav: NavSection[] = [
  { key: 'dashboard', label: '工作台（新对话）', mode: 'chat', icon: Sparkles, description: '自由对话与通用创作' },
  { key: 'copywriting', label: '文案生成', mode: 'copywriting', icon: NotebookPen, description: '标题、种草、口播文案' },
  { key: 'videoScript', label: '视频脚本', mode: 'videoScript', icon: Video, description: '分镜、节奏、脚本优化' },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords, description: '预设角色模拟互动' },
  { key: 'training', label: '技能训练', mode: 'training', icon: Sparkles, description: '问答训练与演练任务' },
  { key: 'image', label: '绘图', mode: 'proImage', icon: Brush, description: '提示词生成与图片创作' },
];

const copyTypes = ['爆款标题', '产品卖点', '社媒短文', '直播口播'];

export function Workspace({ mode }: { mode: ChatMode }) {
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>('dashboard');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    dashboard: true,
    copywriting: true,
    videoScript: true,
    roleplay: false,
    training: false,
    image: false,
  });

  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession } = useChatStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const recent = sessions.slice(0, 6);

  const openSection = (key: string) => {
    setSection(key);
    const targetMode = nav.find((item) => item.key === key)?.mode;
    if (!targetMode) return;
    const existing = sessions.find((item) => item.mode === targetMode);
    if (existing) {
      selectSession(existing.id);
      return;
    }
    createSession(targetMode);
  };

  const createInSection = (target: NavSection, subtype?: string) => {
    setSection(target.key);
    createSession(target.mode, subtype);
  };

  const contentMode = active?.mode ?? mode;
  const isDashboard = section === 'dashboard';

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#eef2ff,transparent_45%)] dark:bg-[radial-gradient(circle_at_top,#101827,transparent_45%)]">
      <header className="flex h-14 items-center justify-between border-b bg-card/80 px-3 backdrop-blur md:px-4">
        <div className="flex items-center gap-2">
          <Button className="md:hidden bg-transparent text-foreground" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <p className="text-sm font-semibold">EchoAI 智能创作中心</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-56px)] md:grid-cols-[300px_1fr]">
        <aside className="hidden border-r bg-card/75 p-3 backdrop-blur md:block">
          <SidebarNav
            section={section}
            expanded={expanded}
            sessions={sessions}
            onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
            onSelect={openSection}
            onCreate={createInSection}
            onJump={selectSession}
            onSettings={() => setSettingsOpen(true)}
          />
          <div className="mt-3 border-t pt-3">
            <ChatList search={search} setSearch={setSearch} />
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <AnimatePresence mode="wait">
            <motion.div key={section + (active?.id ?? '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 md:p-6">
                <div className="mx-auto w-full max-w-5xl">
                  {isDashboard ? (
                    <Dashboard recent={recent} onJump={selectSession} onCreate={() => createSession('chat')} />
                  ) : contentMode === 'proImage' || contentMode === 'image' ? (
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
              {!isDashboard && <ChatComposer mode={contentMode} />}
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
              sessions={sessions}
              onToggle={(key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              onSelect={(key) => {
                openSection(key);
                setSidebarOpen(false);
              }}
              onCreate={(target, subtype) => {
                createInSection(target, subtype);
                setSidebarOpen(false);
              }}
              onJump={(id) => {
                selectSession(id);
                setSidebarOpen(false);
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
  sessions,
  onToggle,
  onSelect,
  onCreate,
  onJump,
  onSettings,
}: {
  section: string;
  expanded: Record<string, boolean>;
  sessions: { id: string; title: string; mode: ChatMode; summary: string }[];
  onToggle: (section: string) => void;
  onSelect: (section: string) => void;
  onCreate: (target: NavSection, subtype?: string) => void;
  onJump: (id: string) => void;
  onSettings: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-xs text-muted-foreground">功能中心</p>
      {nav.map((item) => {
        const Icon = item.icon;
        const scopedSessions = sessions.filter((s) => s.mode === item.mode).slice(0, 3);

        return (
          <div key={item.key} className={`rounded-xl border p-2 ${section === item.key ? 'border-primary/40 bg-primary/5' : 'bg-card/50'}`}>
            <div className="flex items-center gap-1">
              <button onClick={() => onSelect(item.key)} className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted/70">
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
              <button onClick={() => onCreate(item)} className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="新建">
                <Plus size={14} />
              </button>
              <button onClick={() => onToggle(item.key)} className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ChevronDown size={14} className={`transition ${expanded[item.key] ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <p className="px-2 text-[11px] text-muted-foreground">{item.description}</p>

            <AnimatePresence initial={false}>
              {expanded[item.key] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 space-y-1 px-2 pb-1">
                    {item.mode === 'copywriting' && (
                      <div className="flex flex-wrap gap-1 pb-1">
                        {copyTypes.slice(0, 2).map((subtype) => (
                          <button key={subtype} onClick={() => onCreate(item, subtype)} className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
                            {subtype}
                          </button>
                        ))}
                      </div>
                    )}
                    {scopedSessions.length > 0 ? (
                      scopedSessions.map((session) => (
                        <button key={session.id} onClick={() => onJump(session.id)} className="w-full rounded-md border px-2 py-1 text-left text-xs transition hover:bg-muted">
                          <p className="truncate">{session.title}</p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded border border-dashed px-2 py-1 text-[11px] text-muted-foreground">暂无会话，点击 + 新建</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-muted"><Settings size={15} /> 设置</button>
    </div>
  );
}

function Dashboard({ recent, onJump, onCreate }: { recent: { id: string; title: string; summary: string; updatedAt: string }[]; onJump: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-xl font-semibold">欢迎回来，开始今天的创作吧 👋</p>
        <p className="mt-1 text-sm text-muted-foreground">统一工作台已升级：支持多功能模块展开、快速新建与动态切换。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {['快速新建对话', '生成短视频脚本', '品牌文案优化'].map((item) => (
          <button key={item} className="rounded-xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm" onClick={onCreate}>
            <p className="font-medium">{item}</p>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">最近记录</p>
        <div className="space-y-2">
          {recent.map((item) => (
            <button key={item.id} className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm" onClick={() => onJump(item.id)}>
              <span>{item.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleTimeString()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
