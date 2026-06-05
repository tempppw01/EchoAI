import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ensureTrendRanks, normalizeTrendTitle, splitKeywordSuggestions } from '@/lib/trend-utils';
import { DouyinKeywordSnapshot, DouyinKeywordSuggestion, DouyinKeywordWatch, DouyinTrendItem, DouyinTrendSnapshot } from '@/lib/types';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const MAX_SNAPSHOTS = 80;
const MAX_KEYWORD_SNAPSHOTS = 30;

export const getDouyinTrendUrl = (item: DouyinTrendItem) => {
  if (item.url?.trim()) return item.url.trim();
  return `https://www.douyin.com/search/${encodeURIComponent(item.title)}`;
};

export const useTrendStore = create<{
  snapshots: DouyinTrendSnapshot[];
  keywordWatches: DouyinKeywordWatch[];
  addSnapshot: (payload: { source?: string; sourceLabel?: string; fetchedAt?: string; items: DouyinTrendItem[] }) => DouyinTrendSnapshot;
  followKeyword: (keyword: string) => void;
  unfollowKeyword: (id: string) => void;
  addKeywordSnapshot: (payload: { keyword: string; source?: string; fetchedAt?: string; suggestions: DouyinKeywordSuggestion[]; longTailSuggestions?: DouyinKeywordSuggestion[] }) => DouyinKeywordSnapshot;
  deleteSnapshot: (id: string) => void;
  clearSnapshots: () => void;
}>()(
  persist(
    (set) => ({
      snapshots: [],
      keywordWatches: [],
      addSnapshot: ({ source = '', sourceLabel = '抖音热搜', fetchedAt, items }) => {
        const snapshot: DouyinTrendSnapshot = {
          id: uid(),
          source,
          sourceLabel,
          fetchedAt: fetchedAt || now(),
          createdAt: now(),
          items: ensureTrendRanks(items),
        };

        set((state) => ({
          snapshots: [snapshot, ...state.snapshots].slice(0, MAX_SNAPSHOTS),
        }));

        return snapshot;
      },
      followKeyword: (keyword) =>
        set((state) => {
          const normalized = keyword.trim();
          if (!normalized) return state;
          if (state.keywordWatches.some((watch) => normalizeTrendTitle(watch.keyword) === normalizeTrendTitle(normalized))) return state;

          const watch: DouyinKeywordWatch = {
            id: uid(),
            keyword: normalized,
            createdAt: now(),
            updatedAt: now(),
            snapshots: [],
          };

          return { keywordWatches: [watch, ...state.keywordWatches] };
        }),
      unfollowKeyword: (id) => set((state) => ({ keywordWatches: state.keywordWatches.filter((watch) => watch.id !== id) })),
      addKeywordSnapshot: ({ keyword, source = '抖音搜索联想', fetchedAt, suggestions, longTailSuggestions }) => {
        const normalized = keyword.trim();
        const split = splitKeywordSuggestions(suggestions);
        const snapshot: DouyinKeywordSnapshot = {
          id: uid(),
          keyword: normalized,
          fetchedAt: fetchedAt || now(),
          source,
          suggestions: split.suggestions,
          longTailSuggestions: longTailSuggestions?.length ? splitKeywordSuggestions(longTailSuggestions).suggestions : split.longTailSuggestions,
        };

        set((state) => {
          const existing = state.keywordWatches.find((watch) => normalizeTrendTitle(watch.keyword) === normalizeTrendTitle(normalized));
          if (!existing) {
            return {
              keywordWatches: [
                {
                  id: uid(),
                  keyword: normalized,
                  createdAt: now(),
                  updatedAt: snapshot.fetchedAt,
                  snapshots: [snapshot],
                },
                ...state.keywordWatches,
              ],
            };
          }

          return {
            keywordWatches: state.keywordWatches.map((watch) =>
              watch.id === existing.id
                ? {
                    ...watch,
                    keyword: normalized,
                    updatedAt: snapshot.fetchedAt,
                    snapshots: [snapshot, ...watch.snapshots].slice(0, MAX_KEYWORD_SNAPSHOTS),
                  }
                : watch,
            ),
          };
        });

        return snapshot;
      },
      deleteSnapshot: (id) => set((state) => ({ snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id) })),
      clearSnapshots: () => set({ snapshots: [] }),
    }),
    {
      name: 'echoai-douyin-trend-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ snapshots: state.snapshots, keywordWatches: state.keywordWatches }),
    },
  ),
);
