import { DEFAULT_OPENAI_PROVIDER, sanitizeOpenAIConfig } from '@/lib/openai-config';
import { normalizeOpenAIBaseUrl } from '@/lib/openai-endpoint';
import { OpenAIConfigOverride } from '@/lib/types';

const resolveBaseUrl = () => {
  const explicitBaseUrl = process.env.OPENAI_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeOpenAIBaseUrl(explicitBaseUrl);
  }

  const legacyApiUrl = process.env.API_URL?.trim();
  if (legacyApiUrl) {
    return normalizeOpenAIBaseUrl(legacyApiUrl);
  }

  return normalizeOpenAIBaseUrl(undefined);
};

export function getServerOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.API_KEY?.trim();

  if (!apiKey) {
    throw new Error('未检测到可用的 API Key，请先填写前端 API Key，或在服务端配置 OPENAI_API_KEY / API_KEY');
  }

  return {
    provider: DEFAULT_OPENAI_PROVIDER,
    apiKey,
    baseUrl: resolveBaseUrl(),
  };
}

export function resolveOpenAIProxyConfig(override?: OpenAIConfigOverride) {
  const normalizedOverride = sanitizeOpenAIConfig(override);

  if (normalizedOverride.apiKey) {
    return {
      provider: normalizedOverride.provider,
      apiKey: normalizedOverride.apiKey,
      baseUrl: normalizedOverride.baseUrl || resolveBaseUrl(),
      source: 'client' as const,
    };
  }

  const serverConfig = getServerOpenAIConfig();

  return {
    ...serverConfig,
    source: 'server' as const,
  };
}

export async function readUpstreamError(response: Response) {
  try {
    const raw = (await response.text()).trim();
    if (!raw) return '';

    try {
      const data = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
      if (typeof data.error === 'string') return data.error;
      if (typeof data.error?.message === 'string') return data.error.message;
      if (typeof data.message === 'string') return data.message;
    } catch {
      return raw;
    }

    return raw;
  } catch {
    return '';
  }
}
