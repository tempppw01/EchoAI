import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  quickCreateOpen: boolean;
  modeDraft: 'chat' | 'image' | 'proImage' | 'copywriting' | 'videoScript' | 'roleplay' | 'training';
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setQuickCreateOpen: (open: boolean) => void;
  setModeDraft: (mode: UIState['modeDraft']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  settingsOpen: false,
  quickCreateOpen: false,
  modeDraft: 'chat',
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setQuickCreateOpen: (quickCreateOpen) => set({ quickCreateOpen }),
  setModeDraft: (modeDraft) => set({ modeDraft }),
}));
