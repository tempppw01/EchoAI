'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { Info, SendHorizontal, SlidersHorizontal, Square, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const [value, setValue] = useState('');
  const { sessions, activeSessionId, sendMessage, updateSession, createSession, generatingSessionIds, stopMessage } = useChatStore();
  const { settings, setSettings } = useSettingsStore();

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const model = activeSession?.model ?? (mode === 'image' || mode === 'proImage' ? settings.defaultImageModel : settings.defaultTextModel);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);

  // 发送逻辑：没有活动会话时自动创建，保证“随手就能聊”。
  const onSend = () => {
    if (!value.trim()) return;
    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);
    sendMessage(value, sid);
    setValue('');
  };

  return (
    <div className="border-t bg-card/95 p-3 backdrop-blur md:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2 py-1">当前模块 /{mode}</span>
        <select
          className="rounded-full border bg-background px-3 py-1"
          value={model}
          onChange={(e) => activeSession && updateSession(activeSession.id, { model: e.target.value })}
        >
          {(settings.modelCatalog?.length ? settings.modelCatalog : [settings.defaultTextModel, settings.defaultImageModel, 'gpt-4o', 'gpt-4.1-mini']).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="inline-flex items-center gap-1 rounded border px-2 py-1">会话级模型<Info size={12} /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="z-50 rounded bg-foreground px-2 py-1 text-xs text-background" sideOffset={6}>
                当前会话可单独设置模型，不影响全局默认模型。
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      <div className="chat-panel flex items-end gap-2 p-2">
        <Button className="rounded-xl bg-transparent text-foreground"><Upload size={16} /></Button>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="max-h-40 min-h-16 resize-y rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="支持 Markdown。Enter 换行，Ctrl/⌘ + Enter 发送"
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim()) onSend(); }}
        />
        <Button className="rounded-xl bg-transparent text-foreground" onClick={() => setSettings({ stream: !settings.stream })}><SlidersHorizontal size={16} /></Button>
        <Button
          className="rounded-xl"
          disabled={!isGenerating && !value.trim()}
          onClick={() => {
            if (isGenerating && activeSession?.id) {
              stopMessage(activeSession.id);
              return;
            }
            onSend();
          }}
        >
          {isGenerating ? <Square size={16} /> : <SendHorizontal size={16} />}
        </Button>
      </div>
    </div>
  );
}
