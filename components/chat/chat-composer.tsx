'use client';

import { SendHorizontal, SlidersHorizontal, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const [value, setValue] = useState('');
  const { sendMessage } = useChatStore();
  const { settings, setSettings } = useSettingsStore();

  return (
    <div className="border-t bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-muted px-2 py-1">/{mode}</span>
        <button className="rounded border px-2 py-1">/image</button>
        <button className="rounded border px-2 py-1">/summary</button>
        <button className="rounded border px-2 py-1">/translate</button>
      </div>
      <div className="flex items-end gap-2">
        <Button className="bg-transparent text-foreground"><Upload size={16} /></Button>
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} className="max-h-36 min-h-12 resize-y" placeholder="Enter 换行，Ctrl/⌘ + Enter 发送" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim()) { sendMessage(value); setValue(''); } }} />
        <Button className="bg-transparent text-foreground" onClick={() => setSettings({ stream: !settings.stream })}><SlidersHorizontal size={16} /></Button>
        <Button disabled={!value.trim()} onClick={() => { sendMessage(value); setValue(''); }}><SendHorizontal size={16} /></Button>
      </div>
    </div>
  );
}
