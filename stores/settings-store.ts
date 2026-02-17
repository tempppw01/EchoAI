import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppSettings } from '@/lib/types';

export const defaultSettings: AppSettings = {
  defaultTextModel: '',
  defaultImageModel: '',
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
  modelCatalog: [],
};

export const useSettingsStore = create<{
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  replaceSettings: (settings: AppSettings) => void;
}>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => {
          const sanitizedIncoming = Object.fromEntries(
            Object.entries(incoming).filter(([, value]) => value !== undefined),
          ) as Partial<AppSettings>;

          return { settings: { ...state.settings, ...sanitizedIncoming } };
        }),
      replaceSettings: (settings) => set({ settings: { ...defaultSettings, ...settings } }),
    }),
    {
      name: 'echoai-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as object),
        settings: {
          ...defaultSettings,
          ...((persistedState as { settings?: Partial<AppSettings> } | undefined)?.settings ?? {}),
        },
      }),
    },
  ),
);
