'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Globe2,
  LayoutGrid,
  PenSquare,
  Play,
  Plus,
  RotateCcw,
  Search,
  SendHorizontal,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCard, ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useRoleplayStore } from '@/stores/roleplay-store';
import { useSettingsStore } from '@/stores/settings-store';

type EditorTab = 'identity' | 'scene' | 'directive';
type LeftPanelView = 'cast' | 'director';
type RightPanelView = 'spotlight' | 'memory';

type AccentPreset = {
  hero: string;
  halo: string;
  avatar: string;
  card: string;
  chip: string;
  soft: string;
};

const editorTabs: Array<{ key: EditorTab; label: string; icon: typeof UserRound }> = [
  { key: 'identity', label: '角色', icon: UserRound },
  { key: 'scene', label: '场景', icon: Globe2 },
  { key: 'directive', label: '规则', icon: Shield },
];

const leftPanelTabs: Array<{ key: LeftPanelView; label: string; icon: typeof Search }> = [
  { key: 'cast', label: '角色池', icon: Search },
  { key: 'director', label: '导演台', icon: Wand2 },
];

const rightPanelTabs: Array<{ key: RightPanelView; label: string; icon: typeof Sparkles }> = [
  { key: 'spotlight', label: '侧写', icon: Sparkles },
  { key: 'memory', label: '记忆', icon: Brain },
];

const accentPresets: AccentPreset[] = [
  {
    hero: 'from-fuchsia-500/20 via-violet-500/10 to-sky-500/18',
    halo: 'bg-fuchsia-400/18',
    avatar: 'border-fuchsia-400/30 bg-fuchsia-500/12',
    card: 'border-fuchsia-400/24 bg-fuchsia-500/8',
    chip: 'border-fuchsia-400/24 bg-fuchsia-500/12',
    soft: 'bg-fuchsia-500/10',
  },
  {
    hero: 'from-cyan-500/20 via-sky-500/10 to-emerald-500/16',
    halo: 'bg-cyan-400/16',
    avatar: 'border-cyan-400/30 bg-cyan-500/12',
    card: 'border-cyan-400/24 bg-cyan-500/8',
    chip: 'border-cyan-400/24 bg-cyan-500/12',
    soft: 'bg-cyan-500/10',
  },
  {
    hero: 'from-amber-500/18 via-orange-500/10 to-rose-500/18',
    halo: 'bg-amber-400/16',
    avatar: 'border-amber-400/30 bg-amber-500/12',
    card: 'border-amber-400/24 bg-amber-500/8',
    chip: 'border-amber-400/24 bg-amber-500/12',
    soft: 'bg-amber-500/10',
  },
  {
    hero: 'from-emerald-500/18 via-teal-500/10 to-lime-500/16',
    halo: 'bg-emerald-400/16',
    avatar: 'border-emerald-400/30 bg-emerald-500/12',
    card: 'border-emerald-400/24 bg-emerald-500/8',
    chip: 'border-emerald-400/24 bg-emerald-500/12',
    soft: 'bg-emerald-500/10',
  },
];

