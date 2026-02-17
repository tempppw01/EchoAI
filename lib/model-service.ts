import { AppSettings } from '@/lib/types';

const ensureBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export async function fetchModelCatalog(settings: AppSettings): Promise<string[]> {
  const baseUrl = settings.baseUrl?.trim();
  const apiKey = settings.apiKey?.trim();

  if (!baseUrl || !apiKey) {
    return settings.modelCatalog || [];
  }

  const response = await fetch(`${ensureBaseUrl(baseUrl)}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`拉取模型失败 (${response.status})`);
  }

  const data = await response.json() as { data?: Array<{ id?: string }> };
  const ids: string[] = Array.isArray(data?.data)
    ? data.data
      .map((item) => item?.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  return [...new Set<string>(ids)];
}
