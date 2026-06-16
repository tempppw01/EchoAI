import { NextRequest, NextResponse } from 'next/server';
import type { DouyinTrendItem } from '@/lib/types';
import { fetchDouyinTrends } from '@/lib/server/douyin-trends';
import { addTrendSnapshot, clearTrendSnapshots, readTrendSnapshots, trimTrendSnapshots } from '@/lib/server/trend-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function readOptionalBody(request: NextRequest) {
  try {
    return (await request.json()) as {
      source?: string;
      sourceLabel?: string;
      fetchedAt?: string;
      limit?: number;
      items?: DouyinTrendItem[];
    };
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    return NextResponse.json({ snapshots: await readTrendSnapshots() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取热搜快照失败', snapshots: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readOptionalBody(request);
    const payload = Array.isArray(body.items) && body.items.length > 0
      ? body
      : await fetchDouyinTrends();

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: '没有可保存的热搜条目' }, { status: 400 });
    }

    const requestedLimit = Number(body.limit);
    const snapshotLimit = [10, 20, 30].includes(requestedLimit) ? requestedLimit : undefined;

    const result = await addTrendSnapshot({
      source: payload.source || '',
      sourceLabel: payload.sourceLabel || '抖音热搜',
      fetchedAt: payload.fetchedAt,
      limit: snapshotLimit,
      items: payload.items,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存热搜快照失败' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    return NextResponse.json({ snapshots: await clearTrendSnapshots() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '清空热搜快照失败' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readOptionalBody(request);
    const requestedLimit = Number(body.limit);
    if (![10, 20, 30].includes(requestedLimit)) {
      return NextResponse.json({ error: '保留批次数只支持 10、20、30' }, { status: 400 });
    }

    return NextResponse.json({ snapshots: await trimTrendSnapshots(requestedLimit) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '裁剪热搜快照失败' },
      { status: 500 },
    );
  }
}
