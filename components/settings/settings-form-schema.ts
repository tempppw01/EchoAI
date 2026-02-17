import { z } from 'zod';

// 设置中心统一的表单校验规则，避免在多个组件重复声明。
export const settingsSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  defaultTextModel: z.string(),
  defaultImageModel: z.string(),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().min(256).max(8192),
  stream: z.boolean(),
  webdavUrl: z.string().optional(),
  webdavUsername: z.string().optional(),
  autoSyncMinutes: z.coerce.number().min(5).max(720),
  showTokenUsage: z.boolean(),
  modelCatalog: z.array(z.string()).optional(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
