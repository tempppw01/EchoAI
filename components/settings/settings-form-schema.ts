import { z } from 'zod';

// 设置中心统一的表单校验规则，避免在多个组件重复声明。
export const settingsSchema = z.object({
  defaultTextModel: z.string().min(1),
  defaultImageModel: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().min(256).max(8192),
  webdavUrl: z.string().optional(),
  webdavUsername: z.string().optional(),
  autoSyncMinutes: z.coerce.number().min(5).max(720),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
