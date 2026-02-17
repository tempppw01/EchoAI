const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const normalizeOpenAIBaseUrl = (baseUrl?: string) => {
  const trimmed = (baseUrl || '').trim();
  if (!trimmed) return DEFAULT_OPENAI_BASE_URL;

  const noTrailingSlash = stripTrailingSlash(trimmed);
  const withoutCompletionsPath = noTrailingSlash.replace(/\/(chat\/completions|models)$/i, '');

  if (/\/v\d+(\/|$)/i.test(withoutCompletionsPath)) {
    return withoutCompletionsPath;
  }

  return `${withoutCompletionsPath}/v1`;
};
