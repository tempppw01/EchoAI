import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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

const calcScore = (query: string, text: string) => {
  const q = new Set(tokenize(query));
  if (q.size === 0) return 0;
  const t = tokenize(text);
  let score = 0;
  for (const token of t) {
    if (q.has(token)) score += 1;
  }
  return score;
};

export const useSampleLibraryStore = create<{
  items: SampleLibraryItem[];
  addTextSample: (payload: { title: string; textContent: string }) => void;
  addFileSample: (payload: { title: string; filename: string; contentType: string; size: number; textContent: string }) => void;
  deleteSample: (id: string) => void;
  getRelevantSamples: (query: string, topK?: number) => SampleLibraryItem[];
}>()(
  persist(
    (set, get) => ({
      items: [],
      addTextSample: ({ title, textContent }) =>
        set((state) => ({
          items: [
            {
              id: uid(),
              title: title.trim() || '未命名文本样本',
              sourceType: 'text',
              contentType: 'text/plain',
              textContent,
              summary: textContent.trim().slice(0, 120),
              createdAt: now(),
              updatedAt: now(),
            },
            ...state.items,
          ],
        })),
      addFileSample: ({ title, filename, contentType, size, textContent }) =>
        set((state) => ({
          items: [
            {
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
            },
            ...state.items,
          ],
        })),
      deleteSample: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      getRelevantSamples: (query, topK = 3) => {
        const items = get().items;
        return [...items]
          .map((item) => ({
            item,
            score: calcScore(query, `${item.title}\n${item.summary}\n${item.textContent}`),
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
