import { create } from 'zustand';
import {
  defaultImageWorkbenchDraft,
  type ImageWorkbenchDraft,
} from '@/components/image/image-workbench-config';

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  quickCreateOpen: boolean;
  modeDraft: 'chat' | 'image' | 'proImage' | 'copywriting' | 'videoScript' | 'roleplay' | 'training';
  composerDraft: string;
  imageDraft: ImageWorkbenchDraft;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setQuickCreateOpen: (open: boolean) => void;
  setModeDraft: (mode: UIState['modeDraft']) => void;
  setComposerDraft: (draft: string) => void;
  setImageDraft: (draft: Partial<ImageWorkbenchDraft>) => void;
  resetImageDraft: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  settingsOpen: false,
  quickCreateOpen: false,
  modeDraft: 'chat',
  composerDraft: '',
  imageDraft: { ...defaultImageWorkbenchDraft },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setQuickCreateOpen: (quickCreateOpen) => set({ quickCreateOpen }),
  setModeDraft: (modeDraft) => set({ modeDraft }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setImageDraft: (draft) =>
    set((state) => ({
      imageDraft: { ...state.imageDraft, ...draft },
    })),
  resetImageDraft: () => set({ imageDraft: { ...defaultImageWorkbenchDraft } }),
}));
