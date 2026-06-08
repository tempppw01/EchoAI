import { NextRequest, NextResponse } from 'next/server';
import { fetchDouyinTrends } from '@/lib/server/douyin-trends';
import { addTrendSnapshot } from '@/lib/server/trend-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const isAuthorized = (request: NextRequest) => {
  const secret = process.env.TREND_CRON_SECRET?.trim();
  if (!secret) return true;

  const urlSecret = request.nextUrl.searchParams.get('secret')?.trim();
  const header = request.headers.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  return urlSecret === secret || bearer === secret;
};

async function saveLatestSnapshot(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '定时任务密钥不正确' }, { status: 401 });
  }

  try {
    const fetched = await fetchDouyinTrends();
    const result = await addTrendSnapshot(fetched);

    return NextResponse.json({
      ok: true,
      snapshotId: result.snapshot.id,
      savedCount: result.snapshot.items.length,
      fetchedAt: result.snapshot.fetchedAt,
      totalSnapshots: result.snapshots.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '定时保存热搜失败' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return saveLatestSnapshot(request);
}

export async function POST(request: NextRequest) {
  return saveLatestSnapshot(request);
}
