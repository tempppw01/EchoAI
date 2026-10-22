'use client';

import { Check, History, ImagePlus, Palette, Ratio, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  buildImageRequest,
  imageRatioPresets,
  imageStylePresets,
} from '@/components/image/image-workbench-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatSession } from '@/lib/types';
import { useUIStore } from '@/stores/ui-store';

const MAX_PROMPT_CHARS = 6000;

export function ProImagePanel({ session }: { session?: ChatSession }) {
  const imageDraft = useUIStore((state) => state.imageDraft);
  const setImageDraft = useUIStore((state) => state.setImageDraft);
  const resetImageDraft = useUIStore((state) => state.resetImageDraft);

  const recentPrompts = useMemo(
    () =>
      (session?.messages || [])
        .filter((message) => message.role === 'user' && message.content.trim())
        .slice(-4)
        .reverse(),
    [session?.messages],
  );

  const selectedRatio = imageRatioPresets.find((preset) => preset.value === imageDraft.ratio) || imageRatioPresets[0];
  const hasPrompt = Boolean(imageDraft.prompt.trim());
  const hasDraft =
    hasPrompt ||
    Boolean(imageDraft.negativePrompt.trim()) ||
    imageDraft.style !== imageStylePresets[0] ||
    imageDraft.ratio !== imageRatioPresets[0].value;
  const requestPreview = useMemo(() => buildImageRequest(imageDraft), [imageDraft]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <ImagePlus size={15} />
            </span>
            专业绘图工作台
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            编辑区与底部输入框使用同一套参数，发送时会完整写入对话记录。
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium ${
              hasPrompt
                ? 'border-success/25 bg-success/8 text-success'
                : 'border-border bg-background/60 text-muted-foreground'
            }`}
          >
            <Check size={13} />
            {hasPrompt ? '参数已同步' : '等待提示词'}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasDraft}
            onClick={resetImageDraft}
          >
            <RotateCcw size={13} />
            重置
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.72fr)]">
        <section className="chat-panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wand2 size={15} className="text-primary" />
              画面描述
            </div>
            <span
              className={`text-xs tabular-nums ${
                imageDraft.prompt.length >= MAX_PROMPT_CHARS ? 'text-warning' : 'text-muted-foreground'
              }`}
            >
              {imageDraft.prompt.length}/{MAX_PROMPT_CHARS}
            </span>
          </div>

          <div className="p-4">
            <label className="block">
              <span className="ui-label">核心提示词</span>
              <Textarea
                value={imageDraft.prompt}
                onChange={(event) => setImageDraft({ prompt: event.target.value.slice(0, MAX_PROMPT_CHARS) })}
                rows={5}
                maxLength={MAX_PROMPT_CHARS}
                className="mt-2 min-h-[132px] resize-y bg-background/60 leading-6 md:min-h-[158px]"
                placeholder="描述主体、场景、光线、镜头语言和材质细节。例如：拉丝铝智能音箱置于洞石台面，清晨侧逆光，商业产品摄影，浅景深。"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              先交代主体和环境，再补充镜头、光线与材质。底部输入框会同步这段内容。
            </p>

            <label className="mt-4 block">
              <span className="ui-label">负面提示词</span>
              <Input
                value={imageDraft.negativePrompt}
                onChange={(event) => setImageDraft({ negativePrompt: event.target.value })}
                className="mt-2 h-9 bg-background/60"
                placeholder="例如：低质量、文字变形、背景杂乱、过度锐化"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(190px,0.75fr)]">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Palette size={13} className="text-primary" />
                    视觉风格
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{imageDraft.style}</span>
                </div>
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {imageStylePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      data-state={imageDraft.style === preset ? 'active' : 'inactive'}
                      className="ui-segmented-trigger h-8 shrink-0 px-2.5"
                      onClick={() => setImageDraft({ style: preset })}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Ratio size={13} className="text-primary" />
                    画幅比例
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{selectedRatio.description}</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {imageRatioPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      data-state={imageDraft.ratio === preset.value ? 'active' : 'inactive'}
                      className="ui-segmented-trigger h-8 min-w-0 flex-col gap-0 px-1 py-0"
                      title={preset.description}
                      onClick={() => setImageDraft({ ratio: preset.value })}
                    >
                      <span className="text-[11px] font-semibold">{preset.value}</span>
                      <span className="text-[9px] font-normal opacity-70">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className={hasPrompt ? 'text-success' : ''} />
              发送后会保留风格与画幅，提示词会清空以便继续创作
            </span>
            <span className="tabular-nums">
              {imageDraft.style} · {imageDraft.ratio}
            </span>
          </div>
        </section>

        <div className="space-y-4">
          <section className="chat-panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles size={15} className="text-primary" />
                发送预览
              </div>
              <span className="text-[11px] text-muted-foreground">完整参数</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center rounded-lg border bg-muted/25 p-3">
                <div
                  className="flex max-h-[190px] w-full max-w-[180px] flex-col items-center justify-center rounded-md border border-primary/20 bg-background/75 px-3 text-center"
                  style={{ aspectRatio: selectedRatio.aspectRatio }}
                >
                  <Ratio size={18} className="text-primary" />
                  <span className="mt-2 text-xs font-semibold text-foreground">{imageDraft.ratio}</span>
                  <span className="mt-1 text-[10px] text-muted-foreground">{selectedRatio.description}</span>
                </div>
              </div>
              <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-background/60 p-3 text-xs leading-5 text-muted-foreground">
                {requestPreview}
              </pre>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">
                  {imageDraft.style}
                </span>
                <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">
                  {imageDraft.ratio}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 ${
                    imageDraft.negativePrompt.trim()
                      ? 'border-warning/25 bg-warning/8 text-warning'
                      : 'border-border bg-background/60 text-muted-foreground'
                  }`}
                >
                  {imageDraft.negativePrompt.trim() ? '含负面约束' : '无负面约束'}
                </span>
              </div>
            </div>
          </section>

          <section className="chat-panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <History size={15} className="text-primary" />
                最近提示词
              </div>
              <span className="text-[11px] text-muted-foreground">
                {recentPrompts.length ? `${recentPrompts.length} 条` : '暂无'}
              </span>
            </div>
            <div className="p-3">
              {recentPrompts.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-background/45 px-3 py-4 text-xs leading-5 text-muted-foreground">
                  发送后会在这里保留完整请求；画面对话仍可在下方消息区查看。
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPrompts.map((message) => (
                    <div key={message.id} className="rounded-lg border bg-background/55 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        <span>已发送</span>
                        <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                      </div>
                      <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
