import { NextRequest, NextResponse } from 'next/server';
import { getServerOpenAIConfig, readUpstreamError } from '@/lib/server/openai-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { apiKey, baseUrl } = getServerOpenAIConfig();

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const message = await readUpstreamError(upstream);
      return NextResponse.json(
        { error: message || `上游请求失败（${upstream.status}）` },
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