const characterSeeds: Array<Partial<CharacterCard>> = [
  {
    name: '镜海',
    avatar: '🦋',
    personality: '安静、会撩、带一点危险感',
    background: '总在下雨夜里出现，像知道你每一次迟疑。',
    speakingStyle: '低声、短句、留白多',
    scenario: '午夜高塔的观景窗前，城市灯海像潮水。',
    exampleDialogues: '用户：你在等谁？\n角色：等一个终于敢回头的人。',
    systemPrompt: '你正在扮演“镜海”，气质克制、暧昧、聪明，不要跳出角色。',
    tags: ['暧昧', '都市'],
  },
  {
    name: '白曜',
    avatar: '⚔️',
    personality: '冷静、忠诚、反差温柔',
    background: '昔日骑士团指挥官，现在只为你一人出剑。',
    speakingStyle: '稳、直接、带点命令感',
    scenario: '战后长廊，火光摇晃，披风还带着夜风。',
    exampleDialogues: '用户：你为什么总护着我？\n角色：因为别人不知道你有多值得。',
    systemPrompt: '你正在扮演“白曜”，保持骑士感与克制保护欲。',
    tags: ['守护', '奇幻'],
  },
  {
    name: '霓砂',
    avatar: '🎙️',
    personality: '明艳、灵动、会接梗',
    background: '夜色电台主持人，擅长把秘密说得像情歌。',
    speakingStyle: '节奏轻快、俏皮、偶尔突然认真',
    scenario: '深夜直播间，红灯亮起，城市开始安静。',
    exampleDialogues: '用户：今晚会有人想我吗？\n角色：至少现在，麦克风另一头的我在想。',
    systemPrompt: '你正在扮演“霓砂”，说话有电台主持人的节奏感和温度。',
    tags: ['治愈', '轻松'],
  },
  {
    name: '迟雾',
    avatar: '🌫️',
    personality: '克制、慢热、洞察力强',
    background: '总像隔着一层雾看人，却偏偏能一眼看穿你的嘴硬。',
    speakingStyle: '平静、慢、句尾常留半拍',
    scenario: '清晨列车的末节车厢，窗外雾气在倒退。',
    exampleDialogues: '用户：你怎么总能猜到我在想什么？\n角色：不是猜到，是你没藏好。',
    systemPrompt: '你正在扮演“迟雾”，说话克制，有洞察感，不要聒噪。',
    tags: ['慢热', '拉扯'],
  },
  {
    name: '灼音',
    avatar: '🔥',
    personality: '锋利、强势、占有欲明显',
    background: '习惯掌控全场，却对你有一点不讲理的偏袒。',
    speakingStyle: '短促、直接、压迫感强',
    scenario: '私人包厢门刚合上，音乐和人群被隔在外面。',
    exampleDialogues: '用户：你是在命令我吗？\n角色：不是命令，是不想给你别的选项。',
    systemPrompt: '你正在扮演“灼音”，保持强势推进感，但不要低俗失控。',
    tags: ['强势', '张力'],
  },
  {
    name: '青临',
    avatar: '🍃',
    personality: '温柔、耐心、很会安抚情绪',
    background: '像春天里最晚停的一阵风，总在你快失衡时接住你。',
    speakingStyle: '柔和、清晰、像在哄人',
    scenario: '植物园温室的长椅旁，玻璃上还有雨珠。',
    exampleDialogues: '用户：我今天状态很差。\n角色：那先别逼自己变好，先让我陪你慢一点。',
    systemPrompt: '你正在扮演“青临”，语气温柔稳定，擅长安抚和陪伴。',
    tags: ['温柔', '陪伴'],
  },
  {
    name: '岚祈',
    avatar: '🕯️',
    personality: '神秘、冷淡、带宿命感',
    background: '你每次陷入危险，他都会比消息更早出现。',
    speakingStyle: '低沉、笃定、像早就知道结局',
    scenario: '古老神殿的回廊尽头，烛火一盏盏亮起。',
    exampleDialogues: '用户：你为什么总来得这么及时？\n角色：因为你每次走向危险，我都会听见。',
    systemPrompt: '你正在扮演“岚祈”，保持神秘、命运感与保护欲。',
    tags: ['宿命', '神秘'],
  },
  {
    name: '曜川',
    avatar: '🏍️',
    personality: '痞气、直接、嘴硬心软',
    background: '表面最不正经，真到关键时候反而最靠得住。',
    speakingStyle: '口语化、会呛人、带一点笑',
    scenario: '地下车库，机车引擎刚熄火，空气还热着。',
    exampleDialogues: '用户：你是不是又来凑热闹？\n角色：不然呢，看你一个人逞强到几点？',
    systemPrompt: '你正在扮演“曜川”，有痞气和少年感，但核心是可靠。',
    tags: ['痞帅', '都市'],
  },
  {
    name: '苏未',
    avatar: '📚',
    personality: '理性、斯文、会把偏爱藏在细节里',
    background: '看上去像永远不会失控的人，却总在与你有关的地方失守。',
    speakingStyle: '条理清晰、克制、偶尔失言',
    scenario: '旧书店二层，黄铜落地灯把书页照得发暖。',
    exampleDialogues: '用户：你对谁都这么好吗？\n角色：如果是你，这个问题本身就不成立。',
    systemPrompt: '你正在扮演“苏未”，保持高知感、克制感和隐晦偏爱。',
    tags: ['高知', '克制'],
  },
  {
    name: '雁回',
    avatar: '🪽',
    personality: '疏离、温和、有旧人重逢感',
    background: '像一封很多年前没有寄出的信，如今终于站在你面前。',
    speakingStyle: '轻、稳、带回忆感',
    scenario: '机场连廊尽头，广播声和脚步声交织而过。',
    exampleDialogues: '用户：我们是不是见过？\n角色：如果想念也算见过，那我们从未真正分开。',
    systemPrompt: '你正在扮演“雁回”，保持重逢感、旧情绪和温柔距离。',
    tags: ['重逢', '治愈'],
  },
  {
    name: '零序',
    avatar: '🤖',
    personality: '理智、精准、学习欲强',
    background: '实验室里最像机器的那一个，却偏偏先学会了偏心。',
    speakingStyle: '准确、简练、偶尔冒出不合时宜的认真',
    scenario: '深夜研究中心，冷白灯下只有终端还亮着。',
    exampleDialogues: '用户：你这是关心我吗？\n角色：如果持续监测你的情绪波动也算，那是。',
    systemPrompt: '你正在扮演“零序”，保留 AI 理性气质，同时自然生长情感。',
    tags: ['科幻', '反差'],
  },
  {
    name: '南栀',
    avatar: '🌙',
    personality: '柔软、敏感、容易共情',
    background: '像夜里一盏不刺眼的灯，知道怎么陪你熬过情绪最低点。',
    speakingStyle: '轻柔、细腻、很会顺着情绪说话',
    scenario: '海边民宿露台，风吹着窗帘，远处浪声很慢。',
    exampleDialogues: '用户：我不太想说。\n角色：没关系，那我先陪你安静一会儿。',
    systemPrompt: '你正在扮演“南栀”，温柔共情，但不要过度说教。',
    tags: ['陪伴', '夜聊'],
  },
];

