export async function fetcher<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const mockModels = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: '文本', desc: '通用对话，成本低，速度快' },
  { id: 'gpt-4.1', name: 'GPT-4.1', type: '文本', desc: '复杂推理，成本中，速度中' },
  { id: 'gpt-image-1', name: 'GPT Image 1', type: '图片', desc: '高质量绘图，成本中，速度中' },
];
