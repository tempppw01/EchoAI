import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { DouyinTrendItem, DouyinTrendSnapshot } from '@/lib/types';
import { enrichTrendItemsWithHistory, ensureTrendRanks } from '@/lib/trend-utils';

const MAX_SNAPSHOTS = 80;

const getSnapshotFilePath = () => {
  const configured = process.env.TREND_SNAPSHOT_FILE?.trim();
  if (!configured) return path.join(process.cwd(), 'data', 'douyin-trend-snapshots.json');
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
};

const now = () => new Date().toISOString();

const normalizeSnapshot = (snapshot: Partial<DouyinTrendSnapshot>): DouyinTrendSnapshot | null => {
  if (!Array.isArray(snapshot.items)) return null;

  return {
    id: typeof snapshot.id === 'string' && snapshot.id ? snapshot.id : randomUUID(),
    source: typeof snapshot.source === 'string' ? snapshot.source : '',
    sourceLabel: typeof snapshot.sourceLabel === 'string' && snapshot.sourceLabel ? snapshot.sourceLabel : '抖音热搜',
    fetchedAt: typeof snapshot.fetchedAt === 'string' && snapshot.fetchedAt ? snapshot.fetchedAt : now(),
    createdAt: typeof snapshot.createdAt === 'string' && snapshot.createdAt ? snapshot.createdAt : now(),
    items: ensureTrendRanks(snapshot.items.filter((item): item is DouyinTrendItem => Boolean(item?.title))),
  };
};

const parseSnapshots = (raw: string) => {
  const payload = JSON.parse(raw) as unknown;
  const snapshots = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { snapshots?: unknown }).snapshots)
      ? (payload as { snapshots: unknown[] }).snapshots
      : [];

  return snapshots
    .map((snapshot) => normalizeSnapshot(snapshot as Partial<DouyinTrendSnapshot>))
    .filter((snapshot): snapshot is DouyinTrendSnapshot => Boolean(snapshot));
};

export async function readTrendSnapshots() {
  try {
    const raw = await readFile(getSnapshotFilePath(), 'utf8');
    return parseSnapshots(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeTrendSnapshots(snapshots: DouyinTrendSnapshot[], limit?: number) {
  const filePath = getSnapshotFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const normalized = snapshots
    .map((snapshot) => normalizeSnapshot(snapshot))
    .filter((snapshot): snapshot is DouyinTrendSnapshot => Boolean(snapshot))
    .slice(0, limit ?? MAX_SNAPSHOTS);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await writeFile(tempPath, `${JSON.stringify({ snapshots: normalized }, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}

export async function addTrendSnapshot(payload: {
  source?: string;
  sourceLabel?: string;
  fetchedAt?: string;
  limit?: number;
  items: DouyinTrendItem[];
}) {
  const snapshots = await readTrendSnapshots();
  const snapshot: DouyinTrendSnapshot = {
    id: randomUUID(),
    source: payload.source || '',
    sourceLabel: payload.sourceLabel || '抖音热搜',
    fetchedAt: payload.fetchedAt || now(),
    createdAt: now(),
    items: enrichTrendItemsWithHistory(payload.items, snapshots),
  };
  const maxCap = typeof payload.limit === 'number' && payload.limit > 0 ? payload.limit : MAX_SNAPSHOTS;
  const nextSnapshots = [snapshot, ...snapshots].slice(0, maxCap);
  await writeTrendSnapshots(nextSnapshots, maxCap);

  return { snapshot, snapshots: nextSnapshots };
}

export async function deleteTrendSnapshot(id: string) {
  const snapshots = await readTrendSnapshots();
  const nextSnapshots = snapshots.filter((snapshot) => snapshot.id !== id);
  await writeTrendSnapshots(nextSnapshots);
  return nextSnapshots;
}

export async function trimTrendSnapshots(limit: number) {
  const snapshots = await readTrendSnapshots();
  const maxCap = limit > 0 ? limit : MAX_SNAPSHOTS;
  const nextSnapshots = snapshots.slice(0, maxCap);
  await writeTrendSnapshots(nextSnapshots, maxCap);
  return nextSnapshots;
}

export async function clearTrendSnapshots() {
  await writeTrendSnapshots([]);
  return [];
}
