import { AppSettings, ChatMessage } from '@/lib/types';
import { normalizeOpenAIBaseUrl } from '@/lib/openai-endpoint';

type OpenAICompatibleMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

export async function requestOpenAICompatible(params: {
  settings: AppSettings;
  model: string;
  messages: OpenAICompatibleMessage[];
}) {
  const { settings, model, messages } = params;
  const url = `${normalizeOpenAIBaseUrl(settings.baseUrl)}/chat/completions`;
  const apiKey = settings.apiKey?.trim();

  if (!apiKey) {
    throw new Error('请先在设置中心填写 API Key');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
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
  const apiKey = settings.apiKey?.trim();
  if (!apiKey) {
    throw new Error('请先在设置中心填写 API Key');
  }

  const url = `${normalizeOpenAIBaseUrl(settings.baseUrl)}/embeddings`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`嵌入请求失败（${response.status}）：${message || '未知错误'}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  const embedding = data.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('嵌入模型未返回有效向量');
  }

  return embedding;
}

export const toOpenAIMessages = (messages: ChatMessage[]): OpenAICompatibleMessage[] =>
  messages.map((item) => ({ role: item.role, content: item.content }));
