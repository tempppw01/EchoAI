'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Brush, Menu, Moon, NotebookPen, Settings, Sparkles, Sun, Swords, Video } from 'lucide-react';
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

const nav = [
  { key: 'dashboard', label: '工作台（新对话）', mode: 'chat', icon: Sparkles },
  { key: 'copywriting', label: '文案生成', mode: 'copywriting', icon: NotebookPen },
  { key: 'videoScript', label: '视频脚本', mode: 'videoScript', icon: Video },
  { key: 'roleplay', label: '角色扮演', mode: 'roleplay', icon: Swords },
  { key: 'training', label: '技能训练', mode: 'training', icon: Sparkles },
  { key: 'image', label: '绘图', mode: 'proImage', icon: Brush },
] as const;

const copyTypes = ['爆款标题', '产品卖点', '社媒短文', '直播口播'];

export function Workspace({ mode }: { mode: ChatMode }) {
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<(typeof nav)[number]['key']>('dashboard');
  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession } = useChatStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const recent = sessions.slice(0, 6);

  const openSection = (key: (typeof nav)[number]['key']) => {
    setSection(key);
    const targetMode = nav.find((item) => item.key === key)?.mode as ChatMode | undefined;
    if (!targetMode) return;
    const existing = sessions.find((item) => item.mode === targetMode);
    if (existing) {
      selectSession(existing.id);
      return;
    }
    createSession(targetMode);
  };

  const contentMode = active?.mode ?? mode;
  const isDashboard = section === 'dashboard';

  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b bg-card px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Button className="md:hidden bg-transparent text-foreground" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <p className="text-sm font-semibold">AI 内容创作工作台</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>
      <div className="grid h-[calc(100vh-56px)] md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-card/80 p-3 md:block">
          <SidebarNav section={section} onSelect={openSection} onSettings={() => setSettingsOpen(true)} />
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
            <SidebarNav section={section} onSelect={(key) => { openSection(key); setSidebarOpen(false); }} onSettings={() => setSettingsOpen(true)} />
            <div className="mt-3 border-t pt-3"><ChatList search={search} setSearch={setSearch} closeMobile={() => setSidebarOpen(false)} /></div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsCenter open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function SidebarNav({ section, onSelect, onSettings }: { section: string; onSelect: (section: (typeof nav)[number]['key']) => void; onSettings: () => void }) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-xs text-muted-foreground">工作区</p>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.key} onClick={() => onSelect(item.key)} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition ${section === item.key ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
            <Icon size={15} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition hover:bg-muted"><Settings size={15} /> 设置</button>
    </div>
  );
}

function Dashboard({ recent, onJump, onCreate }: { recent: { id: string; title: string; summary: string; updatedAt: string }[]; onJump: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-xl font-semibold">欢迎回来，开始今天的创作吧 👋</p>
        <p className="mt-1 text-sm text-muted-foreground">在同一个工作台完成文案、脚本、角色与绘图任务。</p>
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
