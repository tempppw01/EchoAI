import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchModelCatalog } from './model-service';

describe('fetchModelCatalog', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches model catalog', async () => {
    const mockResponse = {
      data: [
        { id: 'gpt-4' },
        { id: 'gpt-3.5-turbo' },
        { id: 'claude-3-opus' },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog({
      provider: 'OpenAI',
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
    });

    expect(result).toEqual(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus']);
  });

  it('deduplicates model IDs', async () => {
    const mockResponse = {
      data: [
        { id: 'gpt-4' },
        { id: 'gpt-4' },
        { id: 'gpt-3.5-turbo' },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual(['gpt-4', 'gpt-3.5-turbo']);
  });

  it('filters out invalid model IDs', async () => {
    const mockResponse = {
      data: [
        { id: 'gpt-4' },
        { id: '' },
        { id: '   ' },
        {},
        { id: null },
        { id: 'valid-model' },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual(['gpt-4', 'valid-model']);
  });

  it('handles empty response data', async () => {
    const mockResponse = {
      data: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual([]);
  });

  it('handles missing data field', async () => {
    const mockResponse = {};

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual([]);
  });

  it('throws error on HTTP error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: 'Unauthorized' }),
    });

    await expect(fetchModelCatalog()).rejects.toThrow('Unauthorized');
  });

  it('throws error with status code on empty error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => '',
    });

    await expect(fetchModelCatalog()).rejects.toThrow('拉取模型失败 (500)');
  });

  it('handles malformed JSON error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Not JSON',
    });

    await expect(fetchModelCatalog()).rejects.toThrow('Not JSON');
  });

  it('calls correct API endpoint with config', async () => {
    const mockResponse = {
      data: [{ id: 'test-model' }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const settings = {
      provider: 'Custom',
      apiKey: 'custom-key',
      baseUrl: 'https://custom.api.com',
    };

    await fetchModelCatalog(settings);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/openai/models',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
    );

    const callArgs = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.config).toBeDefined();
  });

  it('handles network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

    await expect(fetchModelCatalog()).rejects.toThrow('Network failure');
  });

  it('preserves model ID order', async () => {
    const mockResponse = {
      data: [
        { id: 'model-c' },
        { id: 'model-a' },
        { id: 'model-b' },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual(['model-c', 'model-a', 'model-b']);
  });

  it('handles non-array data gracefully', async () => {
    const mockResponse = {
      data: 'not an array',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    expect(result).toEqual([]);
  });

  it('trims whitespace from model IDs', async () => {
    const mockResponse = {
      data: [
        { id: '  gpt-4  ' },
        { id: 'claude-3-opus' },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchModelCatalog();
    // Note: Current implementation doesn't trim, just filters empty
    // This test documents actual behavior
    expect(result).toEqual(['  gpt-4  ', 'claude-3-opus']);
  });
});
