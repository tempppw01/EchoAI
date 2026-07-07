import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { toOpenAIMessages, requestOpenAICompatible, requestEmbeddingVector } from './openai-compatible';
import type { AppSettings, ChatMessage } from './types';

const mockSettings: AppSettings = {
  defaultTextModel: 'gpt-4',
  defaultImageModel: 'dall-e-3',
  defaultEmbeddingModel: 'text-embedding-3-small',
  rerankEnabled: false,
  rerankModel: '',
  rerankTopK: 3,
  temperature: 0.7,
  maxTokens: 2048,
  stream: false,
  provider: 'OpenAI',
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  webdavUrl: '',
  webdavUsername: '',
  autoSyncMinutes: 30,
  showTokenUsage: false,
  sampleRecallTopK: 3,
  modelCatalog: [],
};

describe('toOpenAIMessages', () => {
  it('maps internal ChatMessage to OpenAI-compatible message format', () => {
    const input = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ] as const;

    expect(toOpenAIMessages(input as any)).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ]);
  });

  it('converts user message with image markdown to multimodal content', () => {
    const input: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Look at this: ![alt](data:image/png;base64,abc123)',
        createdAt: '2024-01-01',
      },
    ];

    const result = toOpenAIMessages(input);
    expect(result[0].content).toEqual([
      { type: 'text', text: 'Look at this:' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
    ]);
  });

  it('handles multiple images in user message', () => {
    const input: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'First ![](data:image/png;base64,img1) and second ![](data:image/jpeg;base64,img2)',
        createdAt: '2024-01-01',
      },
    ];

    const result = toOpenAIMessages(input);
    expect(result[0].content).toEqual([
      { type: 'text', text: 'First  and second' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,img1' } },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,img2' } },
    ]);
  });

  it('keeps assistant messages as plain text', () => {
    const input: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'This has ![](data:image/png;base64,test) but stays text',
        createdAt: '2024-01-01',
      },
    ];

    const result = toOpenAIMessages(input);
    expect(result[0].content).toBe('This has ![](data:image/png;base64,test) but stays text');
  });

  it('handles empty message array', () => {
    expect(toOpenAIMessages([])).toEqual([]);
  });
});

describe('requestOpenAICompatible', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully requests chat completion', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Test response' } }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await requestOpenAICompatible({
      settings: mockSettings,
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toBe('Test response');
    expect(global.fetch).toHaveBeenCalledWith('/api/openai/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('throws error on network failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(
      requestOpenAICompatible({
        settings: mockSettings,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('网络连接失败，请检查当前网络或稍后再试');
  });

  it('handles HTTP error responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'Internal server error' }),
    });

    await expect(
      requestOpenAICompatible({
        settings: mockSettings,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('请求失败（500）：Internal server error');
  });

  it('throws error when response has no content', async () => {
    const mockResponse = {
      choices: [{ message: { content: '' } }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      requestOpenAICompatible({
        settings: mockSettings,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('模型未返回有效内容');
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    
    (global.fetch as any).mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
    });

    await expect(
      requestOpenAICompatible({
        settings: mockSettings,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        signal: controller.signal,
      })
    ).rejects.toThrow('请求已取消');
  });

  it('handles malformed JSON error response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Not JSON',
    });

    await expect(
      requestOpenAICompatible({
        settings: mockSettings,
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('请求失败（400）：Not JSON');
  });
});

describe('requestEmbeddingVector', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully requests embedding vector', async () => {
    const mockResponse = {
      data: [{ embedding: [0.1, 0.2, 0.3, 0.4] }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await requestEmbeddingVector({
      settings: mockSettings,
      model: 'text-embedding-3-small',
      input: 'test text',
    });

    expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(global.fetch).toHaveBeenCalledWith('/api/openai/embeddings', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('throws error on network failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      requestEmbeddingVector({
        settings: mockSettings,
        model: 'text-embedding-3-small',
        input: 'test',
      })
    ).rejects.toThrow('网络连接失败，请检查当前网络或稍后再试');
  });

  it('handles HTTP error responses', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: 'Invalid API key' }),
    });

    await expect(
      requestEmbeddingVector({
        settings: mockSettings,
        model: 'text-embedding-3-small',
        input: 'test',
      })
    ).rejects.toThrow('嵌入请求失败（401）：Invalid API key');
  });

  it('throws error when embedding is empty', async () => {
    const mockResponse = {
      data: [{ embedding: [] }],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      requestEmbeddingVector({
        settings: mockSettings,
        model: 'text-embedding-3-small',
        input: 'test',
      })
    ).rejects.toThrow('嵌入模型未返回有效向量');
  });

  it('throws error when response has no data', async () => {
    const mockResponse = { data: [] };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(
      requestEmbeddingVector({
        settings: mockSettings,
        model: 'text-embedding-3-small',
        input: 'test',
      })
    ).rejects.toThrow('嵌入模型未返回有效向量');
  });
});
