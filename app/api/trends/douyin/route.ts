import { NextResponse } from 'next/server';
import { fetchDouyinTrends } from '@/lib/server/douyin-trends';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await fetchDouyinTrends());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '拉取抖音热搜失败', items: [] },
      { status: 502 },
    );
  }
}
