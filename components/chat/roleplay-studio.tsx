'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
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

type EditorTab = 'identity' | 'scene' | 'directive';

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
];

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

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [editorTab, setEditorTab] = useState<EditorTab>('identity');
  const [composerValue, setComposerValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

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

  const sessionCharacter = useMemo(
    () => characters.find((item) => item.id === session?.characterId) || selectedCharacter,
    [characters, session?.characterId, selectedCharacter],
  );

  const sessionWorld = useMemo(
    () => worlds.find((item) => item.id === session?.worldId) || selectedWorld,
    [worlds, session?.worldId, selectedWorld],
  );

  const selectedAccent = getAccentPreset(selectedCharacter?.id || selectedCharacter?.name);
  const stageAccent = getAccentPreset(sessionCharacter?.id || sessionCharacter?.name || selectedCharacter?.name);

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

  const quickPrompts = useMemo(() => {
    const roleName = sessionCharacter?.name || selectedCharacter?.name || '角色';
    const worldName = sessionWorld?.name || selectedWorld?.name || '当前世界';
    return [
      { label: '电影感开场', value: `${roleName}，用一句很有镜头感的开场白，把我直接拉进现在的场景。` },
      { label: '情绪升温', value: `${roleName}，把氛围拉近一点，但保持克制和高级感。` },
      { label: '推进剧情', value: `保持 ${worldName} 的设定，让剧情向前推进一点，并给我一个可以接住的回应点。` },
      { label: '增加反差', value: `${roleName}，表面冷静，内里明显在意我，给我一段有反差的回应。` },
      { label: '换个场景', value: `把当前剧情自然转场到一个更有画面感的新场景，但不要跳出设定。` },
    ];
  }, [selectedCharacter?.name, selectedWorld?.name, sessionCharacter?.name, sessionWorld?.name]);

  const focusComposer = () => {
    window.requestAnimationFrame(() => composerRef.current?.focus());
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
  };

  const createStyledWorld = () => {
    const id = createWorld(`新场景 ${worlds.length + 1}`, '夜色、风声、霓虹与暧昧张力并存，所有角色保持世界观一致。');
    setActiveWorld(id);
    if (session && session.messages.length === 0) {
      updateSession(session.id, { worldId: id });
    }
    setEditorTab('scene');
  };

  const startRoleplaySession = () => {
    if (!selectedCharacter) return;

    const sid = createSession('roleplay', undefined, undefined, {
      characterId: selectedCharacter.id,
      worldId: selectedWorld?.id,
    });
    selectSession(sid);
    markRecentCharacter(selectedCharacter.id);
    setShowMemory(false);
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

    const sid = createSession('roleplay', undefined, undefined, {
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
    setEditorTab('identity');
  };

  const handleDeleteCharacter = () => {
    if (!selectedCharacter) return;
    if (!window.confirm(`确认删除角色「${selectedCharacter.name}」？`)) return;
    deleteCharacter(selectedCharacter.id);
  };

  const stageLocked = Boolean(session && session.messages.length > 0);

  return (
    <div className="roleplay-shell relative overflow-hidden rounded-[30px] border border-white/10 p-4 text-foreground shadow-[0_30px_120px_-40px_rgba(76,29,149,0.65)]">
      <div className="roleplay-orb pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full bg-fuchsia-500/18 blur-3xl" />
      <div className="roleplay-orb roleplay-orb-delay pointer-events-none absolute right-0 top-16 h-56 w-56 rounded-full bg-cyan-500/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.04))] opacity-60" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="relative grid gap-4 xl:grid-cols-[300px_1.08fr_0.94fr]">
        <section className="roleplay-glass rounded-[26px] border border-white/10 bg-black/10 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/40">Casting</p>
              <h3 className="mt-1 text-lg font-semibold">角色池</h3>
            </div>
            <Button
              type="button"
              className="h-11 w-11 rounded-2xl border border-white/10 bg-white/10 p-0 text-white hover:bg-white/15"
              onClick={createStyledCharacter}
            >
              <Plus size={18} />
            </Button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜名字 / 气质 / 标签"
              className="h-12 rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag('')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition',
                !activeTag ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10',
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
                  activeTag === tag ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10',
                )}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="roleplay-scroll max-h-[72vh] space-y-3 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredCharacters.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-center"
                >
                  <p className="text-sm text-white/70">没有匹配角色</p>
                  <p className="mt-1 text-xs text-white/35">换个关键词，或直接新建一个更有戏的人物。</p>
                </motion.div>
              ) : (
                filteredCharacters.map((item, index) => {
                  const accent = getAccentPreset(item.id || item.name);
                  const active = item.id === selectedCharacter?.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.18) }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectCharacter(item.id)}
                      className={cn(
                        'group relative w-full overflow-hidden rounded-[24px] border p-3 text-left transition duration-300',
                        active ? cn('shadow-[0_16px_45px_-26px_rgba(168,85,247,0.75)]', accent.card) : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
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
                          <p className="mt-1 line-clamp-2 text-xs text-white/65">{compactText(item.personality, '还没定气质，先点进来调氛围。')}</p>
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
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="space-y-4">
          <motion.div
            layout
            className="roleplay-glass relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', selectedAccent.hero)} />
            <div className={cn('absolute -right-10 top-0 h-40 w-40 rounded-full blur-3xl', selectedAccent.halo)} />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, -2, 0, 2, 0] }}
                  transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                  className={cn('flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] border text-4xl shadow-2xl backdrop-blur', selectedAccent.avatar)}
                >
                  {selectedCharacter?.avatar || '✨'}
                </motion.div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/45">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">Moodboard</span>
                    {selectedWorld && <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{selectedWorld.name}</span>}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white xl:text-3xl">
                    {compactText(selectedCharacter?.name, '未命名角色')}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-white/72">
                    {compactText(selectedCharacter?.background, '先用几个关键词塑造这个人，再把关系、场景和说话方式一点点推到位。')}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(selectedCharacter?.tags.length ? selectedCharacter.tags : ['待定']).slice(0, 4).map((tag) => (
                      <span key={tag} className={cn('rounded-full border px-3 py-1 text-xs text-white/80', selectedAccent.chip)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button type="button" className="h-11 rounded-2xl bg-white text-slate-900 hover:bg-white/90" onClick={startRoleplaySession}>
                  <Play size={15} className="mr-2" /> 新戏开场
                </Button>
                <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={handleDuplicateCharacter}>
                  <Copy size={15} className="mr-2" /> 复制
                </Button>
                <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={createStyledWorld}>
                  <Plus size={15} className="mr-2" /> 新场景
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="roleplay-glass rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.34em] text-white/35">Direction</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">角色导演台</h3>
                </div>
                <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
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
                          active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/55 hover:text-white',
                        )}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {editorTab === 'identity' && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid gap-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                      <Input
                        value={selectedCharacter?.name || ''}
                        onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { name: e.target.value })}
                        placeholder="角色名"
                        className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      />
                      <Input
                        value={selectedCharacter?.avatar || ''}
                        onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { avatar: e.target.value })}
                        placeholder="头像"
                        className="h-12 rounded-2xl border-white/10 bg-white/5 text-center text-white placeholder:text-white/30"
                      />
                    </div>
                    <Input
                      value={(selectedCharacter?.tags || []).join(' ')}
                      onChange={(e) => selectedCharacter && updateCharacter(selectedCharacter.id, { tags: normalizeTags(e.target.value) })}
                      placeholder="标签：暧昧 治愈 危险感"
                      className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
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
                  <motion.div
                    key="scene"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid gap-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      {worlds.map((world) => (
                        <button
                          key={world.id}
                          type="button"
                          onClick={() => handleSelectWorld(world.id)}
                          className={cn(
                            'rounded-full border px-3 py-2 text-xs transition',
                            world.id === selectedWorld?.id ? 'border-white/20 bg-white/12 text-white' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white',
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
                  <motion.div
                    key="directive"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid gap-3"
                  >
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
            </section>

            <section className="space-y-4">
              <div className="roleplay-glass rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center gap-2 text-white">
                  <Wand2 size={16} className="text-white/70" />
                  <h3 className="font-semibold">氛围提要</h3>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/35">气质</p>
                    <p className="text-sm leading-7 text-white/80">{compactText(selectedCharacter?.personality, '先定下气质，让角色一下就有感觉。')}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/35">场景</p>
                    <p className="text-sm leading-7 text-white/80">{compactText(selectedCharacter?.scenario || selectedWorld?.prompt, '先定场景，角色自然会开口。')}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/35">语言</p>
                    <p className="text-sm leading-7 text-white/80">{compactText(selectedCharacter?.speakingStyle, '给他一点节奏和口癖，会立刻更像真人。')}</p>
                  </div>
                </div>
              </div>

              <div className="roleplay-glass rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <LayoutGrid size={16} className="text-white/70" />
                  <h3 className="font-semibold">快捷动作</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={handleDuplicateCharacter}>
                    <Copy size={15} className="mr-2" /> 复制
                  </Button>
                  <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={createStyledCharacter}>
                    <Plus size={15} className="mr-2" /> 新角色
                  </Button>
                  <Button type="button" className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15" onClick={createStyledWorld}>
                    <Globe2 size={15} className="mr-2" /> 新世界
                  </Button>
                  <Button type="button" className="h-11 rounded-2xl border border-rose-400/20 bg-rose-500/10 text-white hover:bg-rose-500/15" onClick={handleDeleteCharacter}>
                    <Trash2 size={15} className="mr-2" /> 删除
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="roleplay-glass flex min-h-[78vh] flex-col rounded-[28px] border border-white/10 bg-black/10 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.34em] text-white/35">
                <span>Live Scene</span>
                {sessionWorld && <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white/65">{sessionWorld.name}</span>}
                {stageLocked && <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white/65">当前会话已锁定角色</span>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px] border text-2xl backdrop-blur', stageAccent.avatar)}>
                  {sessionCharacter?.avatar || selectedCharacter?.avatar || '✨'}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">{compactText(sessionCharacter?.name || selectedCharacter?.name, '角色未就位')}</h3>
                  <p className="truncate text-sm text-white/55">{session?.messages.length ? `已演绎 ${session.messages.length} 轮` : '准备开场，点下方提示词即可入戏'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setShowMemory((prev) => !prev)}
              >
                <PenSquare size={15} className="mr-2" /> 记忆
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
                disabled={!session || session.messages.length === 0}
                onClick={() => {
                  if (!session) return;
                  if (window.confirm('确认清空当前角色扮演上下文？')) {
                    clearContext(session.id);
                  }
                }}
              >
                <RotateCcw size={15} className="mr-2" /> 清空
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showMemory && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]"
              >
                <div className="grid gap-3 p-4">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm text-white">
                      <Brain size={15} className="text-white/65" />
                      <span>固定记忆</span>
                    </div>
                    <Textarea
                      rows={3}
                      value={session?.pinnedMemory || ''}
                      onChange={(e) => session && updateSession(session.id, { pinnedMemory: e.target.value })}
                      placeholder="写下只属于这段关系的长期记忆"
                      className="rounded-[18px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm text-white">
                      <BookOpen size={15} className="text-white/65" />
                      <span>摘要记忆</span>
                    </div>
                    <div className="min-h-[72px] rounded-[18px] border border-white/10 bg-black/10 p-3 text-sm leading-7 text-white/70">
                      {session?.memorySummary || '还没有摘要，剧情走深以后，这里会自动沉淀重点。'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!session || session.messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-between gap-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', stageAccent.hero)} />
                <div className="relative">
                  <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border text-3xl shadow-lg', stageAccent.avatar)}>
                    {selectedCharacter?.avatar || '✨'}
                  </div>
                  <h4 className="text-xl font-semibold text-white">先让气氛发生</h4>
                  <p className="mt-2 max-w-sm text-sm leading-7 text-white/70">
                    少写说明，多写感觉。点一个提示词，或者直接让角色先开口。
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

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickPrompts.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => injectPrompt(item.value)}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={composerRef}
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    rows={4}
                    placeholder="比如：你先别说喜欢我，先用一句话把氛围拉满。"
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
                      e.preventDefault();
                      onSend();
                    }}
                    className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                  <Button type="button" className="h-14 rounded-[20px] px-4" onClick={onSend}>
                    <SendHorizontal size={18} />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => injectPrompt(item.value)}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="roleplay-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {session.messages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.02, 0.16) }}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[92%] rounded-[28px] border px-4 py-3 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.8)] backdrop-blur',
                          msg.role === 'user' ? 'border-violet-400/20 bg-violet-500/12' : 'border-white/10 bg-white/[0.05]',
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/35">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[13px] normal-case tracking-normal text-white/85">
                            {msg.role === 'assistant' ? sessionCharacter?.avatar || '✨' : '你'}
                          </span>
                          <span className="normal-case tracking-normal text-white/60">
                            {msg.role === 'assistant' ? compactText(sessionCharacter?.name, '角色') : '你'}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-white/82">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                  <span>按 Enter 发送</span>
                  <span>Shift + Enter 换行</span>
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={composerRef}
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    rows={4}
                    placeholder={`对 ${compactText(sessionCharacter?.name, '角色')} 说点什么…`}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || isComposing || e.shiftKey) return;
                      e.preventDefault();
                      onSend();
                    }}
                    className="rounded-[22px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                  <Button type="button" className="h-14 rounded-[20px] px-4" onClick={onSend}>
                    <SendHorizontal size={18} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .roleplay-shell {
          background:
            radial-gradient(circle at top left, rgba(168, 85, 247, 0.22), transparent 28%),
            radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 24%),
            linear-gradient(180deg, rgba(9, 12, 22, 0.96), rgba(7, 10, 18, 0.98));
        }

        .roleplay-glass {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
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