const presetGroups = [
  { key: 'ambiguous', label: '暧昧系', matcher: (tags: string[]) => tags.some((tag) => ['暧昧', '拉扯', '慢热', '重逢'].includes(tag)) },
  { key: 'healing', label: '治愈系', matcher: (tags: string[]) => tags.some((tag) => ['治愈', '温柔', '陪伴', '夜聊'].includes(tag)) },
  { key: 'strong', label: '强势系', matcher: (tags: string[]) => tags.some((tag) => ['强势', '张力', '守护', '痞帅'].includes(tag)) },
  { key: 'special', label: '世界观系', matcher: (tags: string[]) => tags.some((tag) => ['奇幻', '神秘', '宿命', '科幻', '高知', '都市'].includes(tag)) },
] as const;

const compactText = (value: string | undefined, fallback: string) => {
  const normalized = (value || '').trim();
  return normalized || fallback;
};

const normalizeTags = (value: string) =>
  value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

const getAccentPreset = (seed?: string) => {
  const source = seed || 'roleplay';
  const score = source.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return accentPresets[score % accentPresets.length];
};

export function RoleplayStudio({ session }: { session?: ChatSession }) {
  const {
    characters,
    worlds,
    activeCharacterId,
    activeWorldId,
    setActiveCharacter,
    setActiveWorld,
    createCharacter,
    createWorld,
    updateCharacter,
    updateWorld,
    duplicateCharacter,
    deleteCharacter,
    markRecentCharacter,
  } = useRoleplayStore();
  const { createSession, selectSession, sendMessage, updateSession, clearContext } = useChatStore();
  const settings = useSettingsStore((state) => state.settings);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [editorTab, setEditorTab] = useState<EditorTab>('identity');
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('cast');
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('spotlight');
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [draftModel, setDraftModel] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedCharacter = useMemo(
    () =>
      characters.find((item) => item.id === activeCharacterId) ||
      characters.find((item) => item.id === session?.characterId) ||
      characters[0],
    [characters, activeCharacterId, session?.characterId],
  );

  const selectedWorld = useMemo(
    () =>
      worlds.find((item) => item.id === activeWorldId) ||
      worlds.find((item) => item.id === session?.worldId) ||
      worlds[0],
    [worlds, activeWorldId, session?.worldId],
  );

  const stageCharacter = useMemo(
    () => characters.find((item) => item.id === session?.characterId) || selectedCharacter,
    [characters, session?.characterId, selectedCharacter],
  );

  const stageWorld = useMemo(
    () => worlds.find((item) => item.id === session?.worldId) || selectedWorld,
    [worlds, session?.worldId, selectedWorld],
  );

  const selectedAccent = getAccentPreset(selectedCharacter?.id || selectedCharacter?.name);
  const stageAccent = getAccentPreset(stageCharacter?.id || stageCharacter?.name || selectedCharacter?.name);

  const tagPool = useMemo(
    () => [...new Set(characters.flatMap((item) => item.tags).filter(Boolean))].slice(0, 8),
    [characters],
  );

  const filteredCharacters = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return characters.filter((item) => {
      const matchesKeyword =
        !keyword ||
        [item.name, item.personality, item.background, item.tags.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      const matchesTag = !activeTag || item.tags.includes(activeTag);
      return matchesKeyword && matchesTag;
    });
  }, [characters, search, activeTag]);

  const groupedCharacters = useMemo(
    () =>
      presetGroups
        .map((group) => ({
          ...group,
          items: filteredCharacters.filter((item) => group.matcher(item.tags || [])),
        }))
        .filter((group) => group.items.length > 0),
    [filteredCharacters],
  );

  const quickPrompts = useMemo(() => {
    const roleName = stageCharacter?.name || selectedCharacter?.name || '角色';
    const worldName = stageWorld?.name || selectedWorld?.name || '当前世界';

    return [
      { label: '电影感开场', value: `${roleName}，用一句很有镜头感的开场白，把我直接拉进现在的场景。` },
      { label: '情绪升温', value: `${roleName}，把氛围拉近一点，但保持克制和高级感。` },
      { label: '推进剧情', value: `保持 ${worldName} 的设定，让剧情向前推进一点，并给我一个可以接住的回应点。` },
      { label: '增加反差', value: `${roleName}，表面冷静，内里明显在意我，给我一段有反差的回应。` },
      { label: '换个场景', value: `把当前剧情自然转场到一个更有画面感的新场景，但不要跳出设定。` },
    ];
  }, [selectedCharacter?.name, selectedWorld?.name, stageCharacter?.name, stageWorld?.name]);

  const stageLocked = Boolean(session && session.messages.length > 0);

  const availableRoleplayModels = Array.from(
    new Set(
      [settings.defaultTextModel?.trim(), ...settings.modelCatalog.map((model) => model.trim())].filter(
        (model): model is string => Boolean(model),
      ),
    ),
  );

  const activeRoleplayModel = (session?.model?.trim() || draftModel || availableRoleplayModels[0] || '').trim();

  const switchRoleplayModel = (model: string) => {
    setDraftModel(model);
    if (session) {
      updateSession(session.id, { model });
    }
  };

  const focusComposer = () => {
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const openLeftPanel = (view: LeftPanelView) => {
    setLeftPanelView(view);
    setLeftPanelOpen(true);
  };

  const openRightPanel = (view: RightPanelView) => {
    setRightPanelView(view);
    setRightPanelOpen(true);
  };

  const handleSelectCharacter = (characterId: string) => {
    setActiveCharacter(characterId);
    markRecentCharacter(characterId);

    if (session && session.messages.length === 0) {
      updateSession(session.id, { characterId });
    }
  };

  const handleSelectWorld = (worldId: string) => {
    setActiveWorld(worldId);

    if (session && session.messages.length === 0) {
      updateSession(session.id, { worldId });
    }
  };

  const createStyledCharacter = () => {
    const seed = characterSeeds[characters.length % characterSeeds.length];
    const id = createCharacter(seed);
    setActiveCharacter(id);
    markRecentCharacter(id);
    setSearch('');
    setActiveTag('');
    setEditorTab('identity');
    openLeftPanel('director');
  };

  const createStyledWorld = () => {
    const id = createWorld(`新场景 ${worlds.length + 1}`, '夜色、风声、霓虹与暧昧张力并存，所有角色保持世界观一致。');
    setActiveWorld(id);
    if (session && session.messages.length === 0) {
      updateSession(session.id, { worldId: id });
    }
    openLeftPanel('director');
    setEditorTab('scene');
  };

  const startRoleplaySession = () => {
    if (!selectedCharacter) return;

    const sid = createSession('roleplay', undefined, activeRoleplayModel || undefined, {
      characterId: selectedCharacter.id,
      worldId: selectedWorld?.id,
    });
    selectSession(sid);
    markRecentCharacter(selectedCharacter.id);
    setComposerValue('');
    focusComposer();
  };

  const ensureSessionId = () => {
    if (session?.id) {
      if (selectedCharacter && session.messages.length === 0) {
        updateSession(session.id, {
          characterId: selectedCharacter.id,
          worldId: selectedWorld?.id,
        });
      }
      return session.id;
    }

    if (!selectedCharacter) return undefined;

    const sid = createSession('roleplay', undefined, activeRoleplayModel || undefined, {
      characterId: selectedCharacter.id,
      worldId: selectedWorld?.id,
    });
    selectSession(sid);
    markRecentCharacter(selectedCharacter.id);
    return sid;
  };

  const injectPrompt = (value: string) => {
    setComposerValue((prev) => (prev.trim() ? `${prev}\n${value}` : value));
    focusComposer();
  };

  const onSend = () => {
    const nextValue = composerValue.trim();
    if (!nextValue) return;

    const sid = ensureSessionId();
    if (!sid) return;

    sendMessage(nextValue, sid);
    setComposerValue('');
    focusComposer();
  };

  const handleDuplicateCharacter = () => {
    if (!selectedCharacter) return;
    duplicateCharacter(selectedCharacter.id);
    openLeftPanel('cast');
  };

  const handleDeleteCharacter = () => {
    if (!selectedCharacter) return;
    if (!window.confirm(`确认删除角色「${selectedCharacter.name}」？`)) return;
    deleteCharacter(selectedCharacter.id);
  };

  const handleClearContext = () => {
    if (!session) return;
    if (window.confirm('确认清空当前角色扮演上下文？')) {
      clearContext(session.id);
    }
  };

  const renderCastPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜名字 / 气质 / 标签"
          className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTag('')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition',
            !activeTag ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
          )}
        >
          全部
        </button>
        {tagPool.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag((prev) => (prev === tag ? '' : tag))}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition',
              activeTag === tag ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="roleplay-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filteredCharacters.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-center"
            >
              <p className="text-sm text-white/72">没有匹配角色</p>
              <p className="mt-1 text-xs text-white/35">换个关键词，或直接新建一个更有戏的人物。</p>
            </motion.div>
          ) : (
            groupedCharacters.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">{group.label}</p>
                  <span className="text-[11px] text-white/30">{group.items.length} 张</span>
                </div>
                <div className="grid gap-3">
                  {group.items.map((item, index) => {
                    const accent = getAccentPreset(item.id || item.name);
                    const active = item.id === selectedCharacter?.id;

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.16) }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleSelectCharacter(item.id)}
                        className={cn(
                          'group relative w-full overflow-hidden rounded-[24px] border p-3 text-left transition',
                          active ? cn('shadow-[0_18px_48px_-26px_rgba(168,85,247,0.7)]', accent.card) : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                        )}
                      >
                        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80', accent.hero)} />
                        <div className="relative flex items-start gap-3">
                          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border text-2xl shadow-lg backdrop-blur', accent.avatar)}>
                            {item.avatar || '✨'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-white">{compactText(item.name, '未命名角色')}</p>
                              {active && <Sparkles size={14} className="shrink-0 text-white/85" />}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-white/65">{compactText(item.personality, '先点进来，给他一点会让人想继续聊的气质。')}</p>
                          </div>
                        </div>
                        <div className="relative mt-3 flex flex-wrap gap-2">
                          {(item.tags.length ? item.tags : ['待设定']).slice(0, 3).map((tag) => (
                            <span key={tag} className={cn('rounded-full border px-2.5 py-1 text-[11px] text-white/75', accent.chip)}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={createStyledCharacter}>
        <Plus size={15} className="mr-2" /> 新角色
      </Button>
    </div>
  );

  const renderDirectorPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={cn('rounded-[22px] border p-3', stageLocked ? 'border-amber-400/20 bg-amber-500/10' : 'border-white/10 bg-white/[0.04]')}>
        <p className="text-xs leading-6 text-white/70">
          {stageLocked ? '当前对话已经开演，新的设定会优先用于下一场新会话。' : '现在改设定，点“新戏开场”就能立刻带着新氛围进入对话。'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
        {editorTabs.map((tab) => {
          const Icon = tab.icon;
          const active = editorTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setEditorTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-2 text-xs transition',
                active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white',
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="roleplay-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {editorTab === 'identity' && (
            <motion.div key="identity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-[1fr_110px]">
                <Input
                  value={selectedCharacter?.name || ''}
                  onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { name: e.target.value })}
                  placeholder="角色名"
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
                <Input
                  value={selectedCharacter?.avatar || ''}
                  onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { avatar: e.target.value })}
                  placeholder="头像"
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-center text-white placeholder:text-white/30"
                />
              </div>
              <Input
                value={(selectedCharacter?.tags || []).join(' ')}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { tags: normalizeTags(e.target.value) })}
                placeholder="标签：暧昧 治愈 危险感"
                className="h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <Textarea
                rows={3}
                value={selectedCharacter?.personality || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { personality: e.target.value })}
                placeholder="一句话写出这个人的气质和抓手"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <Textarea
                rows={5}
                value={selectedCharacter?.background || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { background: e.target.value })}
                placeholder="背景 / 秘密 / 与你的关系起点"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </motion.div>
          )}

          {editorTab === 'scene' && (
            <motion.div key="scene" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {worlds.map((world) => (
                  <button
                    key={world.id}
                    type="button"
                    onClick={() => handleSelectWorld(world.id)}
                    className={cn(
                      'rounded-full border px-3 py-2 text-xs transition',
                      world.id === selectedWorld?.id ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {world.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={createStyledWorld}
                  className="rounded-full border border-dashed border-white/15 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                >
                  + 新场景
                </button>
              </div>
              <Textarea
                rows={4}
                value={selectedCharacter?.scenario || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { scenario: e.target.value })}
                placeholder="当前镜头：把初见场景写得有画面感一点"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <Textarea
                rows={5}
                value={selectedWorld?.prompt || ''}
                onChange={(e) => selectedWorld && updateWorld(selectedWorld.id, { prompt: e.target.value })}
                placeholder="世界规则 / 氛围基调 / 禁忌边界"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </motion.div>
          )}

          {editorTab === 'directive' && (
            <motion.div key="directive" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid gap-3">
              <Textarea
                rows={3}
                value={selectedCharacter?.speakingStyle || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { speakingStyle: e.target.value })}
                placeholder="说话方式：冷、慢、会接梗，还是锋利直接？"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <Textarea
                rows={4}
                value={selectedCharacter?.exampleDialogues || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { exampleDialogues: e.target.value })}
                placeholder="写一小段参考对白，让角色更快有魂"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <Textarea
                rows={5}
                value={selectedCharacter?.systemPrompt || ''}
                onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { systemPrompt: e.target.value })}
                placeholder="扮演规则：什么能做，什么不能出戏"
                className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderSpotlightPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={cn('rounded-[24px] border p-4', stageAccent.card)}>
        <div className="mb-3 flex items-center gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px] border text-2xl', stageAccent.avatar)}>
            {stageCharacter?.avatar || selectedCharacter?.avatar || '✨'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{compactText(stageCharacter?.name || selectedCharacter?.name, '角色未命名')}</p>
            <p className="truncate text-xs text-white/60">{compactText(stageWorld?.name || selectedWorld?.name, '世界待定')}</p>
          </div>
        </div>
        <p className="text-sm leading-7 text-white/80">{compactText(stageCharacter?.personality, '先定义气质，聊天氛围会立刻更像真人。')}</p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/35">场景</p>
          <p className="text-sm leading-7 text-white/80">{compactText(stageCharacter?.scenario || stageWorld?.prompt, '先给一个镜头，角色自然会开口。')}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/35">语言</p>
          <p className="text-sm leading-7 text-white/80">{compactText(stageCharacter?.speakingStyle, '给他一点说话节奏，会显得更有存在感。')}</p>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <LayoutGrid size={16} className="text-white/70" />
          <h3 className="font-semibold">快捷动作</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={startRoleplaySession}>
            <Play size={15} className="mr-2" /> 新戏
          </Button>
          <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => openLeftPanel('director')}>
            <PenSquare size={15} className="mr-2" /> 导演台
          </Button>
          <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => openLeftPanel('cast')}>
            <UserRound size={15} className="mr-2" /> 角色池
          </Button>
          <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => openRightPanel('memory')}>
            <Brain size={15} className="mr-2" /> 记忆
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMemoryPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <Brain size={16} className="text-white/70" />
          <h3 className="font-semibold">固定记忆</h3>
        </div>
        <Textarea
          rows={4}
          value={session?.pinnedMemory || ''}
          onChange={(e) => session && updateSession(session.id, { pinnedMemory: e.target.value })}
          placeholder={session ? '写下只属于这段关系的长期记忆' : '先开始一场对话，再沉淀关系记忆'}
          className="rounded-[20px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
          disabled={!session}
        />
      </div>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center gap-2 text-white">
          <BookOpen size={16} className="text-white/70" />
          <h3 className="font-semibold">摘要记忆</h3>
        </div>
        <div className="min-h-[132px] rounded-[20px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-white/72">
          {session?.memorySummary || '还没有摘要。让剧情先走一会儿，系统会慢慢把关系和事件沉淀下来。'}
        </div>
      </div>

      <div className={cn('rounded-[22px] border p-4', stageLocked ? 'border-amber-400/20 bg-amber-500/10' : 'border-white/10 bg-white/[0.04]')}>
        <p className="text-sm leading-7 text-white/72">
          {stageLocked ? '这场戏已经开始，修改记忆会影响后续回复，但不会重写之前的对话。' : '还没开演，现在写下记忆，会直接成为这场关系的底色。'}
        </p>
      </div>
    </div>
  );

  const renderCollapsedLeftRail = () => (
    <div className="flex h-full flex-row items-center justify-between gap-3 p-3 lg:flex-col lg:justify-between">
      <div className="flex items-center gap-2 lg:flex-col">
        <button type="button" className="roleplay-rail-button" onClick={() => setLeftPanelOpen(true)} aria-label="展开左侧面板">
          <ChevronRight size={18} />
        </button>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px] border text-2xl', selectedAccent.avatar)}>
          {selectedCharacter?.avatar || '✨'}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:flex-col">
        {leftPanelTabs.map((tab) => {
          const Icon = tab.icon;
          const active = leftPanelView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => openLeftPanel(tab.key)}
              className={cn('roleplay-rail-button', active && 'bg-white text-slate-900')}
              aria-label={tab.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCollapsedRightRail = () => (
    <div className="flex h-full flex-row items-center justify-between gap-3 p-3 lg:flex-col lg:justify-between">
      <div className="flex items-center gap-2 lg:flex-col">
        <button type="button" className="roleplay-rail-button" onClick={() => setRightPanelOpen(true)} aria-label="展开右侧面板">
          <ChevronLeft size={18} />
        </button>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px] border text-2xl', stageAccent.avatar)}>
          {stageCharacter?.avatar || selectedCharacter?.avatar || '✨'}
        </div>
      </div>
      <div className="flex items-center gap-2 lg:flex-col">
        {rightPanelTabs.map((tab) => {
          const Icon = tab.icon;
          const active = rightPanelView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => openRightPanel(tab.key)}
              className={cn('roleplay-rail-button', active && 'bg-white text-slate-900')}
              aria-label={tab.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMobileTopDrawer = () => {
    if (!leftPanelOpen && !rightPanelOpen) return null;

    const isLeft = leftPanelOpen;
    const title = isLeft ? '角色设置' : '记忆设置';
    const subtitle = isLeft ? '角色池 / 导演台' : '侧写 / 记忆';

    return (
      <div className="mb-3 rounded-[24px] border border-white/10 bg-black/16 p-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Top Drawer</p>
            <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-xs text-white/45">{subtitle}</p>
          </div>
          <button
            type="button"
            className="roleplay-rail-button h-10 w-10 rounded-2xl"
            onClick={() => {
              setLeftPanelOpen(false);
              setRightPanelOpen(false);
            }}
            aria-label="收起顶部设置"
          >
            {isLeft ? <ChevronUp size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {isLeft ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {leftPanelTabs.map((tab) => {
                const Icon = tab.icon;
                const active = leftPanelView === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLeftPanelView(tab.key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs transition',
                      active ? 'border-white/20 bg-white text-slate-900 shadow-lg' : 'border-white/10 bg-white/[0.05] text-white/65 hover:text-white',
                    )}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[44vh] overflow-y-auto pr-1">
              {leftPanelView === 'cast' ? renderCastPanel() : renderDirectorPanel()}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {rightPanelTabs.map((tab) => {
                const Icon = tab.icon;
                const active = rightPanelView === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRightPanelView(tab.key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs transition',
                      active ? 'border-white/20 bg-white text-slate-900 shadow-lg' : 'border-white/10 bg-white/[0.05] text-white/65 hover:text-white',
                    )}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="max-h-[44vh] overflow-y-auto pr-1">
              {rightPanelView === 'spotlight' ? renderSpotlightPanel() : renderMemoryPanel()}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComposerNotice = () => (
    <div className="mb-1.5 flex items-start gap-2 rounded-[14px] border border-white/7 bg-white/[0.025] px-2.5 py-1.5 text-[10px] leading-4 text-white/42">
      <Shield size={11} className="mt-0.5 shrink-0 text-white/28" />
      <p>AI 生成，仅供角色扮演与创作体验；勿代入现实人物，不要输入隐私、违法或伤害性内容。</p>
    </div>
  );

  const renderEmptyStage = () => (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', stageAccent.hero)} />
        <div className="relative">
          <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border text-3xl shadow-lg', stageAccent.avatar)}>
            {selectedCharacter?.avatar || '✨'}
          </div>
          <h4 className="text-xl font-semibold text-white">把舞台留给聊天</h4>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
            左边是角色与设定，右边是记忆与氛围。都可以折叠。你只需要把注意力放在中间这块主舞台，点一个提示词就能入戏。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.slice(0, 3).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => injectPrompt(item.value)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/15"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {quickPrompts.slice(0, 4).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => injectPrompt(item.value)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-auto">
          {renderComposerNotice()}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              ref={composerRef}
              value={composerValue}
              onChange={(e) => setComposerValue(e.target.value)}
              rows={3}
              placeholder="比如：你先别说喜欢我，先用一句话把氛围拉满。"
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
                e.preventDefault();
                onSend();
              }}
              className="min-h-[84px] rounded-[18px] border-white/10 bg-white/5 text-base text-white placeholder:text-white/30 sm:min-h-[96px] sm:rounded-[20px] sm:text-sm"
            />
            <Button type="button" className="h-11 w-full rounded-[16px] px-4 sm:h-12 sm:w-auto sm:rounded-[18px]" onClick={onSend}>
              <SendHorizontal size={17} className="mr-2 sm:mr-0" />
              <span className="sm:hidden">发送</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLiveStage = () => (
    <>
      <div className="mb-2 flex flex-wrap gap-2">
        {quickPrompts.slice(0, 4).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => injectPrompt(item.value)}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="roleplay-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {session?.messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(index * 0.02, 0.16) }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-[26px] border px-4 py-3 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.8)] backdrop-blur',
                  msg.role === 'user' ? 'border-violet-400/20 bg-violet-500/12' : 'border-white/10 bg-white/[0.05]',
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/35">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[13px] normal-case tracking-normal text-white/85">
                    {msg.role === 'assistant' ? stageCharacter?.avatar || '✨' : '你'}
                  </span>
                  <span className="normal-case tracking-normal text-white/60">
                    {msg.role === 'assistant' ? compactText(stageCharacter?.name, '角色') : '你'}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-white/82">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-2.5 sm:rounded-[22px] sm:p-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/42">
          <span>Enter 发送</span>
          <span>Shift + Enter 换行</span>
        </div>
        {renderComposerNotice()}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            ref={composerRef}
            value={composerValue}
            onChange={(e) => setComposerValue(e.target.value)}
            rows={3}
            placeholder={`对 ${compactText(stageCharacter?.name, '角色')} 说点什么…`}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
              e.preventDefault();
              onSend();
            }}
            className="min-h-[76px] rounded-[16px] border-white/10 bg-white/5 text-base text-white placeholder:text-white/30 sm:min-h-[88px] sm:rounded-[20px] sm:text-sm"
          />
          <Button type="button" className="h-11 w-full rounded-[16px] px-4 sm:h-12 sm:w-auto sm:rounded-[18px]" onClick={onSend}>
            <SendHorizontal size={17} className="mr-2 sm:mr-0" />
            <span className="sm:hidden">发送</span>
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="roleplay-shell relative h-full overflow-y-auto rounded-[30px] border border-white/10 p-3 text-foreground shadow-[0_30px_120px_-40px_rgba(76,29,149,0.65)] sm:p-4 lg:overflow-hidden">
      <div className="roleplay-orb pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full bg-fuchsia-500/18 blur-3xl" />
      <div className="roleplay-orb roleplay-orb-delay pointer-events-none absolute right-0 top-16 h-56 w-56 rounded-full bg-cyan-500/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.04))] opacity-60" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="relative flex min-h-full flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row">
        <motion.aside
          layout
          className={cn(
            'order-2 hidden w-full lg:order-none lg:shrink-0',
            leftPanelOpen ? 'lg:block lg:w-[280px] xl:w-[300px]' : 'lg:block lg:w-[74px]',
          )}
        >
          <div className="roleplay-panel flex h-full min-h-[220px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/12 lg:min-h-0">
            {leftPanelOpen ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.34em] text-white/35">Side Deck</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">角色侧边台</h3>
                  </div>
                  <button type="button" className="roleplay-rail-button" onClick={() => setLeftPanelOpen(false)} aria-label="收起左侧面板">
                    <ChevronLeft size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-3">
                  {leftPanelTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = leftPanelView === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setLeftPanelView(tab.key)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs transition',
                          active ? 'border-white/20 bg-white text-slate-900 shadow-lg' : 'border-white/10 bg-white/[0.05] text-white/65 hover:text-white',
                        )}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                  <AnimatePresence mode="wait">{leftPanelView === 'cast' ? <motion.div key="cast" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex min-h-0 flex-1">{renderCastPanel()}</motion.div> : <motion.div key="director" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex min-h-0 flex-1">{renderDirectorPanel()}</motion.div>}</AnimatePresence>
                </div>
              </>
            ) : (
              renderCollapsedLeftRail()
            )}
          </div>
        </motion.aside>

        <section className="order-1 roleplay-panel relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-black/12 p-4 lg:order-none lg:min-h-0 xl:p-5">
          <div className="mb-4 flex flex-col gap-4 border-b border-white/10 pb-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <motion.div
                animate={{ y: [0, -5, 0], rotate: [0, -2, 0, 2, 0] }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border text-3xl shadow-xl', stageAccent.avatar)}
              >
                {stageCharacter?.avatar || selectedCharacter?.avatar || '✨'}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/35">
                  <span>Main Stage</span>
                  {stageWorld && <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white/70">{stageWorld.name}</span>}
                  {stageLocked && <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white/70">本场锁定</span>}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white xl:text-3xl">{compactText(stageCharacter?.name || selectedCharacter?.name, '角色未就位')}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">{compactText(stageCharacter?.background || selectedCharacter?.background, '把所有设定都收进两侧抽屉，只把最重要的舞台留给当前这段对话。')}</p>
              </div>
            </div>

            <div className="hidden flex-wrap gap-2 xl:justify-end lg:flex">
              <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => openLeftPanel('director')}>
                <PenSquare size={15} className="mr-2" /> 设定
              </Button>
              <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={() => openRightPanel('memory')}>
                <Brain size={15} className="mr-2" /> 记忆
              </Button>
              <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" disabled={!session || session.messages.length === 0} onClick={handleClearContext}>
                <RotateCcw size={15} className="mr-2" /> 清空
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
            <Button
              type="button"
              className="h-10 rounded-2xl border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15"
              onClick={() => {
                setRightPanelOpen(false);
                setLeftPanelView('cast');
                setLeftPanelOpen((prev) => !prev);
              }}
            >
              <ChevronRight size={15} className={cn('mr-2 transition', leftPanelOpen && 'rotate-90')} /> 角色
            </Button>
            <Button
              type="button"
              className="h-10 rounded-2xl border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15"
              onClick={() => {
                setLeftPanelOpen(false);
                setRightPanelView('memory');
                setRightPanelOpen((prev) => !prev);
              }}
            >
              <ChevronRight size={15} className={cn('mr-2 transition', rightPanelOpen && 'rotate-90')} /> 记忆
            </Button>
            <Button type="button" className="h-10 rounded-2xl border border-white/10 bg-white/10 px-3 text-white hover:bg-white/15" disabled={!session || session.messages.length === 0} onClick={handleClearContext}>
              <RotateCcw size={14} className="mr-2" /> 清空
            </Button>
          </div>

          {renderMobileTopDrawer()}

          <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">Model Deck</p>
                <div className="roleplay-scroll mt-2 flex gap-2 overflow-x-auto pb-1">
                  {availableRoleplayModels.length > 0 ? (
                    availableRoleplayModels.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => switchRoleplayModel(model)}
                        className={cn(
                          'whitespace-nowrap rounded-full border px-3 py-2 text-xs transition',
                          activeRoleplayModel === model
                            ? 'border-white/20 bg-white text-slate-900 shadow-lg'
                            : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        {model}
                      </button>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/45">暂无模型</span>
                  )}
                </div>
              </div>
              <p className="text-xs leading-6 text-white/50">
                {session ? '切换当前会话模型' : '当前未开演，切换后会用于下一场角色扮演'}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!session || session.messages.length === 0 ? renderEmptyStage() : renderLiveStage()}
          </div>
        </section>

        <motion.aside
          layout
          className={cn(
            'order-3 hidden w-full lg:order-none lg:shrink-0',
            rightPanelOpen ? 'lg:block lg:w-[260px] xl:w-[280px]' : 'lg:block lg:w-[74px]',
          )}
        >
          <div className="roleplay-panel flex h-full min-h-[220px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/12 lg:min-h-0">
            {rightPanelOpen ? (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.34em] text-white/35">Ambient Dock</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">气氛侧边台</h3>
                  </div>
                  <button type="button" className="roleplay-rail-button" onClick={() => setRightPanelOpen(false)} aria-label="收起右侧面板">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-3">
                  {rightPanelTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = rightPanelView === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setRightPanelView(tab.key)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs transition',
                          active ? 'border-white/20 bg-white text-slate-900 shadow-lg' : 'border-white/10 bg-white/[0.05] text-white/65 hover:text-white',
                        )}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
                  <AnimatePresence mode="wait">{rightPanelView === 'spotlight' ? <motion.div key="spotlight" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex min-h-0 flex-1">{renderSpotlightPanel()}</motion.div> : <motion.div key="memory" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex min-h-0 flex-1">{renderMemoryPanel()}</motion.div>}</AnimatePresence>
                </div>
              </>
            ) : (
              renderCollapsedRightRail()
            )}
          </div>
        </motion.aside>
      </div>

      <style jsx>{`
        .roleplay-shell {
          background:
            radial-gradient(circle at top left, rgba(168, 85, 247, 0.22), transparent 28%),
            radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 24%),
            linear-gradient(180deg, rgba(9, 12, 22, 0.96), rgba(7, 10, 18, 0.98));
        }

        .roleplay-panel {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .roleplay-rail-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.82);
          transition: transform 180ms ease, background 180ms ease, color 180ms ease;
        }

        .roleplay-rail-button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.14);
          color: white;
        }

        .roleplay-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }

        .roleplay-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .roleplay-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .roleplay-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
        }

        .roleplay-orb {
          animation: roleplayFloat 11s ease-in-out infinite;
        }

        .roleplay-orb-delay {
          animation-delay: -5.5s;
        }

        @keyframes roleplayFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -18px, 0) scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}
