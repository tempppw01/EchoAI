'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, SendHorizontal, SlidersHorizontal, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatMode, VideoScriptPreset } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useShallow } from 'zustand/react/shallow';

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

const defaultVideoScriptPreset: VideoScriptPreset = {
  productName: '',
  targetAudience: '',
  coreSellingPoints: '',
  toneStyle: '',
  platform: '',
  durationSec: 60,
  mustInclude: '',
  avoid: '',
};

const buildVideoScriptPromptWithPreset = (preset: VideoScriptPreset, userInput: string) => {
  const lines = [
    `产品/服务：${preset.productName || '未填写'}`,
    `目标人群：${preset.targetAudience || '未填写'}`,
    `核心卖点：${preset.coreSellingPoints || '未填写'}`,
    `语气风格：${preset.toneStyle || '未填写'}`,
    `发布平台：${preset.platform || '未填写'}`,
    `时长（秒）：${preset.durationSec || 60}`,
    `必须包含：${preset.mustInclude || '无'}`,
    `避免内容：${preset.avoid || '无'}`,
  ];

  return [
    '【视频脚本预设信息】',
    ...lines,
    '',
    '【用户本次需求】',
    userInput || '请基于以上预设，先给出一版可直接拍摄的脚本。',
    '',
    '要求：严格基于预设，不要擅自编造产品事实；若关键信息缺失，先列出缺失项再给保守版脚本。',
  ].join('\n');
};

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const MAX_INPUT_CHARS = 6000;
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showVideoPreset, setShowVideoPreset] = useState(true);
  const [videoPreset, setVideoPreset] = useState<VideoScriptPreset>(defaultVideoScriptPreset);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { sessions, activeSessionId, sendMessage, createSession, generatingSessionIds, stopMessage, updateSession } = useChatStore(
    useShallow((state) => ({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      sendMessage: state.sendMessage,
      createSession: state.createSession,
      generatingSessionIds: state.generatingSessionIds,
      stopMessage: state.stopMessage,
      updateSession: state.updateSession,
    })),
  );
  const { settings, setSettings } = useSettingsStore();

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);
  const hasVideoPresetInput = useMemo(() => {
    const p = videoPreset;
    return Boolean(
      p.productName?.trim() ||
      p.targetAudience?.trim() ||
      p.coreSellingPoints?.trim() ||
      p.toneStyle?.trim() ||
      p.platform?.trim() ||
      p.mustInclude?.trim() ||
      p.avoid?.trim(),
    );
  }, [videoPreset]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (activeSession?.mode !== 'videoScript') return;
    setVideoPreset({ ...defaultVideoScriptPreset, ...(activeSession.videoScriptPreset || {}) });
  }, [activeSession?.id, activeSession?.mode, activeSession?.videoScriptPreset]);

  const parseFiles = async (files: File[]) => {
    const parsedResults = await Promise.allSettled(
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

    const parsed = parsedResults
      .filter((result): result is PromiseFulfilledResult<PendingAttachment> => result.status === 'fulfilled')
      .map((result) => result.value);

    if (parsed.length) {
      setAttachments((prev) => [...prev, ...parsed]);
    }

    const failedCount = parsedResults.length - parsed.length;
    if (failedCount > 0) {
      setInputHint(`有 ${failedCount} 个附件读取失败，已跳过。`);
    }
  };

  // 统一发送逻辑：复用已有会话，不存在时按当前 mode 创建新会话。
  const onSend = () => {
    if (!value.trim() && attachments.length === 0) return;

    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);

    const attachmentText = attachments
      .map((item) => (item.previewUrl ? `![${item.name}](${item.previewUrl})` : `[附件] ${item.name} (${Math.ceil(item.size / 1024)}KB)`))
      .join('\n');

    let contentToSend = value.trim();

    if (mode === 'videoScript' && hasVideoPresetInput) {
      updateSession(sid, { videoScriptPreset: { ...videoPreset } });
      contentToSend = buildVideoScriptPromptWithPreset(videoPreset, contentToSend);
    }

    const finalContent = [contentToSend, attachmentText].filter(Boolean).join('\n\n');
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
        onChange={async (e: ChangeEvent<HTMLInputElement>) => {
          await parseFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      {mode === 'videoScript' && (
        <div className="mb-2 rounded-xl border bg-background/70 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">视频脚本预设</span>
            <button className="text-muted-foreground" onClick={() => setShowVideoPreset((prev) => !prev)}>
              {showVideoPreset ? '收起' : '展开'}
            </button>
          </div>
          {showVideoPreset && (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-muted-foreground">产品/服务</span>
                <Input value={videoPreset.productName || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, productName: e.target.value }))} placeholder="例如：金属卡板" />
              </label>
              <label className="grid gap-1">
                <span className="text-muted-foreground">目标人群</span>
                <Input value={videoPreset.targetAudience || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, targetAudience: e.target.value }))} placeholder="例如：工厂采购负责人" />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-muted-foreground">核心卖点</span>
                <Input value={videoPreset.coreSellingPoints || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, coreSellingPoints: e.target.value }))} placeholder="例如：耐用、可循环、长期成本低" />
              </label>
              <label className="grid gap-1">
                <span className="text-muted-foreground">语气风格</span>
                <Input value={videoPreset.toneStyle || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, toneStyle: e.target.value }))} placeholder="例如：专业、直接、有对比" />
              </label>
              <label className="grid gap-1">
                <span className="text-muted-foreground">发布平台</span>
                <Input value={videoPreset.platform || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, platform: e.target.value }))} placeholder="例如：抖音 / 视频号" />
              </label>
              <label className="grid gap-1">
                <span className="text-muted-foreground">时长（秒）</span>
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={videoPreset.durationSec || 60}
                  onChange={(e) => setVideoPreset((prev) => ({ ...prev, durationSec: Number(e.target.value) || 60 }))}
                />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-muted-foreground">必须包含</span>
                <Input value={videoPreset.mustInclude || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, mustInclude: e.target.value }))} placeholder="例如：运镜、成本对比、行动号召" />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-muted-foreground">避免内容</span>
                <Input value={videoPreset.avoid || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, avoid: e.target.value }))} placeholder="例如：绝对化承诺、虚构参数" />
              </label>
            </div>
          )}
        </div>
      )}

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
        {mode === 'training' && (
          <div className="flex-1 rounded-xl border border-dashed border-primary/30 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 px-3 py-4 text-sm text-muted-foreground">
            训练模式请在上方点击大卡片选项作答，系统会自动连续出题并更新分数。
          </div>
        )}
        <Button className="rounded-xl bg-transparent text-foreground" disabled={mode === 'training'} onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
        </Button>

        {mode !== 'training' && <Textarea
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
        />}

        {isGenerating && activeSession?.id ? (
          <Button className="rounded-xl bg-transparent text-foreground" onClick={() => stopMessage(activeSession.id)}>
            <Square size={16} />
          </Button>
        ) : (
          <Button className="rounded-xl" disabled={mode === 'training' || (!value.trim() && attachments.length === 0)} onClick={onSend}>
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
