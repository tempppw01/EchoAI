'use client';

import { type ChangeEvent, type ClipboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, FileText, Paperclip, SendHorizontal, Settings, SlidersHorizontal, Sparkles, Square, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestOpenAICompatible } from '@/lib/openai-compatible';
import { ChatMode, VideoScriptPreset } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSampleLibraryStore } from '@/stores/sample-library-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
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

const clipboardImageExtension = (type: string) => {
  const subtype = type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (!subtype) return 'png';
  return subtype === 'jpeg' ? 'jpg' : subtype;
};

const normalizeClipboardImageFile = (file: File, index: number) => {
  if (file.name && file.name !== 'image.png') return file;
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return new File([file], `粘贴图片-${timestamp}-${index + 1}.${clipboardImageExtension(file.type)}`, {
    type: file.type || 'image/png',
    lastModified: file.lastModified,
  });
};

const defaultVideoScriptPreset: VideoScriptPreset = {
  outputType: 'script',
  topic: '',
  businessType: '',
  productName: '',
  targetAudience: '',
  contentType: '口播',
  versionCount: 1,
  coreSellingPoints: '',
  toneStyle: '',
  platform: '',
  durationSec: 60,
  contentGoal: '',
  referenceSamples: '',
  trendKeywords: '',
  mustInclude: '',
  avoid: '',
};

type DouyinTrendItem = {
  title: string;
  hot?: string;
  label?: string;
  url?: string;
  desc?: string;
};

const outputTypeLabel = (outputType?: VideoScriptPreset['outputType']) => (outputType === 'copy' ? '营销文案' : '短视频脚本');

