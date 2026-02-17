'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatList } from '@/components/chat/chat-list';
import { MessageList } from '@/components/chat/message-list';
import { ProImagePanel } from '@/components/image/pro-image-panel';
import { SettingsCenter } from '@/components/settings/settings-center';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat-store';
import { useUIStore } from '@/stores/ui-store';
import { ChatMode } from '@/lib/types';

export function Workspace({ mode }: { mode: ChatMode }) {
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const { settingsOpen, setSettingsOpen, sidebarOpen, setSidebarOpen } = useUIStore();
  const { sessions, activeSessionId, createSession, selectSession } = useChatStore();

  const active = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);

  return (
    <div className="h-screen overflow-hidden bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b bg-card px-3 md:px-4">
        <div className="flex items-center gap-2">
          <Button className="md:hidden bg-transparent text-foreground" onClick={() => setSidebarOpen(true)}><Menu size={16} /></Button>
          <p className="text-sm font-semibold">{active?.title ?? 'EchoAI'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-transparent text-foreground" onClick={() => createSession(mode)}><Plus size={16} /></Button>
          <Button className="bg-transparent text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
          <Button className="bg-transparent text-foreground" onClick={() => setSettingsOpen(true)}><Settings size={16} /></Button>
        </div>
      </header>
      <div className="grid h-[calc(100vh-56px)] md:grid-cols-[320px_1fr]">
        <aside className="hidden border-r bg-card md:block">
          <ChatList search={search} setSearch={setSearch} />
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {active?.mode === 'proImage' || mode === 'proImage' ? <ProImagePanel /> : <MessageList session={active} onSelect={selectSession} />}
          </div>
          <ChatComposer mode={active?.mode ?? mode} />
        </main>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} className="fixed inset-y-0 left-0 z-40 w-80 border-r bg-card p-3 md:hidden">
            <ChatList search={search} setSearch={setSearch} closeMobile={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsCenter open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
