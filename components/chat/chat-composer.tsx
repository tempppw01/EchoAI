'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { Info, Paperclip, SendHorizontal, SlidersHorizontal, Square, Upload, X } from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Info, SendHorizontal, SlidersHorizontal, Sparkles, Upload } from 'lucide-react';
import { Hammer, Info, Mic, Plus, SendHorizontal, SlidersHorizontal, Upload } from 'lucide-react';
import { Info, SendHorizontal, SlidersHorizontal, Square, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMode } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';

type PendingAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const MAX_INPUT_CHARS = 6000;
  const PASTE_DEBOUNCE_MS = 140;

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { sessions, activeSessionId, sendMessage, updateSession, createSession, generatingSessionIds, stopMessage } = useChatStore();
  const { settings, setSettings } = useSettingsStore();

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const model = activeSession?.model ?? (mode === 'image' || mode === 'proImage' ? settings.defaultImageModel : settings.defaultTextModel);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);

  const appendLargeText = (input: string) => {
    const chunks = input.match(/[\s\S]{1,1600}/g) ?? [input];
    let index = 0;
    const run = () => {
      setValue((prev) => `${prev}${chunks[index]}`);
      index += 1;
      if (index < chunks.length) window.setTimeout(run, 0);
    };
    run();
  };

  const parseFiles = async (files: File[]) => {
    const parsed = await Promise.all(files.map(async (file) => {
      const item: PendingAttachment = {
        id: uid(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      };
      if (file.type.startsWith('image/')) {
        item.previewUrl = await readAsDataUrl(file);
      }
      return item;
    }));
    setAttachments((prev) => [...prev, ...parsed]);
  };

  const onSend = () => {
    if (!value.trim() && attachments.length === 0) return;
    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);

    const attachmentText = attachments.map((item) => {
      if (item.previewUrl) {
        return `![${item.name}](${item.previewUrl})`;
      }
      return `[附件] ${item.name} (${Math.ceil(item.size / 1024)}KB)`;
    }).join('\n');

    const finalContent = [value.trim(), attachmentText].filter(Boolean).join('\n\n');
    sendMessage(finalContent, sid);
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
    setAttachments([]);
  };

  return (
    <div className="border-t bg-card/95 p-3 backdrop-blur md:p-4" onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); parseFiles(Array.from(e.dataTransfer.files)); }}>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => parseFiles(Array.from(e.target.files || []))} />
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
    <div className="border-t bg-card/95 p-3 backdrop-blur md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-muted-foreground shadow-sm">当前模块 /{mode}</span>
    <div className="border-t bg-card/95 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur md:p-4 md:pb-4">
      <div className="mb-2 hidden flex-wrap items-center gap-2 text-xs md:flex">
        <span className="rounded-full bg-muted px-2 py-1">当前模块 /{mode}</span>
        <select
          className="h-9 rounded-xl border border-border/60 bg-background px-3 pr-8 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          value={model}
          onChange={(e) => activeSession && updateSession(activeSession.id, { model: e.target.value })}
        >
          {(settings.modelCatalog?.length ? settings.modelCatalog : [settings.defaultTextModel, settings.defaultImageModel, 'gpt-4o', 'gpt-4.1-mini']).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary shadow-sm">
          <Sparkles size={12} /> 推荐
        </span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 bg-background px-2.5 py-1 text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">会话级模型<Info size={12} /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="z-50 rounded bg-foreground px-2 py-1 text-xs text-background" sideOffset={6}>
                当前会话可单独设置模型，不影响全局默认模型。
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          {attachments.map((item) => (
            <div key={item.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
              <Paperclip size={12} />
              <span>{item.name}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((entry) => entry.id !== item.id))}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className={`chat-panel flex items-end gap-2 p-2 ${dragging ? 'ring-2 ring-primary' : ''}`}>
        <Button className="rounded-xl bg-transparent text-foreground" onClick={() => fileRef.current?.click()}><Upload size={16} /></Button>
      <div className="chat-panel flex items-end gap-2 rounded-[28px] border-[#e7e7ec] bg-[#f2f2f6] p-2.5 shadow-none dark:border-border dark:bg-card md:rounded-2xl md:border-border md:bg-[hsl(var(--surface)/0.9)] md:p-2 md:shadow-sm">
        <Button className="hidden rounded-xl bg-transparent text-foreground md:inline-flex"><Upload size={16} /></Button>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden"><Plus size={20} /></button>
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
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="max-h-40 min-h-16 resize-y rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="支持 Markdown。Enter 换行，Ctrl/⌘ + Enter 发送"
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (!pasted || pasted.length < 1200) return;
            e.preventDefault();
            appendLargeText(`${value ? '\n' : ''}${pasted}`);
          }}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && (value.trim() || attachments.length)) onSend(); }}
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
          disabled={!value.trim() || isGenerating}
          disabled={!isGenerating && !value.trim() && attachments.length === 0}
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
