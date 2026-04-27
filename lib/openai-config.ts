import { normalizeOpenAIBaseUrl } from '@/lib/openai-endpoint';
import { AppSettings, OpenAIConfigOverride } from '@/lib/types';

export const DEFAULT_OPENAI_PROVIDER = 'OpenAI Compatible';

type OpenAIConfigSource = Partial<Pick<AppSettings, 'provider' | 'apiKey' | 'baseUrl'>> | OpenAIConfigOverride | null | undefined;

export function sanitizeOpenAIConfig(source?: OpenAIConfigSource) {
  const provider = source?.provider?.trim() || DEFAULT_OPENAI_PROVIDER;
  const apiKey = source?.apiKey?.trim() || '';
  const baseUrl = source?.baseUrl?.trim() ? normalizeOpenAIBaseUrl(source.baseUrl) : '';

  return {
    provider,
    apiKey,
    baseUrl,
  };
}

export function getOpenAIConfigOverride(source?: OpenAIConfigSource): OpenAIConfigOverride {
  const config = sanitizeOpenAIConfig(source);

  return {
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  };
}
