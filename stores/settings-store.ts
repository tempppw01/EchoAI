import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '@/lib/types';

export const defaultSettings: AppSettings = {
  defaultTextModel: 'gpt-4o-mini',
  defaultImageModel: 'gpt-image-1',
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  provider: 'OpenAI',
  apiKey: '',
  baseUrl: 'https://ai.shuaihong.fun/v1',
  webdavUrl: '',
  webdavUsername: '',
  autoSyncMinutes: 30,
  showTokenUsage: false,
};

export const useSettingsStore = create<{
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  replaceSettings: (settings: AppSettings) => void;
}>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (incoming) => set((state) => ({ settings: { ...state.settings, ...incoming } })),
      replaceSettings: (settings) => set({ settings }),
    }),
    { name: 'echoai-settings' },
  ),
);
