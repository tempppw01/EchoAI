import { NextResponse } from 'next/server';
import { getServerOpenAIConfig, readUpstreamError } from '@/lib/server/openai-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { apiKey, baseUrl } = getServerOpenAIConfig();

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
}
