'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, FileText, Paperclip, SendHorizontal, SlidersHorizontal, Sparkles, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestOpenAICompatible } from '@/lib/openai-compatible';
import { ChatMode, VideoScriptPreset } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSampleLibraryStore } from '@/stores/sample-library-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useShallow } from 'zustand/react/shallow';

type PendingAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

type ImportedTranscript = {
  fileName: string;
  text: string;
  fileSize: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const MAX_INPUT_CHARS = 6000;
const TEXT_IMPORT_EXTENSIONS = ['txt', 'md', 'srt', 'vtt', 'json'];

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });

const isTranscriptTextFile = (file: File) => {
  const filename = file.name.toLowerCase();
  const ext = filename.includes('.') ? filename.split('.').pop() || '' : '';
  return file.type.startsWith('text/') || TEXT_IMPORT_EXTENSIONS.includes(ext);
};

const defaultVideoScriptPreset: VideoScriptPreset = {
  topic: '',
  productName: '',
  targetAudience: '',
  contentType: '口播',
  versionCount: 1,
  coreSellingPoints: '',
  toneStyle: '',
  platform: '',
  durationSec: 60,
  mustInclude: '',
  avoid: '',
};

const buildVideoScriptPromptWithPreset = (preset: VideoScriptPreset, userInput: string, recalledSamples: Array<{ title: string; content: string }> = []) => {
  const normalizedPlatform = (preset.platform || '').trim();
  const platformStrategy =
    normalizedPlatform === '抖音'
      ? '平台策略：按抖音风格输出，强调前3秒钩子、快节奏、强情绪推进、短句表达和更直接的行动号召。'
      : normalizedPlatform === '视频号'
        ? '平台策略：按视频号风格输出，强调可信、稳重、节奏适中、信息完整和更自然的转化表达。'
        : '平台策略：若未明确平台，请输出兼顾传播效率与可信度的通用短视频脚本。';

  const duration = preset.durationSec || 60;
  const durationStrategy =
    duration <= 15
      ? '时长策略：按15秒短视频输出，结构要极简，优先一个钩子、一个核心观点、一个直接收口。'
      : duration <= 30
        ? '时长策略：按30秒短视频输出，控制信息密度，突出钩子、核心卖点和快速转化。'
        : duration <= 60
          ? '时长策略：按60秒短视频输出，结构要完整，包含开头钩子、观点展开、卖点说明和结尾CTA。'
          : '时长策略：按90秒短视频输出，允许更完整的背景铺垫、对比论证、案例补充和更自然的收尾转化。';

  const contentType = (preset.contentType || '口播').trim();
  const contentTypeStrategy =
    contentType === '剧情'
      ? '内容类型策略：按剧情短视频输出，强调人物关系、场景冲突、转折和代入感。'
      : contentType === '解说'
        ? '内容类型策略：按解说型视频输出，强调观点清晰、解释顺序明确、信息表达稳定。'
        : contentType === '混剪文案'
          ? '内容类型策略：按混剪文案输出，强调短句、画面切换感、字幕节奏和片段拼接适配。'
          : '内容类型策略：按口播视频输出，强调人直接说、表达自然、节奏清晰。';

  const versionCount = Math.min(Math.max(preset.versionCount || 1, 1), 3);
  const versionStrategy = versionCount > 1
    ? `版本策略：请一次输出 ${versionCount} 个不同角度的脚本版本。必须严格使用“版本1 / 版本2 / 版本3”作为每个版本的起始标题，每个版本下都要完整包含标题、开头钩子、正文、结尾 CTA。`
    : '版本策略：先输出 1 个最稳妥的脚本版本。';

  const lines = [
    `主题/选题：${preset.topic || '未填写'}`,
    `产品/服务：${preset.productName || '未填写'}`,
    `目标人群：${preset.targetAudience || '未填写'}`,
    `内容类型：${contentType}`,
    `脚本版本数：${versionCount}`,
    `核心卖点：${preset.coreSellingPoints || '未填写'}`,
    `语气风格：${preset.toneStyle || '未填写'}`,
    `发布平台：${preset.platform || '未填写'}`,
    `时长（秒）：${duration}`,
    `必须包含：${preset.mustInclude || '无'}`,
    `避免内容：${preset.avoid || '无'}`,
    platformStrategy,
    durationStrategy,
    contentTypeStrategy,
    versionStrategy,
  ];

  const sampleBlock = recalledSamples.length > 0
    ? [
        '【召回到的示范样本】',
        ...recalledSamples.flatMap((sample, index) => [
          `样本${index + 1}：${sample.title}`,
          sample.content,
          '',
        ]),
        '请参考这些样本的表达方式、结构节奏和信息组织，但不要照抄原文，不要虚构事实。',
        '',
      ]
    : [];

  return [
    '【视频脚本预设信息】',
    ...lines,
    '',
    ...sampleBlock,
    '【用户本次需求】',
    userInput || '请基于以上预设，先给出一版可直接拍摄的脚本。',
    '',
    '【输出格式要求】',
    '请严格按以下四段结构输出，不要合并：',
    '当脚本版本数大于 1 时，必须按如下格式输出：',
    '版本1',
    '标题：...',
    '开头钩子：...',
    '正文：...',
    '结尾CTA：...',
    '版本2',
    '标题：...',
    '开头钩子：...',
    '正文：...',
    '结尾CTA：...',
    '不要把多个版本写进同一个“标题/正文”区块里。',
    '1. 标题：给出 3 个可选标题',
    '2. 开头钩子：给出 1 段适合开场前 3 秒的钩子',
    '3. 正文：给出完整脚本正文，按自然口播/叙事节奏展开',
    '4. 结尾CTA：给出 1 段明确的收口与行动引导',
    '',
    '要求：严格基于预设，不要擅自编造产品事实；若关键信息缺失，先列出缺失项再给保守版脚本。',
  ].join('\n');
};

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showVideoPreset, setShowVideoPreset] = useState(false);
  const [videoPreset, setVideoPreset] = useState<VideoScriptPreset>(defaultVideoScriptPreset);
  const [videoTaskType, setVideoTaskType] = useState<'script' | 'viral-analysis'>('script');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [importedTranscriptMeta, setImportedTranscriptMeta] = useState<{ name: string; fileSize: number; charCount: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { sessions, activeSessionId, sendMessage, createSession, generatingSessionIds, stopMessage, updateSession, clearContext } = useChatStore(
    useShallow((state) => ({
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      sendMessage: state.sendMessage,
      createSession: state.createSession,
      generatingSessionIds: state.generatingSessionIds,
      stopMessage: state.stopMessage,
      updateSession: state.updateSession,
      clearContext: state.clearContext,
    })),
  );
  const { settings, setSettings } = useSettingsStore();
  const getRelevantSamples = useSampleLibraryStore((state) => state.getRelevantSamples);

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);
  const hasVideoPresetInput = useMemo(() => {
    const p = videoPreset;
    return Boolean(
      p.topic?.trim() ||
      p.productName?.trim() ||
      p.targetAudience?.trim() ||
      p.coreSellingPoints?.trim() ||
      p.toneStyle?.trim() ||
      p.platform?.trim() ||
      p.mustInclude?.trim() ||
      p.avoid?.trim(),
    );
  }, [videoPreset]);
  const canSendVideoScriptFromPreset = mode === 'videoScript' && videoTaskType === 'script' && hasVideoPresetInput;

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

  useEffect(() => {
    if (videoTaskType !== 'viral-analysis') {
      setImportedTranscriptMeta(null);
    }
  }, [videoTaskType]);

  const applyTranscriptContent = (transcript: ImportedTranscript) => {
    const trimmed = transcript.text.trim();
    if (!trimmed) {
      setImportedTranscriptMeta(null);
      return `文件 ${transcript.fileName} 为空，未导入。`;
    }

    let clipped = false;
    setValue((prev) => {
      const base = prev.trim();
      const header = `【导入转录文本：${transcript.fileName}】`;
      const addition = [header, trimmed].join('\n');
      const separator = base ? '\n\n' : '';
      const available = MAX_INPUT_CHARS - base.length - separator.length;

      if (available <= 0) {
        clipped = true;
        return base.slice(0, MAX_INPUT_CHARS);
      }

      const content = addition.length > available ? addition.slice(0, available) : addition;
      clipped = addition.length > available;
      return `${base}${separator}${content}`.slice(0, MAX_INPUT_CHARS);
    });

    setImportedTranscriptMeta({
      name: transcript.fileName,
      fileSize: transcript.fileSize,
      charCount: trimmed.length,
    });

    return clipped
      ? `已导入 ${transcript.fileName}，但内容过长，已截断到 ${MAX_INPUT_CHARS} 字以内。`
      : `已导入转录文本：${transcript.fileName}`;
  };

  const parseFiles = async (files: File[]) => {
    const parsedResults = await Promise.allSettled(
      files.map(async (file) => {
        if (mode === 'videoScript' && videoTaskType === 'viral-analysis' && isTranscriptTextFile(file)) {
          const text = await readAsText(file);
          return {
            kind: 'transcript' as const,
            transcript: {
              fileName: file.name,
              text,
              fileSize: file.size,
            },
          };
        }

        const item: PendingAttachment = {
          id: uid(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        };
        if (file.type.startsWith('image/')) item.previewUrl = await readAsDataUrl(file);
        return {
          kind: 'attachment' as const,
          attachment: item,
        };
      }),
    );

    const nextAttachments: PendingAttachment[] = [];
    const importedTranscripts: ImportedTranscript[] = [];
    let failedCount = 0;

    parsedResults.forEach((result) => {
      if (result.status === 'rejected') {
        failedCount += 1;
        return;
      }

      if (result.value.kind === 'attachment') {
        nextAttachments.push(result.value.attachment);
        return;
      }

      importedTranscripts.push(result.value.transcript);
    });

    if (nextAttachments.length) {
      setAttachments((prev) => [...prev, ...nextAttachments]);
    }

    const hints: string[] = [];

    if (importedTranscripts.length > 0) {
      hints.push(applyTranscriptContent(importedTranscripts[0]));
      if (importedTranscripts.length > 1) {
        hints.push(`检测到 ${importedTranscripts.length} 个转录文件，当前仅载入第 1 个文件。`);
      }
    }

    if (failedCount > 0) {
      hints.push(`有 ${failedCount} 个文件读取失败，已跳过。`);
    }

    if (hints.length > 0) {
      setInputHint(hints.join(' '));
    }
  };

  const generatePresetTopic = async () => {
    if (isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    try {
      const prompt = [
        '请根据以下视频脚本预设，生成 1 个适合直接放进“主题 / 选题”输入框的中文标题。',
        '要求：',
        '1. 只返回标题本身，不要解释，不要序号，不要引号。',
        '2. 标题适合短视频选题，不要太长，尽量控制在 12-28 个字。',
        `产品/服务：${videoPreset.productName || '未填写'}`,
        `目标人群：${videoPreset.targetAudience || '未填写'}`,
        `核心卖点：${videoPreset.coreSellingPoints || '未填写'}`,
        `语气风格：${videoPreset.toneStyle || '未填写'}`,
        `发布平台：${videoPreset.platform || '未填写'}`,
        `内容类型：${videoPreset.contentType || '口播'}`,
        `时长（秒）：${videoPreset.durationSec || 60}`,
        `必须包含：${videoPreset.mustInclude || '无'}`,
        `避免内容：${videoPreset.avoid || '无'}`,
      ].join('\n');

      const topic = await requestOpenAICompatible({
        settings,
        model: settings.defaultTextModel || settings.modelCatalog[0],
        messages: [
          { role: 'system', content: '你是短视频选题助手。只输出一个可直接使用的中文标题。' },
          { role: 'user', content: prompt },
        ],
      });

      const cleanedTopic = topic.replace(/^标题[:：]\s*/i, '').split('\n')[0].trim();
      setVideoPreset((prev) => ({ ...prev, topic: cleanedTopic }));
      setInputHint('已自动生成标题。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '自动生成标题失败';
      setInputHint(message);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const onSend = async () => {
    if (!value.trim() && attachments.length === 0 && !canSendVideoScriptFromPreset) return;

    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);

    const attachmentText = attachments
      .map((item) => (item.previewUrl ? `![${item.name}](${item.previewUrl})` : `[附件] ${item.name} (${Math.ceil(item.size / 1024)}KB)`))
      .join('\n');

    let contentToSend = value.trim();

    if (mode === 'videoScript' && videoTaskType === 'viral-analysis') {
      contentToSend = [
        '【爆款文案分析任务】',
        '请分析下面这段爆款文案，输出：',
        '1. 钩子结构',
        '2. 冲突 / 观点推进',
        '3. 结尾转化结构',
        '4. 高频句式 / 金句',
        '5. 情绪词 / 节奏词',
        '6. 可复用的结构模板',
        '',
        value.trim(),
      ].join('\n');
    } else if (mode === 'videoScript' && hasVideoPresetInput) {
      updateSession(sid, { videoScriptPreset: { ...videoPreset } });
      const recallQuery = [
        videoPreset.topic || '',
        videoPreset.productName || '',
        videoPreset.targetAudience || '',
        videoPreset.coreSellingPoints || '',
        contentToSend,
      ].filter(Boolean).join('\n');
      const recalledSamples = (await getRelevantSamples(recallQuery, settings.sampleRecallTopK)).map((item) => ({
        title: item.title,
        content: item.textContent.slice(0, 1500),
      }));
      contentToSend = buildVideoScriptPromptWithPreset(videoPreset, contentToSend, recalledSamples);
    }

    const finalContent = [contentToSend, attachmentText].filter(Boolean).join('\n\n');
    sendMessage(finalContent, sid);

    setValue('');
    setAttachments([]);
    setImportedTranscriptMeta(null);
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
        <div className="mb-3 space-y-3">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-background/70 p-1 shadow-sm">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${videoTaskType === 'script' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setVideoTaskType('script')}
              >
                脚本生成
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${videoTaskType === 'viral-analysis' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setVideoTaskType('viral-analysis')}
              >
                爆款文案分析
              </button>
            </div>
          </div>

          {activeSession?.preferredCandidate && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">当前参考候选：</span>
              {activeSession.preferredCandidate.label}
            </div>
          )}

          {videoTaskType === 'script' && (
            <div className="rounded-xl border bg-background/70 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">视频脚本预设</span>
                <button className="text-muted-foreground" onClick={() => setShowVideoPreset((prev) => !prev)}>
                  {showVideoPreset ? '收起' : '展开'}
                </button>
              </div>
              {showVideoPreset && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-muted-foreground">主题 / 选题</span>
                    <div className="flex gap-2">
                      <Input value={videoPreset.topic || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, topic: e.target.value }))} placeholder="例如：为什么越来越多工厂改用金属卡板？" />
                      <Button
                        type="button"
                        className="h-10 rounded-xl px-3"
                        onClick={generatePresetTopic}
                        disabled={isGeneratingTopic}
                        title="自动生成标题"
                      >
                        <Sparkles size={16} className={isGeneratingTopic ? 'animate-pulse' : ''} />
                      </Button>
                    </div>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">产品/服务</span>
                    <Input value={videoPreset.productName || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, productName: e.target.value }))} placeholder="例如：金属卡板" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">目标人群</span>
                    <Input value={videoPreset.targetAudience || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, targetAudience: e.target.value }))} placeholder="例如：工厂采购负责人" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">内容类型</span>
                    <select
                      className="h-10 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={videoPreset.contentType || '口播'}
                      onChange={(e) => setVideoPreset((prev) => ({ ...prev, contentType: e.target.value }))}
                    >
                      <option value="口播">口播</option>
                      <option value="剧情">剧情</option>
                      <option value="解说">解说</option>
                      <option value="混剪文案">混剪文案</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">脚本版本数</span>
                    <select
                      className="h-10 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={String(videoPreset.versionCount || 1)}
                      onChange={(e) => setVideoPreset((prev) => ({ ...prev, versionCount: Number(e.target.value) || 1 }))}
                    >
                      <option value="1">1 个版本</option>
                      <option value="2">2 个版本</option>
                      <option value="3">3 个版本</option>
                    </select>
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
                    <select
                      className="h-10 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={videoPreset.platform || ''}
                      onChange={(e) => setVideoPreset((prev) => ({ ...prev, platform: e.target.value }))}
                    >
                      <option value="">请选择平台</option>
                      <option value="抖音">抖音</option>
                      <option value="视频号">视频号</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">时长（秒）</span>
                    <select
                      className="h-10 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={String(videoPreset.durationSec || 60)}
                      onChange={(e) => setVideoPreset((prev) => ({ ...prev, durationSec: Number(e.target.value) || 60 }))}
                    >
                      <option value="15">15 秒</option>
                      <option value="30">30 秒</option>
                      <option value="60">60 秒</option>
                      <option value="90">90 秒</option>
                    </select>
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

          {videoTaskType === 'viral-analysis' && importedTranscriptMeta && (
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-sky-300" />
                <span className="font-medium text-foreground">已导入转录文本：</span>
                <span>{importedTranscriptMeta.name}</span>
              </div>
              <p className="mt-1">内容已自动填入分析输入框，可直接发送继续做结构提取。</p>
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
          placeholder={mode === 'videoScript' && videoTaskType === 'viral-analysis' ? '直接粘贴爆款文案，或导入 txt/md/srt/vtt/json 转录文本后回车发送分析' : '支持 Markdown。Enter 发送，Shift + Enter 换行'}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
            if (!value.trim() && !attachments.length && !canSendVideoScriptFromPreset) return;
            e.preventDefault();
            onSend();
          }}
        />}

        {activeSession?.id && mode !== 'training' && (
          <Button
            className="rounded-xl bg-transparent text-foreground"
            title="清空当前会话上下文"
            onClick={() => {
              clearContext(activeSession.id);
              setImportedTranscriptMeta(null);
              setInputHint('已清空当前会话上下文。');
            }}
          >
            <Eraser size={16} />
          </Button>
        )}

        {isGenerating && activeSession?.id ? (
          <Button className="rounded-xl bg-transparent text-foreground" onClick={() => stopMessage(activeSession.id)}>
            <Square size={16} />
          </Button>
        ) : (
          <Button className="rounded-xl" disabled={mode === 'training' || (!value.trim() && attachments.length === 0 && !canSendVideoScriptFromPreset)} onClick={onSend}>
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
        <span>{inputHint || '支持文件内容随消息发送。'}</span>
      </div>
    </div>
  );
}
