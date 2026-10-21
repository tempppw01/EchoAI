import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppSettings } from '@/lib/types';

export const defaultSettings: AppSettings = {
  defaultTextModel: '',
  defaultImageModel: '',
  defaultEmbeddingModel: '',
  rerankEnabled: false,
  rerankModel: '',
  rerankTopK: 3,
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  provider: 'OpenAI Compatible',
  apiKey: '',
  baseUrl: 'https://ai.shuaihong.fun/v1',
  webdavUrl: '',
  webdavUsername: '',
  autoSyncMinutes: 30,
  showTokenUsage: false,
  sampleRecallTopK: 3,
  modelCatalog: [],
};

export const sanitizeSettingsForExport = (settings: AppSettings): AppSettings => ({
  ...settings,
  apiKey: '',
});

const LEGACY_PRESET_MODELS = new Set(['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-image-1']);

const isLegacyPresetModels = (models?: string[]) => {
  if (!Array.isArray(models) || models.length === 0) return false;
  return models.every((model) => LEGACY_PRESET_MODELS.has(model));
};

/**
 * 把持久化数据合并进当前设置。
 * 旧版本会自动写入一批内置预置模型，这些模型对用户没有意义，
 * 因此这里要识别出来并清空，让用户从空目录开始配置。
 */
export const mergePersistedSettings = (persisted?: Partial<AppSettings>): AppSettings => {
  const mergedSettings: AppSettings = {
    ...defaultSettings,
    ...(persisted ?? {}),
  };

  if (isLegacyPresetModels(mergedSettings.modelCatalog)) {
    mergedSettings.modelCatalog = [];
  }

  return mergedSettings;
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

          return {
            settings: {
              ...state.settings,
              ...sanitizedIncoming,
            },
          };
        }),
      replaceSettings: (settings) => set({ settings: { ...defaultSettings, ...settings } }),
    }),
    {
      name: 'echoai-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      merge: (persistedState, currentState) => {
        const persistedSettings = ((persistedState as { settings?: Partial<AppSettings> } | undefined)?.settings ?? {}) as Partial<AppSettings>;
        const mergedSettings = mergePersistedSettings(persistedSettings);

        return {
          ...currentState,
          ...(persistedState as object),
          settings: mergedSettings,
        };
      },
    },
  ),
);
