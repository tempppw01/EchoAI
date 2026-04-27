import { NextResponse } from 'next/server';
import { OpenAIConfigOverride } from '@/lib/types';
import { readUpstreamError, resolveOpenAIProxyConfig } from '@/lib/server/openai-proxy';

export const dynamic = 'force-dynamic';

const requestModels = async (config?: OpenAIConfigOverride) => {
  try {
    const { apiKey, baseUrl } = resolveOpenAIProxyConfig(config);

    const upstream = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const message = await readUpstreamError(upstream);
      return NextResponse.json(
        { error: message || `模型列表拉取失败（${upstream.status}）` },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export async function GET() {
  return requestModels();
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { config?: OpenAIConfigOverride };
  return requestModels(payload.config);
}
