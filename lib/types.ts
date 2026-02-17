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
  pinned: boolean;
  favorite: boolean;
  updatedAt: string;
  summary: string;
  model: string;
  messages: ChatMessage[];
}

export interface AppSettings {
  defaultTextModel: string;
  defaultImageModel: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  webdavUrl: string;
  webdavUsername: string;
  autoSyncMinutes: number;
  showTokenUsage: boolean;
}
