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

const ensureBaseUrl = (baseUrl?: string) => {
  const trimmed = (baseUrl || '').trim();
  if (!trimmed) return 'https://api.openai.com/v1';
  return trimmed.replace(/\/$/, '');
};

export async function requestOpenAICompatible(params: {
  settings: AppSettings;
  model: string;
  messages: OpenAICompatibleMessage[];
}) {
  const { settings, model, messages } = params;
  const url = `${ensureBaseUrl(settings.baseUrl)}/chat/completions`;
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

export const toOpenAIMessages = (messages: ChatMessage[]): OpenAICompatibleMessage[] =>
  messages.map((item) => ({ role: item.role, content: item.content }));

