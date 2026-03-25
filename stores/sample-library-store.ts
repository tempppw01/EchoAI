import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SampleLibraryItem } from '@/lib/types';

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const useSampleLibraryStore = create<{
  items: SampleLibraryItem[];
  addTextSample: (payload: { title: string; textContent: string }) => void;
  addFileSample: (payload: { title: string; filename: string; contentType: string; size: number; textContent: string }) => void;
  deleteSample: (id: string) => void;
}>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'echoai-sample-library',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
