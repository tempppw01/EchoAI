import { getOpenAIConfigOverride } from '@/lib/openai-config';
import { AppSettings, ChatMessage } from '@/lib/types';

type OpenAICompatibleContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

type OpenAICompatibleMessage = {
  role: 'system' | 'user' | 'assistant';
  content: OpenAICompatibleContent;
};

type ChatCompletionChoice = {
  message?: {
    content?: string;
  };
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
};

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

const readResponseError = async (response: Response) => {
  const message = await response.text();
  if (!message) return '';

  try {
    const data = JSON.parse(message) as { error?: string };
    return data.error || message;
  } catch {
    return message;
  }
};

const normalizeClientRequestError = (error: unknown) => {
  const raw = error instanceof Error ? error.message.trim() : '';
  const lower = raw.toLowerCase();

  if (!raw) return '请求失败，请稍后重试';

  if (lower.includes('load failed') || lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return '网络连接失败，请检查当前网络或稍后再试';
  }

  if (lower.includes('aborted')) {
    return '请求已取消';
  }

  return raw;
};

export async function requestOpenAICompatible(params: {
  settings: AppSettings;
  model: string;
  messages: OpenAICompatibleMessage[];
  signal?: AbortSignal;
}) {
  const { settings, model, messages, signal } = params;
  const normalizedMessages = messages.map((message) => ({
    ...message,
    content: message.role === 'user' && typeof message.content === 'string' ? toOpenAIContent(message.content) : message.content,
  }));

  let response: Response;
  try {
    response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: normalizedMessages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: false,
        config: getOpenAIConfigOverride(settings),
      }),
      signal,
    });
  } catch (error) {
    throw new Error(normalizeClientRequestError(error));
  }

  if (!response.ok) {
    const message = await readResponseError(response);
    throw new Error(`请求失败（${response.status}）：${message || '未知错误'}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('模型未返回有效内容');
  }

  return content;
}

export async function requestEmbeddingVector(params: {
  settings: AppSettings;
  model: string;
  input: string;
}) {
  const { settings, model, input } = params;

  let response: Response;
  try {
    response = await fetch('/api/openai/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
        config: getOpenAIConfigOverride(settings),
      }),
    });
  } catch (error) {
    throw new Error(normalizeClientRequestError(error));
  }

  if (!response.ok) {
    const message = await readResponseError(response);
    throw new Error(`嵌入请求失败（${response.status}）：${message || '未知错误'}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  const embedding = data.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('嵌入模型未返回有效向量');
  }

  return embedding;
}

const imageMarkdownPattern = /!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/g;

const toOpenAIContent = (content: string): OpenAICompatibleContent => {
  const images = [...content.matchAll(imageMarkdownPattern)].map((match) => match[2]).filter(Boolean);
  if (images.length === 0) return content;

  const text = content.replace(imageMarkdownPattern, '').trim();
  return [
    ...(text ? [{ type: 'text' as const, text }] : []),
    ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
  ];
};

export const toOpenAIMessages = (messages: ChatMessage[]): OpenAICompatibleMessage[] =>
  messages.map((item) => ({ role: item.role, content: item.role === 'user' ? toOpenAIContent(item.content) : item.content }));
