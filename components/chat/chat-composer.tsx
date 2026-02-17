'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { Info, SendHorizontal, SlidersHorizontal, Upload } from 'lucide-react';
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
    <div className="border-t bg-card/95 p-3 backdrop-blur">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-muted px-2 py-1">当前模式 /{mode}</span>
        {['扩写', '总结', '改写'].map((action) => <button key={action} className="rounded border px-2 py-1">{action}</button>)}
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-1">{settings.defaultTextModel}<Info size={12} /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="z-50 rounded bg-foreground px-2 py-1 text-xs text-background" sideOffset={6}>
                不同模型在速度、创意度和成本上有所区别，可在设置中切换默认模型。
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      <div className="flex items-end gap-2">
        <Button className="bg-transparent text-foreground"><Upload size={16} /></Button>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="max-h-40 min-h-16 resize-y"
          placeholder="支持多行输入。Enter 换行，Ctrl/⌘ + Enter 发送"
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim()) { sendMessage(value); setValue(''); } }}
        />
        <Button className="bg-transparent text-foreground" onClick={() => setSettings({ stream: !settings.stream })}><SlidersHorizontal size={16} /></Button>
        <Button disabled={!value.trim()} onClick={() => { sendMessage(value); setValue(''); }}><SendHorizontal size={16} /></Button>
      </div>
    </div>
  );
}
