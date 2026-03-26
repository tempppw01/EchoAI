import { normalizeOpenAIBaseUrl } from '@/lib/openai-endpoint';

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
    throw new Error('服务器未配置 OPENAI_API_KEY 或 API_KEY');
  }

  return {
    apiKey,
    baseUrl: resolveBaseUrl(),
  };
}

export async function readUpstreamError(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return '';
  }
}
