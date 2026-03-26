import { AppSettings, ChatMessage } from '@/lib/types';

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

export async function requestOpenAICompatible(params: {
  settings: AppSettings;
  model: string;
  messages: OpenAICompatibleMessage[];
}) {
  const { settings, model, messages } = params;

  const response = await fetch('/api/openai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const { model, input } = params;

  const response = await fetch('/api/openai/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

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

export const toOpenAIMessages = (messages: ChatMessage[]): OpenAICompatibleMessage[] =>
  messages.map((item) => ({ role: item.role, content: item.content }));
