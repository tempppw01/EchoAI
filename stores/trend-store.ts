import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ensureTrendRanks } from '@/lib/trend-utils';
import { DouyinTrendItem, DouyinTrendSnapshot } from '@/lib/types';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const MAX_SNAPSHOTS = 80;

export const getDouyinTrendUrl = (item: DouyinTrendItem) => {
  if (item.url?.trim()) return item.url.trim();
  return `https://www.douyin.com/search/${encodeURIComponent(item.title)}`;
};

export const useTrendStore = create<{
  snapshots: DouyinTrendSnapshot[];
  addSnapshot: (payload: { source?: string; sourceLabel?: string; fetchedAt?: string; items: DouyinTrendItem[] }) => DouyinTrendSnapshot;
  deleteSnapshot: (id: string) => void;
  clearSnapshots: () => void;
}>()(
  persist(
    (set) => ({
      snapshots: [],
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
      deleteSnapshot: (id) => set((state) => ({ snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id) })),
      clearSnapshots: () => set({ snapshots: [] }),
    }),
    {
      name: 'echoai-douyin-trend-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ snapshots: state.snapshots }),
    },
  ),
);