const buildVideoScriptPromptWithPreset = (preset: VideoScriptPreset, userInput: string, recalledSamples: Array<{ title: string; content: string }> = []) => {
  const normalizedPlatform = (preset.platform || '').trim();
  const outputType = preset.outputType || 'script';
  const outputLabel = outputTypeLabel(outputType);
  const platformStrategy =
    normalizedPlatform === '抖音'
      ? '平台策略：按抖音风格输出，强调前3秒钩子、快节奏、强情绪推进、短句表达和更直接的行动号召；若有热搜关键词，只借势切入，不硬蹭。'
      : normalizedPlatform === '视频号'
        ? '平台策略：按视频号风格输出，强调可信、稳重、节奏适中、信息完整和更自然的转化表达。'
        : '平台策略：若未明确平台，请输出兼顾传播效率与可信度的通用内容。';

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
    ? `版本策略：请一次输出 ${versionCount} 个不同角度的${outputLabel}版本。必须严格使用“版本1 / 版本2 / 版本3”作为每个版本的起始标题。`
    : `版本策略：先输出 1 个最稳妥的${outputLabel}版本。`;

  const lines = [
    `输出类型：${outputLabel}`,
    `主题/选题：${preset.topic || '未填写'}`,
    `我是做什么的/业务类型：${preset.businessType || '未填写'}`,
    `产品/服务：${preset.productName || '未填写'}`,
    `目标人群：${preset.targetAudience || '未填写'}`,
    `内容类型：${contentType}`,
    `版本数：${versionCount}`,
    `核心卖点：${preset.coreSellingPoints || '未填写'}`,
    `语气风格：${preset.toneStyle || '未填写'}`,
    `发布平台：${preset.platform || '未填写'}`,
    `时长（秒）：${duration}`,
    `内容目标：${preset.contentGoal || '未填写'}`,
    `抖音热搜/趋势关键词：${preset.trendKeywords || '无'}`,
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

  const viralReferenceBlock = preset.viralStructureReference?.content?.trim()
    ? [
        '【已选择的爆款结构参考】',
        `参考标签：${preset.viralStructureReference.label}`,
        preset.viralStructureReference.content.trim(),
        '请优先借鉴这份结构模板来组织本次脚本，但不要照抄原文，要结合当前主题、产品、人群重新生成。',
        '',
      ]
    : [];

  const manualSampleBlock = preset.referenceSamples?.trim()
    ? [
        '【用户提供的参考样本】',
        preset.referenceSamples.trim(),
        '请提炼这些样本的结构、语气、节奏和高频表达，不要照抄，不要复述明显不属于当前产品的事实。',
        '',
      ]
    : [];

  return [
    '【内容创作参数】',
    ...lines,
    '',
    ...sampleBlock,
    ...manualSampleBlock,
    ...viralReferenceBlock,
    '【用户本次需求】',
    userInput || `请基于以上参数，先给出一版可直接使用的${outputLabel}。`,
    '',
    '【输出格式要求】',
    outputType === 'copy'
      ? '请输出：标题/开头钩子/正文文案/行动引导/可替换短句。适合直接发布或二次改写。'
      : '请严格按以下四段结构输出，不要合并：标题、开头钩子、正文、结尾CTA。',
    '当版本数大于 1 时，必须按如下格式输出：',
    '版本1',
    '标题：...',
    '开头钩子：...',
    outputType === 'copy' ? '正文文案：...' : '正文：...',
    '结尾CTA：...',
    '版本2',
    '标题：...',
    '开头钩子：...',
    '正文：...',
    '结尾CTA：...',
    '不要把多个版本写进同一个“标题/正文”区块里。',
    '1. 标题：给出 3 个可选标题',
    '2. 开头钩子：给出 1 段适合开场或首屏的钩子',
    outputType === 'copy' ? '3. 正文文案：给出可直接发布的完整文案' : '3. 正文：给出完整脚本正文，按自然口播/叙事节奏展开',
    '4. 结尾CTA：给出 1 段明确的收口与行动引导',
    '',
    '要求：严格基于参数，不要擅自编造产品事实；若关键信息缺失，先列出缺失项再给保守版本。',
  ].join('\n');
};


const buildEditingIdeaPrompt = (scriptContent: string, preset: VideoScriptPreset, userInput: string) => {
  const lines = [
    '【剪辑思路生成任务】',
    `发布平台：${preset.platform || '未填写'}`,
    `内容类型：${preset.contentType || '口播'}`,
    `时长（秒）：${preset.durationSec || 60}`,
    `主题/选题：${preset.topic || '未填写'}`,
    `产品/服务：${preset.productName || '未填写'}`,
    `目标人群：${preset.targetAudience || '未填写'}`,
    `核心卖点：${preset.coreSellingPoints || '未填写'}`,
    '',
    '【脚本原文】',
    scriptContent.trim() || '未提供脚本原文',
    '',
    '【补充要求】',
    userInput || '请根据这份脚本输出可直接执行的剪辑思路。',
    '',
    '【输出格式要求】',
    '请严格按以下栏目输出，不要省略标题：',
    '## 分镜表',
    '| 段落 | 旁白 | 镜头 | 字幕重点 | 建议时长 |',
    '| --- | --- | --- | --- | --- |',
    '| 1 | ... | ... | ... | ... |',
    '要求：至少输出 3 行，内容必须和脚本逐段对应，镜头列必须写清：镜头类型（如近景/中景/特写/口播/B-roll/转场插入） + 画面内容 + 基本拍法，建议时长写秒数。',
    '',
    '## 分镜建议',
    '- 按段落拆解镜头、画面与旁白对应关系，并补充该段为什么这样剪',
    '- 逐段解释为什么选择该镜头类型，优先从近景、中景、特写、口播、B-roll、转场插入中选最合适项',
    '',
    '## 字幕重点',
    '- 提取适合上字幕强化的关键词、重点词、重点句',
    '- 尽量按“重点词 / 强化句 / 强调方式”输出',
    '- 强调方式请说明哪些词适合放大、变色、单独蹦字、卡点出现或停顿后上屏',
    '',
    '## 节奏建议',
    '- 说明哪里适合快切、停顿、转场或情绪推进',
    '',
    '## 音乐/音效建议',
    '- 请尽量按“背景音乐情绪 / 背景音乐节奏 / 音效点建议”三段输出',
    '- 背景音乐情绪请说明开头、中段、结尾分别适合什么氛围',
    '- 背景音乐节奏请说明哪里适合铺垫、推进、收束或留停顿',
    '- 音效点建议请尽量按“触发位置｜建议音效｜作用”逐条输出，至少给 3 条，并尽量对应具体句子、转场或重点词',
    '',
    '## 执行备注',
    '- 给出拍摄或剪辑执行时需要注意的补充说明',
    '',
    '要求：内容必须具体、可执行，并且和脚本内容强相关，避免空泛套话。',
  ];
  return lines.join('\n');
};

export function ChatComposer({ mode }: { mode: ChatMode }) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showVideoPreset, setShowVideoPreset] = useState(false);
  const [videoPreset, setVideoPreset] = useState<VideoScriptPreset>(defaultVideoScriptPreset);
  const [videoTaskType, setVideoTaskType] = useState<'script' | 'viral-analysis' | 'editing-idea'>('script');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);
  const [douyinTrends, setDouyinTrends] = useState<DouyinTrendItem[]>([]);
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
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const getRelevantSamples = useSampleLibraryStore((state) => state.getRelevantSamples);
  const hasApiKey = Boolean(settings.apiKey?.trim());

  const activeSession = useMemo(() => sessions.find((s) => s.id === (activeSessionId ?? sessions[0]?.id)), [sessions, activeSessionId]);
  const isGenerating = !!activeSession?.id && generatingSessionIds.includes(activeSession.id);
  const isImageMode = mode === 'image' || mode === 'proImage';
  const isContentMode = mode === 'videoScript' || mode === 'copywriting';
  const viralStructureReference = activeSession?.viralStructureReference;
  const hasVideoPresetInput = useMemo(() => {
    const p = videoPreset;
    return Boolean(
      p.topic?.trim() ||
      p.businessType?.trim() ||
      p.productName?.trim() ||
      p.targetAudience?.trim() ||
      p.coreSellingPoints?.trim() ||
      p.toneStyle?.trim() ||
      p.platform?.trim() ||
      p.mustInclude?.trim() ||
      p.avoid?.trim() ||
      p.contentGoal?.trim() ||
      p.referenceSamples?.trim() ||
      p.trendKeywords?.trim() ||
      viralStructureReference?.content?.trim(),
    );
  }, [videoPreset, viralStructureReference]);
  const canSendVideoScriptFromPreset = isContentMode && videoTaskType === 'script' && hasVideoPresetInput;
  const latestAssistantMessage = [...(activeSession?.messages || [])].reverse().find((message) => message.role === 'assistant' && message.status !== 'error');
  const editingIdeaSource = (activeSession?.preferredCandidate?.content || latestAssistantMessage?.content || '').trim();
  const canSendEditingIdea = isContentMode && videoTaskType === 'editing-idea' && Boolean(editingIdeaSource || value.trim() || attachments.length > 0);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (activeSession?.mode !== 'videoScript' && activeSession?.mode !== 'copywriting') return;
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
        if (isContentMode && videoTaskType === 'viral-analysis' && isTranscriptTextFile(file)) {
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

  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const itemFiles = Array.from(event.clipboardData.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const fallbackFiles = Array.from(event.clipboardData.files || []).filter((file) => file.type.startsWith('image/'));
    const imageFiles = itemFiles.length > 0 ? itemFiles : fallbackFiles;

    if (imageFiles.length === 0) return;

    event.preventDefault();
    await parseFiles(imageFiles.map(normalizeClipboardImageFile));
    setInputHint(`已从剪贴板添加 ${imageFiles.length} 张图片，可继续输入说明后发送。`);
  };

  const generatePresetTopic = async () => {
    if (isGeneratingTopic) return;
    setIsGeneratingTopic(true);
    try {
      const prompt = [
        `请根据以下内容创作参数，生成 1 个适合直接放进“主题 / 选题”输入框的中文标题。输出类型：${outputTypeLabel(videoPreset.outputType)}`,
        '要求：',
        '1. 只返回标题本身，不要解释，不要序号，不要引号。',
        '2. 标题适合内容创作选题，不要太长，尽量控制在 12-28 个字。',
        `我是做什么的/业务类型：${videoPreset.businessType || '未填写'}`,
        `产品/服务：${videoPreset.productName || '未填写'}`,
        `目标人群：${videoPreset.targetAudience || '未填写'}`,
        `核心卖点：${videoPreset.coreSellingPoints || '未填写'}`,
        `语气风格：${videoPreset.toneStyle || '未填写'}`,
        `发布平台：${videoPreset.platform || '未填写'}`,
        `内容类型：${videoPreset.contentType || '口播'}`,
        `时长（秒）：${videoPreset.durationSec || 60}`,
        `内容目标：${videoPreset.contentGoal || '未填写'}`,
        `抖音热搜/趋势关键词：${videoPreset.trendKeywords || '无'}`,
        `必须包含：${videoPreset.mustInclude || '无'}`,
        `避免内容：${videoPreset.avoid || '无'}`,
      ].join('\n');

      const topic = await requestOpenAICompatible({
        settings,
        model: settings.defaultTextModel || settings.modelCatalog[0],
        messages: [
          { role: 'system', content: '你是内容选题助手。只输出一个可直接使用的中文标题。' },
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

  const fetchDouyinTrends = async () => {
    if (isFetchingTrends) return;
    setIsFetchingTrends(true);
    try {
      const response = await fetch('/api/trends/douyin', { method: 'GET', cache: 'no-store' });
      const data = (await response.json()) as { items?: DouyinTrendItem[]; error?: string; sourceLabel?: string };
      if (!response.ok) throw new Error(data.error || '拉取抖音热搜失败');
      const items = (data.items || []).slice(0, 12);
      setDouyinTrends(items);
      const sourceLabel = data.sourceLabel || '抖音热搜';
      setInputHint(items.length > 0 ? `已从${sourceLabel}拉取热搜，点击词条可加入趋势关键词。` : '暂时没有拉取到热搜词条。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '拉取抖音热搜失败';
      setInputHint(message);
    } finally {
      setIsFetchingTrends(false);
    }
  };

  const applyTrendKeyword = (title: string) => {
    setVideoPreset((prev) => {
      const existing = (prev.trendKeywords || '').split(/[、,\n]/).map((item) => item.trim()).filter(Boolean);
      if (existing.includes(title)) return prev;
      return { ...prev, trendKeywords: [...existing, title].slice(0, 8).join('、') };
    });
  };

  const onSend = async () => {
    if (!value.trim() && attachments.length === 0 && !canSendVideoScriptFromPreset && !canSendEditingIdea) return;

    let sid = activeSession?.id;
    if (!sid) sid = createSession(mode);

    const attachmentText = attachments
      .map((item) => (item.previewUrl ? `![${item.name}](${item.previewUrl})` : `[附件] ${item.name} (${Math.ceil(item.size / 1024)}KB)`))
      .join('\n');

    let contentToSend = value.trim();

    if (isContentMode && videoTaskType === 'viral-analysis') {
      contentToSend = [
        '【爆款文案分析任务】',
        '请分析下面这段爆款文案，并严格按以下结构输出，不要合并栏目，不要遗漏标题：',
        '## 钩子结构',
        '- 开头抓人的句子/动作是什么',
        '- 它为什么能把人留下来',
        '- 如果要复用，这类钩子属于哪种类型',
        '',
        '## 冲突设计',
        '- 文案里显性或隐性的矛盾点是什么',
        '- 它如何制造反差、痛点或认知张力',
        '',
        '## 观点推进',
        '- 文案是按什么顺序把观点一步步推进下去的',
        '- 请拆成 3~6 个推进节点',
        '',
        '## 结尾转化',
        '- 结尾是如何收口并推动行动的',
        '- 属于哪类转化方式（如成交、私信、关注、评论、留资）',
        '',
        '## 高频句式',
        '- 提取 3~6 条重复或高复用价值的句式骨架',
        '- 尽量总结成可套用模板，而不是只摘原句',
        '',
        '## 金句',
        '- 提取 3~5 句最有传播感、记忆点或转化感的句子',
        '',
        '## 情绪词与节奏词',
        '- 拆出文案中高频出现的情绪词、强调词、节奏词',
        '- 可按“情绪词 / 强调词 / 节奏词”分组',
        '',
        '## 可复用模板',
        '- 请输出 1~3 套可直接套用的文案结构模板',
        '- 每套模板建议包含：开头钩子 / 冲突展开 / 观点推进 / 结尾转化',
        '- 用占位符表达，如“【痛点】/【卖点】/【行动指令】”',
        '',
        '补充要求：结论尽量具体，优先提炼结构，不要泛泛而谈。',
        '',
        value.trim(),
      ].join('\n');
    } else if (isContentMode && videoTaskType === 'editing-idea') {
      const scriptContent = editingIdeaSource || value.trim();
      contentToSend = buildEditingIdeaPrompt(scriptContent, videoPreset, value.trim());
      if (!editingIdeaSource && value.trim()) {
        setInputHint('本次使用你手动输入的脚本文本生成剪辑思路。');
      }
    } else if (isContentMode && hasVideoPresetInput) {
      updateSession(sid, { videoScriptPreset: { ...videoPreset, viralStructureReference } });
      const recallQuery = [
        videoPreset.topic || '',
        videoPreset.businessType || '',
        videoPreset.productName || '',
        videoPreset.targetAudience || '',
        videoPreset.coreSellingPoints || '',
        videoPreset.referenceSamples || '',
        videoPreset.trendKeywords || '',
        viralStructureReference?.content || '',
        contentToSend,
      ].filter(Boolean).join('\n');
      const recalledSamples = (await getRelevantSamples(recallQuery, settings.sampleRecallTopK)).map((item) => ({
        title: item.title,
        content: item.textContent.slice(0, 1500),
      }));
      contentToSend = buildVideoScriptPromptWithPreset({ ...videoPreset, viralStructureReference }, contentToSend, recalledSamples);
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
    <div className="relative overflow-hidden border-t border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.96),hsl(var(--surface)/0.99))] px-3 py-3 shadow-[0_-16px_40px_-28px_rgba(15,23,42,0.42)] backdrop-blur md:px-4">
      {!hasApiKey && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <span className="inline-flex min-w-0 items-center gap-2 font-medium">
            <Sparkles size={13} className="shrink-0 text-amber-500" />
            <span className="truncate">未配置 API Key</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 border-amber-400/30 bg-amber-50/80 px-2.5 text-xs text-amber-950 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-50 dark:hover:bg-amber-500/15"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={13} />
            设置
          </Button>
        </div>
      )}

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

      {isContentMode && (
        <div className="mb-2 space-y-2">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-background/70 p-1 shadow-sm">
              <button
                type="button"
                data-state={videoTaskType === 'script' ? 'active' : 'inactive'}
                className="ui-segmented-trigger min-w-[92px]"
                onClick={() => setVideoTaskType('script')}
              >
                内容生成
              </button>
              <button
                type="button"
                data-state={videoTaskType === 'viral-analysis' ? 'active' : 'inactive'}
                className="ui-segmented-trigger min-w-[92px]"
                onClick={() => setVideoTaskType('viral-analysis')}
              >
                爆款拆解
              </button>
              <button
                type="button"
                data-state={videoTaskType === 'editing-idea' ? 'active' : 'inactive'}
                className="ui-segmented-trigger min-w-[92px]"
                onClick={() => setVideoTaskType('editing-idea')}
              >
                剪辑思路
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
                <span className="font-medium">内容创作参数</span>
                <button className="ui-inline-action h-7 px-2.5" onClick={() => setShowVideoPreset((prev) => !prev)}>
                  {showVideoPreset ? '收起' : '展开'}
                </button>
              </div>
              {viralStructureReference && (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-foreground">已套用爆款结构：</span>
                      {viralStructureReference.label}
                    </div>
                    {!videoPreset.topic?.trim() && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-[11px]"
                        onClick={generatePresetTopic}
                        disabled={isGeneratingTopic}
                      >
                        <Sparkles size={12} className={isGeneratingTopic ? 'animate-pulse' : ''} />
                        自动生成选题
                      </Button>
                    )}
                  </div>
                  {!videoPreset.topic?.trim() && <p className="mt-1">可直接点右侧按钮，根据这份结构先生成一个新的选题。</p>}
                </div>
              )}
              {showVideoPreset && (
                <div className="mt-3 grid max-h-[42vh] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">输出类型</span>
                    <select
                      className="h-10 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={videoPreset.outputType || 'script'}
                      onChange={(e) => setVideoPreset((prev) => ({ ...prev, outputType: e.target.value as VideoScriptPreset['outputType'] }))}
                    >
                      <option value="script">视频脚本</option>
                      <option value="copy">营销文案</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-muted-foreground">我是做什么的</span>
                    <Input value={videoPreset.businessType || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, businessType: e.target.value }))} placeholder="例如：工业仓储设备厂家" />
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-muted-foreground">主题 / 选题</span>
                    <div className="flex gap-2">
                      <Input value={videoPreset.topic || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, topic: e.target.value }))} placeholder="例如：为什么越来越多工厂改用金属卡板？" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
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
                    <span className="text-muted-foreground">内容目标</span>
                    <Input value={videoPreset.contentGoal || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, contentGoal: e.target.value }))} placeholder="例如：引导私信、提升完播、种草转化" />
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
                    <span className="text-muted-foreground">抖音热搜 / 趋势关键词</span>
                    <div className="flex gap-2">
                      <Input value={videoPreset.trendKeywords || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, trendKeywords: e.target.value }))} placeholder="可手动填写，或点击右侧拉取热搜后选择" />
                      <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={fetchDouyinTrends} disabled={isFetchingTrends}>
                        <Sparkles size={13} className={isFetchingTrends ? 'animate-pulse' : ''} />
                        热搜
                      </Button>
                    </div>
                    {douyinTrends.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {douyinTrends.map((trend) => (
                          <button
                            key={`${trend.title}-${trend.hot || ''}`}
                            type="button"
                            className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            title={trend.desc || trend.hot || trend.title}
                            onClick={() => applyTrendKeyword(trend.title)}
                          >
                            {trend.title}
                            {trend.hot ? <span className="ml-1 opacity-70">{trend.hot}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-muted-foreground">必须包含</span>
                    <Input value={videoPreset.mustInclude || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, mustInclude: e.target.value }))} placeholder="例如：运镜、成本对比、行动号召" />
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-muted-foreground">参考样本</span>
                    <Textarea value={videoPreset.referenceSamples || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, referenceSamples: e.target.value }))} rows={3} className="min-h-24 resize-y" placeholder="粘贴你喜欢的文案、脚本、竞品样本或历史高转化内容，系统会学习结构和语气，不会照抄。" />
                  </label>
                  <label className="grid gap-1 md:col-span-2">
                    <span className="text-muted-foreground">避免内容</span>
                    <Input value={videoPreset.avoid || ''} onChange={(e) => setVideoPreset((prev) => ({ ...prev, avoid: e.target.value }))} placeholder="例如：绝对化承诺、虚构参数" />
                  </label>
                </div>
              )}
            </div>
          )}


          {videoTaskType === 'editing-idea' && (
            <div className="rounded-xl border bg-background/70 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">剪辑思路输入</span>
                <span className="text-muted-foreground">自动复用当前脚本结果</span>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-muted-foreground">
                {editingIdeaSource ? (
                  <>
                    <p><span className="font-medium text-foreground">已自动带入当前脚本结果，</span>可直接生成剪辑思路。</p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap">{editingIdeaSource}</p>
                  </>
                ) : (
                  <p>当前会话还没有可复用的脚本结果，你也可以直接在下方输入框粘贴脚本文本后生成。</p>
                )}
              </div>
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
            <div key={item.id} className="inline-flex max-w-full items-center gap-2 rounded-xl border bg-background/65 px-2 py-1">
              {item.previewUrl ? (
                <span
                  role="img"
                  aria-label={item.name}
                  className="h-8 w-8 shrink-0 rounded-lg border bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.previewUrl})` }}
                />
              ) : (
                <Paperclip size={12} />
              )}
              <span className="max-w-[180px] truncate">{item.name}</span>
              <button className="ui-icon-button h-6 w-6 rounded-full border-transparent bg-transparent" onClick={() => setAttachments((prev) => prev.filter((entry) => entry.id !== item.id))} aria-label="删除附件">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`chat-panel flex gap-2 p-1.5 ${isImageMode ? 'items-center' : 'items-end'}`}>
        {mode === 'training' && (
          <div className="flex-1 rounded-xl border border-dashed border-primary/30 bg-gradient-to-r from-sky-500/10 to-cyan-500/10 px-3 py-4 text-sm text-muted-foreground">
            训练模式请在上方点击大卡片选项作答，系统会自动连续出题并更新分数。
          </div>
        )}
        <Button variant="ghost" size="icon" disabled={mode === 'training'} onClick={() => fileRef.current?.click()}>
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
          className={`${isImageMode ? 'min-h-10' : 'min-h-[54px]'} max-h-[220px] resize-none overflow-y-auto rounded-xl border-0 bg-transparent py-2.5 shadow-none focus-visible:ring-0`}
          placeholder={isContentMode && videoTaskType === 'viral-analysis' ? '直接粘贴爆款文案，或导入 txt/md/srt/vtt/json 转录文本后回车发送分析' : isContentMode && videoTaskType === 'editing-idea' ? '可补充剪辑重点；若当前没有脚本结果，也可直接粘贴脚本文本后生成剪辑思路' : mode === 'image' || mode === 'proImage' ? '描述你想生成的图片内容，发送后会把图片工作流记录保留在本页。' : '支持 Markdown。Enter 发送，Shift + Enter 换行'}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
            if (!value.trim() && !attachments.length && !canSendVideoScriptFromPreset && !canSendEditingIdea) return;
            e.preventDefault();
            onSend();
          }}
        />}

        {activeSession?.id && mode !== 'training' && (
          <Button
            variant="ghost"
            size="icon"
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
          <Button variant="ghost" size="icon" onClick={() => stopMessage(activeSession.id)}>
            <Square size={16} />
          </Button>
        ) : (
          <Button size="icon" disabled={mode === 'training' || (!value.trim() && attachments.length === 0 && !canSendVideoScriptFromPreset && !canSendEditingIdea)} onClick={onSend}>
            <SendHorizontal size={16} />
          </Button>
        )}

        <Button variant="ghost" size="icon" onClick={() => setShowOptions((prev) => !prev)}>
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
        <span>{inputHint || (mode === 'image' || mode === 'proImage' ? '图片模式会在上方工作区中保留最近的提示词与结果轨迹，也支持直接粘贴图片。' : '支持文件内容随消息发送，可直接从剪贴板粘贴图片。')}</span>
      </div>
    </div>
  );
}
