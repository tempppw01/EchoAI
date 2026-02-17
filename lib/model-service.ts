import { AppSettings } from '@/lib/types';
import { normalizeOpenAIBaseUrl } from '@/lib/openai-endpoint';

type ModelFetchSettings = Partial<Pick<AppSettings, 'modelCatalog' | 'baseUrl' | 'apiKey'>>;

export async function fetchModelCatalog(settings: ModelFetchSettings): Promise<string[]> {
  const baseUrl = settings.baseUrl?.trim();
  const apiKey = settings.apiKey?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error('请先填写并保存 OpenAI 渠道地址和 API Key');
  }

  const response = await fetch(`${normalizeOpenAIBaseUrl(baseUrl)}/models`, {
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
