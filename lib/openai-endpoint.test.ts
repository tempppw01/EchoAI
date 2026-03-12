import { describe, expect, it } from 'vitest';
import { normalizeOpenAIBaseUrl } from './openai-endpoint';

describe('normalizeOpenAIBaseUrl', () => {
  it('returns default when empty', () => {
    expect(normalizeOpenAIBaseUrl('')).toBe('https://ai.shuaihong.fun/v1');
    expect(normalizeOpenAIBaseUrl(undefined)).toBe('https://ai.shuaihong.fun/v1');
  });

  it('appends /v1 when missing version path', () => {
    expect(normalizeOpenAIBaseUrl('https://example.com')).toBe('https://example.com/v1');
    expect(normalizeOpenAIBaseUrl('https://example.com/')).toBe('https://example.com/v1');
  });

  it('keeps existing /v1', () => {
    expect(normalizeOpenAIBaseUrl('https://example.com/v1')).toBe('https://example.com/v1');
    expect(normalizeOpenAIBaseUrl('https://example.com/v1/')).toBe('https://example.com/v1');
  });

  it('strips /chat/completions and /models then normalizes', () => {
    expect(normalizeOpenAIBaseUrl('https://example.com/v1/chat/completions')).toBe('https://example.com/v1');
    expect(normalizeOpenAIBaseUrl('https://example.com/v1/models')).toBe('https://example.com/v1');

    expect(normalizeOpenAIBaseUrl('https://example.com/chat/completions')).toBe('https://example.com/v1');
    expect(normalizeOpenAIBaseUrl('https://example.com/models')).toBe('https://example.com/v1');
  });
});
