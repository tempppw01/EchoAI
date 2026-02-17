'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { Hammer, Info, Mic, Plus, SendHorizontal, SlidersHorizontal, Upload } from 'lucide-react';
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

  const onSend = () => {
    if (!value.trim()) return;
    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);
    sendMessage(value, sid);
    setValue('');
  };

  return (
    <div className="border-t bg-card/95 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur md:p-4 md:pb-4">
      <div className="mb-2 hidden flex-wrap items-center gap-2 text-xs md:flex">
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
      <div className="chat-panel flex items-end gap-2 rounded-[28px] border-[#e7e7ec] bg-[#f2f2f6] p-2.5 shadow-none dark:border-border dark:bg-card md:rounded-2xl md:border-border md:bg-[hsl(var(--surface)/0.9)] md:p-2 md:shadow-sm">
        <Button className="hidden rounded-xl bg-transparent text-foreground md:inline-flex"><Upload size={16} /></Button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden"><Plus size={20} /></button>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="max-h-36 min-h-12 resize-none rounded-xl border-0 bg-transparent px-2 text-lg shadow-none placeholder:text-[#8e8e98] focus-visible:ring-0 md:max-h-40 md:min-h-16 md:resize-y md:px-0 md:text-base"
          placeholder="说点什么..."
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim()) onSend(); }}
        />
        <Button className="hidden rounded-xl bg-transparent text-foreground md:inline-flex" onClick={() => setSettings({ stream: !settings.stream })}><SlidersHorizontal size={16} /></Button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden"
          onClick={value.trim() ? onSend : undefined}
          aria-label={value.trim() ? '发送消息' : '语音输入'}
        >
          {value.trim() ? <SendHorizontal size={20} /> : <Mic size={22} />}
        </button>
        <Button className="hidden rounded-xl md:inline-flex" disabled={!value.trim()} onClick={onSend}><SendHorizontal size={16} /></Button>
      </div>
      <div className="mt-2 flex items-center gap-2 px-3 md:hidden">
        <button className="rounded-full border border-[#dedee5] bg-[#e8e8ed] px-4 py-1.5 text-sm">思考</button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dedee5] bg-[#e8e8ed]"><Hammer size={17} /></button>
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
