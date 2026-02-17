import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '@/lib/types';

const defaultSettings: AppSettings = {
  defaultTextModel: 'gpt-4o-mini',
  defaultImageModel: 'gpt-image-1',
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  webdavUrl: '',
  webdavUsername: '',
  autoSyncMinutes: 30,
  showTokenUsage: false,
};

export const useSettingsStore = create<{
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (incoming) => set((state) => ({ settings: { ...state.settings, ...incoming } })),
    }),
    { name: 'echoai-settings' },
  ),
);
