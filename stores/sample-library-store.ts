import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { requestEmbeddingVector } from '@/lib/openai-compatible';
import { defaultSettings, useSettingsStore } from '@/stores/settings-store';
import { SampleLibraryItem } from '@/lib/types';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const calcKeywordScore = (query: string, text: string) => {
  const q = new Set(tokenize(query));
  if (q.size === 0) return 0;
  const t = tokenize(text);
  let score = 0;
  for (const token of t) {
    if (q.has(token)) score += 1;
  }
  return score;
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a.length || !b.length || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getEmbeddingSettings = () => {
  const settings = useSettingsStore.getState().settings;
  return { ...defaultSettings, ...settings };
};

export const useSampleLibraryStore = create<{
  items: SampleLibraryItem[];
  addTextSample: (payload: { title: string; textContent: string }) => Promise<void>;
  addFileSample: (payload: { title: string; filename: string; contentType: string; size: number; textContent: string }) => Promise<void>;
  deleteSample: (id: string) => void;
  ensureEmbeddingForItem: (id: string) => Promise<void>;
  getRelevantSamples: (query: string, topK?: number) => Promise<SampleLibraryItem[]>;
}>()(
  persist(
    (set, get) => ({
      items: [],
      addTextSample: async ({ title, textContent }) => {
        const item: SampleLibraryItem = {
          id: uid(),
          title: title.trim() || '未命名文本样本',
          sourceType: 'text',
          contentType: 'text/plain',
          textContent,
          summary: textContent.trim().slice(0, 120),
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ items: [item, ...state.items] }));
        await get().ensureEmbeddingForItem(item.id);
      },
      addFileSample: async ({ title, filename, contentType, size, textContent }) => {
        const item: SampleLibraryItem = {
          id: uid(),
          title: title.trim() || filename || '未命名文件样本',
          sourceType: 'file',
          filename,
          contentType,
          size,
          textContent,
          summary: textContent.trim().slice(0, 120),
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ items: [item, ...state.items] }));
        await get().ensureEmbeddingForItem(item.id);
      },
      deleteSample: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      ensureEmbeddingForItem: async (id) => {
        const settings = getEmbeddingSettings();
        const model = settings.defaultEmbeddingModel?.trim();
        if (!model) return;
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        try {
          const vector = await requestEmbeddingVector({
            settings,
            model,
            input: `${item.title}\n${item.textContent}`.slice(0, 6000),
          });
          set((state) => ({
            items: state.items.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    embeddingVector: vector,
                    embeddingModel: model,
                    embeddingUpdatedAt: now(),
                    updatedAt: now(),
                  }
                : entry,
            ),
          }));
        } catch {
          // 嵌入失败时静默回退到关键词召回
        }
      },
      getRelevantSamples: async (query, topK = 3) => {
        const settings = getEmbeddingSettings();
        const model = settings.defaultEmbeddingModel?.trim();
        const items = get().items;

        if (model && items.length > 0) {
          try {
            const queryVector = await requestEmbeddingVector({ settings, model, input: query.slice(0, 4000) });
            const vectorCandidates = items
              .filter((item) => Array.isArray(item.embeddingVector) && item.embeddingVector.length > 0)
              .map((item) => ({ item, score: cosineSimilarity(queryVector, item.embeddingVector || []) }))
              .filter((entry) => entry.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, topK)
              .map((entry) => entry.item);

            if (vectorCandidates.length > 0) return vectorCandidates;
          } catch {
            // 失败则回退关键词召回
          }
        }

        return [...items]
          .map((item) => ({
            item,
            score: calcKeywordScore(query, `${item.title}\n${item.summary}\n${item.textContent}`),
          }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map((entry) => entry.item);
      },
    }),
    {
      name: 'echoai-sample-library',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
