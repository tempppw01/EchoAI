'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, SendHorizontal, SlidersHorizontal, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { sessions, activeSessionId, sendMessage, createSession, generatingSessionIds, stopMessage } = useChatStore();
  const { settings, setSettings } = useSettingsStore();

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  const parseFiles = async (files: File[]) => {
    const parsed = await Promise.all(
      files.map(async (file) => {
        const item: PendingAttachment = {
          id: uid(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        };
        if (file.type.startsWith('image/')) item.previewUrl = await readAsDataUrl(file);
        return item;
      }),
    );
    setAttachments((prev) => [...prev, ...parsed]);
  };

  // 统一发送逻辑：复用已有会话，不存在时按当前 mode 创建新会话。
  const onSend = () => {
    if (!value.trim() && attachments.length === 0) return;

    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);

    const attachmentText = attachments
      .map((item) => (item.previewUrl ? `![${item.name}](${item.previewUrl})` : `[附件] ${item.name} (${Math.ceil(item.size / 1024)}KB)`))
      .join('\n');

    const finalContent = [value.trim(), attachmentText].filter(Boolean).join('\n\n');
    sendMessage(finalContent, sid);

    setValue('');
    setAttachments([]);
    setInputHint('已发送，附件内容已随消息提交。');
    setShowOptions(false);
  };

  return (
    <div className="border-t bg-card/95 p-3 backdrop-blur md:p-4">
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => parseFiles(Array.from(e.target.files || []))}
      />

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          {attachments.map((item) => (
            <div key={item.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
              <Paperclip size={12} />
              <span>{item.name}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((entry) => entry.id !== item.id))} aria-label="删除附件">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-panel flex items-end gap-2 p-2">
        <Button className="rounded-xl bg-transparent text-foreground" onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
        </Button>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value;
            if (nextValue.length > MAX_INPUT_CHARS) {
              setValue(nextValue.slice(0, MAX_INPUT_CHARS));
              setInputHint(`已达到 ${MAX_INPUT_CHARS} 字上限。`);
              return;
            }
            setValue(nextValue);
            if (inputHint) setInputHint('');
          }}
          rows={1}
          className="min-h-16 max-h-[220px] resize-none overflow-y-auto rounded-xl border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="支持 Markdown。Enter 发送，Shift + Enter 换行"
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
            e.preventDefault();
            onSend();
          }}
        />

        {isGenerating && activeSession?.id ? (
          <Button className="rounded-xl bg-transparent text-foreground" onClick={() => stopMessage(activeSession.id)}>
            <Square size={16} />
          </Button>
        ) : (
          <Button className="rounded-xl" disabled={!value.trim() && attachments.length === 0} onClick={onSend}>
            <SendHorizontal size={16} />
          </Button>
        )}

        <Button className="rounded-xl bg-transparent text-foreground" onClick={() => setShowOptions((prev) => !prev)}>
          <SlidersHorizontal size={16} />
        </Button>
      </div>

      {showOptions && (
        <div className="mt-2 grid gap-2 rounded-xl border bg-background/80 p-3 text-xs md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-muted-foreground">temperature</span>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={settings.temperature}
              onChange={(e) => setSettings({ temperature: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">max tokens</span>
            <Input
              type="number"
              min={256}
              max={8192}
              value={settings.maxTokens}
              onChange={(e) => setSettings({ maxTokens: Number(e.target.value) || 256 })}
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60">
            <input type="checkbox" checked={settings.stream} onChange={(e) => setSettings({ stream: e.target.checked })} />
            <span>流式输出</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60">
            <input type="checkbox" checked={settings.showTokenUsage} onChange={(e) => setSettings({ showTokenUsage: e.target.checked })} />
            <span>显示 token 用量</span>
          </label>
        </div>
      )}

      <div className="mt-1 flex items-center px-2 text-xs text-muted-foreground">
        <span>{inputHint || '提示：支持文件内容随消息发送。'}</span>
      </div>
    </div>
  );
}
