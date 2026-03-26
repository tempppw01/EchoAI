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

export async function fetchModelCatalog(): Promise<string[]> {
  const response = await fetch('/api/openai/models', {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await readResponseError(response);
    throw new Error(message || `拉取模型失败 (${response.status})`);
  }

  const data = await response.json() as { data?: Array<{ id?: string }> };
  const ids: string[] = Array.isArray(data?.data)
    ? data.data
      .map((item) => item?.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  return [...new Set<string>(ids)];
}
