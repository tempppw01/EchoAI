import { NextResponse } from 'next/server';
import { deleteTrendSnapshot } from '@/lib/server/trend-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ snapshots: await deleteTrendSnapshot(params.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除热搜快照失败' },
      { status: 500 },
    );
  }
}
