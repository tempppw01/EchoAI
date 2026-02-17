'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { Info, SendHorizontal, SlidersHorizontal, Square, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const MAX_INPUT_CHARS = 6000;
  const PASTE_DEBOUNCE_MS = 140;

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setInputHint('');
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  useEffect(() => () => {
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
  }, []);

  const upsertValue = (nextValue: string) => {
    if (nextValue.length > MAX_INPUT_CHARS) {
      setValue(nextValue.slice(0, MAX_INPUT_CHARS));
      setInputHint(`已达到 ${MAX_INPUT_CHARS} 字上限，超出内容已被截断。`);
      return;
    }
    setValue(nextValue);
    if (inputHint && nextValue.length < MAX_INPUT_CHARS) setInputHint('');
  };

  const applyPaste = (pastedText: string) => {
    const available = MAX_INPUT_CHARS - value.length;
    if (available <= 0) {
      setInputHint(`输入框最多 ${MAX_INPUT_CHARS} 字，请先精简内容。`);
      return;
    }

    const clipped = pastedText.slice(0, available);
    const chunks = clipped.match(/(.|[\r\n]){1,1200}/g) ?? [clipped];
    const merged = `${value}${chunks.join('\n')}`;
    setValue(merged);

    if (pastedText.length > available) {
      setInputHint(`粘贴内容过长，已按分段插入前 ${available} 字。`);
      return;
    }
    if (pastedText.length > 1200) {
      setInputHint(`大段文本已自动分段插入（共 ${chunks.length} 段），建议发送前再检查格式。`);
      return;
    }
    setInputHint('');
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
          ref={textareaRef}
          value={value}
          onChange={(e) => upsertValue(e.target.value)}
          rows={1}
          className="min-h-16 max-h-[220px] overflow-y-auto rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="支持 Markdown。Enter 发送，Shift + Enter 换行"
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onPaste={(e) => {
            const pastedText = e.clipboardData.getData('text');
            if (!pastedText) return;

            e.preventDefault();
            if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
            setInputHint('正在处理粘贴内容...');
            pasteTimerRef.current = setTimeout(() => {
              applyPaste(pastedText);
            }, PASTE_DEBOUNCE_MS);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || isComposing) return;
            if (e.shiftKey) return;
            e.preventDefault();
            if (value.trim() && !isGenerating) onSend();
          }}
        />
        <Button className="rounded-xl bg-transparent text-foreground" onClick={() => setSettings({ stream: !settings.stream })}><SlidersHorizontal size={16} /></Button>
        <Button
          className="rounded-xl"
          disabled={!value.trim() || isGenerating}
          onClick={() => {
            onSend();
          }}
        >
          <SendHorizontal size={16} />
        </Button>
        {isGenerating && activeSession?.id && (
          <Button className="rounded-xl bg-transparent text-foreground" onClick={() => stopMessage(activeSession.id)}>
            <Square size={16} />
          </Button>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between px-2 text-xs text-muted-foreground">
        <span>{inputHint || '提示：支持粘贴大文本，系统会自动分段。'}</span>
        <span>{value.length}/{MAX_INPUT_CHARS}</span>
      </div>
    </div>
  );
}
