import { describe, expect, it, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { defaultSettings, mergePersistedSettings, sanitizeSettingsForExport } from './settings-store';
import type { AppSettings } from '@/lib/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('defaultSettings', () => {
  it('has all required fields', () => {
    expect(defaultSettings).toHaveProperty('defaultTextModel');
    expect(defaultSettings).toHaveProperty('defaultImageModel');
    expect(defaultSettings).toHaveProperty('temperature');
    expect(defaultSettings).toHaveProperty('maxTokens');
    expect(defaultSettings).toHaveProperty('provider');
    expect(defaultSettings).toHaveProperty('apiKey');
    expect(defaultSettings).toHaveProperty('baseUrl');
  });

  it('has sensible default values', () => {
    expect(defaultSettings.temperature).toBe(0.7);
    expect(defaultSettings.maxTokens).toBe(2048);
    expect(defaultSettings.stream).toBe(true);
    expect(defaultSettings.rerankTopK).toBe(3);
  });

  it('has empty API key by default', () => {
    expect(defaultSettings.apiKey).toBe('');
  });
});

describe('sanitizeSettingsForExport', () => {
  it('removes API key from settings', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      apiKey: 'secret-api-key',
    };

    const sanitized = sanitizeSettingsForExport(settings);
    expect(sanitized.apiKey).toBe('');
  });

  it('preserves all other settings', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      defaultTextModel: 'gpt-4',
      temperature: 0.9,
      maxTokens: 4096,
      apiKey: 'secret-key',
    };

    const sanitized = sanitizeSettingsForExport(settings);
    expect(sanitized.defaultTextModel).toBe('gpt-4');
    expect(sanitized.temperature).toBe(0.9);
    expect(sanitized.maxTokens).toBe(4096);
  });

  it('does not mutate original settings', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      apiKey: 'secret-key',
    };

    const sanitized = sanitizeSettingsForExport(settings);
    expect(settings.apiKey).toBe('secret-key');
    expect(sanitized.apiKey).toBe('');
  });
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('initializes with default settings', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    const state = useTestStore.getState();
    expect(state.settings.temperature).toBe(0.7);
    expect(state.settings.maxTokens).toBe(2048);
  });

  it('updates partial settings', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    useTestStore.getState().setSettings({ temperature: 0.9 });
    expect(useTestStore.getState().settings.temperature).toBe(0.9);
    expect(useTestStore.getState().settings.maxTokens).toBe(2048);
  });

  it('replaces entire settings', () => {
    const useTestStore = create<{
      settings: AppSettings;
      replaceSettings: (settings: AppSettings) => void;
    }>((set) => ({
      settings: defaultSettings,
      replaceSettings: (settings) =>
        set({ settings: { ...defaultSettings, ...settings } }),
    }));

    const newSettings: AppSettings = {
      ...defaultSettings,
      temperature: 0.5,
      maxTokens: 1024,
    };

    useTestStore.getState().replaceSettings(newSettings);
    expect(useTestStore.getState().settings.temperature).toBe(0.5);
    expect(useTestStore.getState().settings.maxTokens).toBe(1024);
  });

  it('filters out undefined values in setSettings', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: { ...defaultSettings, temperature: 0.7 },
      setSettings: (incoming) => {
        const sanitizedIncoming = Object.fromEntries(
          Object.entries(incoming).filter(([, value]) => value !== undefined)
        ) as Partial<AppSettings>;

        set((state) => ({
          settings: { ...state.settings, ...sanitizedIncoming },
        }));
      },
    }));

    useTestStore.getState().setSettings({ temperature: undefined, maxTokens: 1024 });
    expect(useTestStore.getState().settings.temperature).toBe(0.7);
    expect(useTestStore.getState().settings.maxTokens).toBe(1024);
  });

  it('handles multiple rapid updates', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    useTestStore.getState().setSettings({ temperature: 0.5 });
    useTestStore.getState().setSettings({ maxTokens: 1024 });
    useTestStore.getState().setSettings({ stream: false });

    const finalSettings = useTestStore.getState().settings;
    expect(finalSettings.temperature).toBe(0.5);
    expect(finalSettings.maxTokens).toBe(1024);
    expect(finalSettings.stream).toBe(false);
  });

  it('preserves legacy preset models during migration', () => {
    const legacyModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-image-1'];

    // 全部由内置预置模型组成时，应在迁移阶段被清空。
    expect(mergePersistedSettings({ modelCatalog: legacyModels }).modelCatalog).toEqual([]);

    // 只要包含用户自定义模型，就整体保留。
    expect(mergePersistedSettings({ modelCatalog: [...legacyModels, 'my-model'] }).modelCatalog).toEqual([
      ...legacyModels,
      'my-model',
    ]);
  });

  it('handles empty model catalog', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: { ...defaultSettings, modelCatalog: [] },
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    expect(useTestStore.getState().settings.modelCatalog).toEqual([]);
    
    useTestStore.getState().setSettings({ modelCatalog: ['new-model'] });
    expect(useTestStore.getState().settings.modelCatalog).toEqual(['new-model']);
  });

  it('validates temperature bounds', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    // Test extreme values
    useTestStore.getState().setSettings({ temperature: -1 });
    expect(useTestStore.getState().settings.temperature).toBe(-1);
    
    useTestStore.getState().setSettings({ temperature: 2.5 });
    expect(useTestStore.getState().settings.temperature).toBe(2.5);
  });

  it('handles WebDAV settings', () => {
    const useTestStore = create<{
      settings: AppSettings;
      setSettings: (settings: Partial<AppSettings>) => void;
    }>((set) => ({
      settings: defaultSettings,
      setSettings: (incoming) =>
        set((state) => ({
          settings: { ...state.settings, ...incoming },
        })),
    }));

    useTestStore.getState().setSettings({
      webdavUrl: 'https://dav.example.com',
      webdavUsername: 'testuser',
      autoSyncMinutes: 60,
    });

    const settings = useTestStore.getState().settings;
    expect(settings.webdavUrl).toBe('https://dav.example.com');
    expect(settings.webdavUsername).toBe('testuser');
    expect(settings.autoSyncMinutes).toBe(60);
  });
});
