'use client';

import { ImagePlus, Layers3, Palette, Ratio, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatSession } from '@/lib/types';

const stylePresets = [
  '电影感海报',
  '产品渲染',
  '编辑大片',
  '3D 等距',
  '动漫概念',
  '极简品牌',
];

const ratioPresets = ['1:1', '4:5', '16:9', '9:16'];

export function ProImagePanel({ session }: { session?: ChatSession }) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [keyword, setKeyword] = useState('');
  const [style, setStyle] = useState(stylePresets[0]);
  const [ratio, setRatio] = useState(ratioPresets[0]);

  const recentMessages = useMemo(
    () => (session?.messages || []).filter((message) => message.content.trim()).slice(-3).reverse(),
    [session?.messages],
  );

  const promptPreview = useMemo(() => {
    const lines = [
      prompt.trim() || '在这里描述主体、场景、镜头语言和材质细节。',
      `风格：${style}`,
      `画幅比例：${ratio}`,
    ];

    if (negativePrompt.trim()) {
      lines.push(`避免内容：${negativePrompt.trim()}`);
    }

    return lines.join('\n');
  }, [negativePrompt, prompt, ratio, style]);

  return (
    <div className="space-y-5">
      <div className="chat-panel overflow-hidden p-0">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.82))] px-5 py-5 text-white md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                <Sparkles size={14} />
                图片工作区
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">让图片页真正像一个可用的创作工作台。</h2>
              <p className="mt-2 text-sm leading-6 text-white/72">
                这里可以先整理提示词、锁定视觉方向，再保留图片工作流的最近上下文，而不是退回到通用聊天壳里。
              </p>
            </div>
            <div className="grid gap-2 text-sm text-white/80 md:min-w-[280px]">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>当前会话</span>
                  <span className="font-medium text-white">{session?.mode === 'proImage' ? '专业绘图' : '图片生成'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>提示词记录</span>
                  <span className="font-medium text-white">{session?.messages.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div className="chat-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 size={16} className="text-primary" />
              提示词编辑区
            </div>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-muted-foreground">核心提示词</span>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={6}
                  placeholder="例如：一台拉丝铝制智能音箱置于洞石台面上，清晨侧逆光，商业产品摄影，浅景深。"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-muted-foreground">负面提示词</span>
                <Input
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  placeholder="例如：低质量、手部畸形、背景杂乱、文字变形"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="chat-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette size={16} className="text-primary" />
              风格方向
            </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {stylePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStyle(preset)}
                    data-state={style === preset ? 'active' : 'inactive'}
                    className={`ui-segmented-trigger px-3 py-2 text-sm ${
                      style === preset
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="chat-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Ratio size={16} className="text-primary" />
              画幅比例
            </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ratioPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRatio(preset)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      ratio === preset
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="font-medium">{preset}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {preset === '1:1'
                        ? '头像与产品方图'
                        : preset === '4:5'
                          ? '海报与信息流封面'
                          : preset === '16:9'
                            ? '横幅与演示封面'
                            : '竖屏故事与短视频'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chat-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers3 size={16} className="text-primary" />
                使用建议
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPrompt('');
                  setNegativePrompt('');
                  setStyle(stylePresets[0]);
                  setRatio(ratioPresets[0]);
                  setKeyword('');
                }}
              >
                重置
              </Button>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="font-medium text-foreground">1. 先说主体</div>
                <p className="mt-2 leading-6">优先交代对象、环境、材质和镜头氛围，先给模型一个清晰锚点。</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="font-medium text-foreground">2. 锁定风格</div>
                <p className="mt-2 leading-6">尽量只强调一个明确的视觉方向，不要堆太多彼此冲突的形容词。</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <div className="font-medium text-foreground">3. 减少噪音</div>
                <p className="mt-2 leading-6">负面提示词更适合用来去掉常见瑕疵，而不是事无巨细地强控每个细节。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="chat-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImagePlus size={16} className="text-primary" />
              提示词预览
            </div>
            <div className="mt-4 rounded-2xl border bg-background/70 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{promptPreview}</pre>
            </div>
          </div>

          <div className="chat-panel p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles size={16} className="text-primary" />
              搜索与复用
            </div>
            <div className="mt-4 space-y-3">
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索历史提示词、产品名或风格关键词" />
              <div className="rounded-2xl border border-dashed bg-background/50 p-5 text-sm text-muted-foreground">
                这里预留给参考图拖拽上传。当前先把视觉输入区域单独留出来，避免继续埋在通用输入框里。
              </div>
            </div>
          </div>

          <div className="chat-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">最近会话轨迹</div>
              <span className="text-xs text-muted-foreground">{recentMessages.length ? `${recentMessages.length} 条` : '空'}</span>
            </div>
            {recentMessages.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-background/50 p-5 text-sm text-muted-foreground">
                当前还没有图片侧会话。等你从下方发送提示词后，最近的请求和结果会保留在这里。
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentMessages.map((message) => (
                  <div key={message.id} className="rounded-2xl border bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{message.role}</span>
                      <span className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
