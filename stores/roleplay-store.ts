import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CharacterCard, WorldConfig } from '@/lib/types';

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const defaultCharacter = (): CharacterCard => ({
  id: 'default-character',
  name: '艾可',
  avatar: '🤖',
  personality: '温柔、好奇、会接梗',
  background: '来自未来图书馆的引导员，擅长陪伴式对话。',
  speakingStyle: '简洁、带一点戏剧感',
  scenario: '夜晚的图书馆天台，微风和霓虹灯。',
  exampleDialogues: '用户：你会离开吗？\n角色：我会在你每一次翻页时出现。',
  systemPrompt: '你正在扮演角色“艾可”，保持沉浸感，不要跳出设定。',
  tags: ['治愈', '科幻'],
  createdAt: now(),
  updatedAt: now(),
});

const defaultWorld = (): WorldConfig => ({
  id: 'default-world',
  name: '新夜城',
  prompt: '赛博都市，新夜城。魔法与科技并存，所有角色需遵守世界观一致性。',
  createdAt: now(),
  updatedAt: now(),
});

interface RoleplayState {
  characters: CharacterCard[];
  worlds: WorldConfig[];
  activeCharacterId?: string;
  activeWorldId?: string;
  recentCharacterId?: string;
  createCharacter: (seed?: Partial<CharacterCard>) => string;
  updateCharacter: (id: string, patch: Partial<CharacterCard>) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  importCharacter: (raw: string) => { ok: boolean; message: string };
  exportCharacter: (id: string) => string | null;
  setActiveCharacter: (id?: string) => void;
  createWorld: (name: string, prompt: string) => string;
  updateWorld: (id: string, patch: Partial<WorldConfig>) => void;
  deleteWorld: (id: string) => void;
  setActiveWorld: (id?: string) => void;
  markRecentCharacter: (id?: string) => void;
}

export const useRoleplayStore = create<RoleplayState>()(
  persist(
    (set, get) => ({
      characters: [defaultCharacter()],
      worlds: [defaultWorld()],
      activeCharacterId: 'default-character',
      activeWorldId: 'default-world',
      recentCharacterId: 'default-character',
      createCharacter: (seed) => {
        const id = uid();
        const character: CharacterCard = {
          id,
          name: seed?.name || '新角色',
          avatar: seed?.avatar || '🧩',
          personality: seed?.personality || '',
          background: seed?.background || '',
          speakingStyle: seed?.speakingStyle || '',
          scenario: seed?.scenario || '',
          exampleDialogues: seed?.exampleDialogues || '',
          systemPrompt: seed?.systemPrompt || '',
          tags: seed?.tags || [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ characters: [character, ...state.characters], activeCharacterId: id }));
        return id;
      },
      updateCharacter: (id, patch) =>
        set((state) => ({
          characters: state.characters.map((char) => (char.id === id ? { ...char, ...patch, updatedAt: now() } : char)),
        })),
      deleteCharacter: (id) =>
        set((state) => {
          const characters = state.characters.filter((char) => char.id !== id);
          const fallback = characters[0]?.id;
          return {
            characters: characters.length ? characters : [defaultCharacter()],
            activeCharacterId: state.activeCharacterId === id ? fallback : state.activeCharacterId,
          };
        }),
      duplicateCharacter: (id) => {
        const source = get().characters.find((char) => char.id === id);
        if (!source) return;
        get().createCharacter({ ...source, name: `${source.name}（复制）` });
      },
      importCharacter: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<CharacterCard>;
          if (!parsed.name) return { ok: false, message: '导入失败：缺少 name' };
          get().createCharacter({
            name: parsed.name,
            avatar: parsed.avatar,
            personality: parsed.personality,
            background: parsed.background,
            speakingStyle: parsed.speakingStyle,
            scenario: parsed.scenario,
            exampleDialogues: parsed.exampleDialogues,
            systemPrompt: parsed.systemPrompt,
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          });
          return { ok: true, message: '导入成功' };
        } catch {
          return { ok: false, message: '导入失败：JSON 格式错误' };
        }
      },
      exportCharacter: (id) => {
        const character = get().characters.find((char) => char.id === id);
        if (!character) return null;
        return JSON.stringify(character, null, 2);
      },
      setActiveCharacter: (activeCharacterId) => set({ activeCharacterId }),
      createWorld: (name, prompt) => {
        const id = uid();
        const world: WorldConfig = { id, name, prompt, createdAt: now(), updatedAt: now() };
        set((state) => ({ worlds: [world, ...state.worlds], activeWorldId: id }));
        return id;
      },
      updateWorld: (id, patch) => set((state) => ({ worlds: state.worlds.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now() } : w)) })),
      deleteWorld: (id) =>
        set((state) => {
          const worlds = state.worlds.filter((w) => w.id !== id);
          return { worlds: worlds.length ? worlds : [defaultWorld()], activeWorldId: worlds[0]?.id };
        }),
      setActiveWorld: (activeWorldId) => set({ activeWorldId }),
      markRecentCharacter: (recentCharacterId) => set({ recentCharacterId }),
    }),
    { name: 'echoai-roleplay' },
  ),
);
