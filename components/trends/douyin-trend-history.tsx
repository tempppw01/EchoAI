'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, History, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DouyinTrendItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getDouyinTrendUrl, useTrendStore } from '@/stores/trend-store';

const formatTime = (value?: string) => {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatFullTime = (value?: string) => {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export function DouyinTrendHistoryPage() {
  const { snapshots, addSnapshot, deleteSnapshot, clearSnapshots } = useTrendStore();
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const activeSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === activeSnapshotId) || snapshots[0],
    [activeSnapshotId, snapshots],
  );

  const fetchAndSave = async () => {
    if (loading) return;
    setLoading(true);
    setStatus('');

    try {
      const response = await fetch('/api/trends/douyin', { method: 'GET', cache: 'no-store' });
      const data = (await response.json()) as {
        items?: DouyinTrendItem[];
        error?: string;
        source?: string;
        sourceLabel?: string;
        fetchedAt?: string;
      };

      if (!response.ok) throw new Error(data.error || '拉取抖音热搜失败');
      const items = data.items || [];
      if (items.length === 0) {
        setStatus('这次没有拉取到热搜条目，未生成新快照。');
        return;
      }

      const snapshot = addSnapshot({
        source: data.source || '',
        sourceLabel: data.sourceLabel || '抖音热搜',
        fetchedAt: data.fetchedAt,
        items,
      });
      setActiveSnapshotId(snapshot.id);
      setStatus(`已保存 ${items.length} 条热搜快照。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '拉取抖音热搜失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="返回聊天"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <History size={16} className="text-primary" />
                抖音热搜历史快照
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">记录每次拉取的完整榜单，用于回看选题窗口和内容借势。</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchAndSave} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              拉取并保存
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSnapshots} disabled={snapshots.length === 0}>
              清空
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border bg-card/78 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-sm font-semibold">历史批次</p>
              <p className="mt-0.5 text-xs text-muted-foreground">共 {snapshots.length} 个快照</p>
            </div>
            {status && <span className="max-w-[160px] truncate text-xs text-muted-foreground">{status}</span>}
          </div>

          <div className="mt-3 max-h-[calc(100vh-168px)] space-y-2 overflow-y-auto pr-1">
            {snapshots.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
                还没有热搜快照。点击右上角“拉取并保存”，或在内容创作面板里点击“热搜”。
              </div>
            ) : (
              snapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  onClick={() => setActiveSnapshotId(snapshot.id)}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left transition',
                    activeSnapshot?.id === snapshot.id
                      ? 'border-primary/35 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/70 bg-background/55 text-foreground hover:border-primary/25 hover:bg-primary/5',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{snapshot.sourceLabel}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{snapshot.items.length} 条</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTime(snapshot.fetchedAt)}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {snapshot.items.slice(0, 4).map((item) => item.title).join('、')}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0 rounded-3xl border bg-card/78 p-4 shadow-sm">
          {activeSnapshot ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold">{activeSnapshot.sourceLabel}</h1>
                    <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-xs text-muted-foreground">
                      {activeSnapshot.items.length} 条
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">拉取时间：{formatFullTime(activeSnapshot.fetchedAt)}</p>
                  {activeSnapshot.source && (
                    <a
                      href={activeSnapshot.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      打开榜单来源
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteSnapshot(activeSnapshot.id)}>
                  <Trash2 size={14} />
                  删除快照
                </Button>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {activeSnapshot.items.map((item, index) => (
                  <a
                    key={`${item.title}-${item.hot || ''}-${index}`}
                    href={getDouyinTrendUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-2xl border border-border/70 bg-background/60 p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          {item.hot && <span className="rounded-full bg-muted px-2 py-0.5">热度 {item.hot}</span>}
                          {item.label && <span className="rounded-full bg-muted px-2 py-0.5">{item.label}</span>}
                          <span className="inline-flex items-center gap-1 text-primary">
                            打开
                            <ExternalLink size={11} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed bg-background/55 px-6 text-center">
              <History size={34} className="text-muted-foreground" />
              <h1 className="mt-4 text-xl font-semibold">还没有抖音热搜历史</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                点击“拉取并保存”后会记录完整榜单。之后在内容创作里拉取热搜，也会自动写入这里。
              </p>
              <Button className="mt-5" onClick={fetchAndSave} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                拉取第一份快照
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
