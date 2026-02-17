export type ChatMode = 'chat' | 'image' | 'proImage' | 'copywriting' | 'videoScript' | 'roleplay' | 'training';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  imageUrl?: string;
  status?: 'streaming' | 'error' | 'done';
}

export interface ChatSession {
  id: string;
  title: string;
  mode: ChatMode;
  subtype?: string;
  characterId?: string;
  worldId?: string;
  pinnedMemory?: string;
  memorySummary?: string;
  pinned: boolean;
  updatedAt: string;
  summary: string;
  model: string;
  messages: ChatMessage[];
}

export interface CharacterCard {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  background: string;
  speakingStyle: string;
  scenario: string;
  exampleDialogues: string;
  systemPrompt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorldConfig {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  defaultTextModel: string;
  defaultImageModel: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  provider: string;
  apiKey: string;
  baseUrl: string;
  webdavUrl: string;
  webdavUsername: string;
  autoSyncMinutes: number;
  showTokenUsage: boolean;
}

export interface AppSnapshot {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  sessions: ChatSession[];
  activeSessionId?: string;
}
