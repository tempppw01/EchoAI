'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Brain, ChevronDown, ChevronUp, ExternalLink, History, Minus, RefreshCw, Search, Star, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestOpenAICompatible } from '@/lib/openai-compatible';
import { enrichTrendItemsWithHistory, findDroppedHistoricalTrends, formatTrendHistoryLabel, getTrendRankMovement, summarizeKeywordMomentum } from '@/lib/trend-utils';
import { DouyinKeywordSuggestion, DouyinTrendItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';
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

function TrendMovementBadge({ item }: { item: DouyinTrendItem }) {
  const movement = getTrendRankMovement(item);

  if (movement.type === 'up') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-300" title={`较上次上升 ${movement.delta} 位`}>
        <ArrowUpRight size={11} />
        升{movement.delta}
      </span>
    );
  }

  if (movement.type === 'down') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-300" title={`较上次下降 ${movement.delta} 位`}>
        <ArrowDownRight size={11} />
        降{movement.delta}
      </span>
    );
  }

  if (movement.type === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground" title="排名与上次相同">
        <Minus size={11} />
        持平
      </span>
    );
  }

  return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">新进</span>;
}

export function DouyinTrendHistoryPage() {
  const { snapshots, keywordWatches, addSnapshot, deleteSnapshot, clearSnapshots, followKeyword, unfollowKeyword, addKeywordSnapshot } = useTrendStore();
  const { settings } = useSettingsStore();
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | undefined>();
  const [activeWatchId, setActiveWatchId] = useState<string | undefined>();
  const [snapshotsCollapsed, setSnapshotsCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordStatus, setKeywordStatus] = useState('');
  const [keywordResult, setKeywordResult] = useState<{
    keyword: string;
    source: string;
    fetchedAt: string;
    suggestions: DouyinKeywordSuggestion[];
    longTailSuggestions: DouyinKeywordSuggestion[];
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [industryAnalysis, setIndustryAnalysis] = useState('');

  const activeSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === activeSnapshotId) || snapshots[0],
    [activeSnapshotId, snapshots],
  );
  const activeSnapshotItems = useMemo(() => {
    if (!activeSnapshot) return [];
    const activeIndex = snapshots.findIndex((snapshot) => snapshot.id === activeSnapshot.id);
    return enrichTrendItemsWithHistory(activeSnapshot.items, activeIndex >= 0 ? snapshots.slice(activeIndex + 1) : []);
  }, [activeSnapshot, snapshots]);
  const activeSnapshotPreviousSnapshots = useMemo(() => {
    if (!activeSnapshot) return [];
    const activeIndex = snapshots.findIndex((snapshot) => snapshot.id === activeSnapshot.id);
    return activeIndex >= 0 ? snapshots.slice(activeIndex + 1) : [];
  }, [activeSnapshot, snapshots]);
  const droppedHistoricalItems = useMemo(
    () => findDroppedHistoricalTrends(activeSnapshotItems, activeSnapshotPreviousSnapshots),
    [activeSnapshotItems, activeSnapshotPreviousSnapshots],
  );
  const activeWatch = useMemo(
    () => keywordWatches.find((watch) => watch.id === activeWatchId) || keywordWatches[0],
    [activeWatchId, keywordWatches],
  );
  const visibleSnapshots = snapshotsCollapsed ? snapshots.slice(0, 3) : snapshots;
  const latestKeywordSnapshot = activeWatch?.snapshots[0];
  const previousKeywordSnapshot = activeWatch?.snapshots[1];
  const watchedKeywordMomentum = useMemo(
    () => summarizeKeywordMomentum(latestKeywordSnapshot?.suggestions || [], previousKeywordSnapshot?.suggestions || []),
    [latestKeywordSnapshot, previousKeywordSnapshot],
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
      const items = enrichTrendItemsWithHistory(data.items || [], snapshots);
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

  const fetchKeywordSuggestions = async (targetKeyword = keywordInput.trim(), saveToWatch = false) => {
    if (keywordLoading) return;
    const keyword = targetKeyword.trim();
    if (!keyword) {
      setKeywordStatus('先输入一个关键词，例如：金属卡板、CNC加工、仓储货架。');
      return;
    }

    setKeywordLoading(true);
    setKeywordStatus('');

    try {
      const response = await fetch(`/api/trends/douyin/suggest?keyword=${encodeURIComponent(keyword)}`, { method: 'GET', cache: 'no-store' });
      const data = (await response.json()) as {
        keyword?: string;
        source?: string;
        fetchedAt?: string;
        suggestions?: DouyinKeywordSuggestion[];
        longTailSuggestions?: DouyinKeywordSuggestion[];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error || '关键词联想抓取失败');

      const result = {
        keyword: data.keyword || keyword,
        source: data.source || '抖音搜索联想',
        fetchedAt: data.fetchedAt || new Date().toISOString(),
        suggestions: data.suggestions || [],
        longTailSuggestions: data.longTailSuggestions || [],
      };
      setKeywordResult(result);

      if (saveToWatch) {
        followKeyword(result.keyword);
        addKeywordSnapshot(result);
        setKeywordStatus(`已更新“${result.keyword}”的联想趋势。`);
      } else {
        setKeywordStatus(`已抓取 ${result.suggestions.length} 个拓展词，长尾词 ${result.longTailSuggestions.length} 个。`);
      }
    } catch (error) {
      setKeywordStatus(error instanceof Error ? error.message : '关键词联想抓取失败');
    } finally {
      setKeywordLoading(false);
    }
  };

  const followCurrentKeyword = () => {
    const keyword = keywordResult?.keyword || keywordInput.trim();
    if (!keyword) {
      setKeywordStatus('先输入或抓取一个关键词再关注。');
      return;
    }

    followKeyword(keyword);
    if (keywordResult) addKeywordSnapshot(keywordResult);
    setKeywordInput(keyword);
    setKeywordStatus(`已关注关键词：${keyword}`);
  };

  const analyzeActiveSnapshot = async () => {
    if (!activeSnapshot || analysisLoading) return;
    setAnalysisLoading(true);
    setIndustryAnalysis('');

    try {
      const trendLines = activeSnapshotItems
        .slice(0, 40)
        .map((item, index) => `TOP${item.rank ?? index + 1} ${item.title} ${item.hot ? `热度${item.hot}` : ''} ${formatTrendHistoryLabel(item)}`)
        .join('\n');
      const content = await requestOpenAICompatible({
        settings,
        model: settings.defaultTextModel,
        messages: [
          { role: 'system', content: '你是中文短视频趋势分析师。请输出简洁、有行业判断的中文分析，不要编造数据。' },
          {
            role: 'user',
            content: [
              '请分析下面这批抖音热搜词更可能对应哪些行业、内容机会和风险。',
              '输出结构：1. 行业分布 2. 可借势方向 3. 不适合硬蹭的话题 4. 给中小企业/工业品账号的建议。',
              '如果某些词与工业品、制造业、CNC加工、仓储设备无关，请明确说“不建议硬蹭”，但给出可自然转化的表达方式。',
              '',
              trendLines,
            ].join('\n'),
          },
        ],
      });
      setIndustryAnalysis(content);
    } catch (error) {
      setIndustryAnalysis(error instanceof Error ? error.message : 'AI 分析失败，请检查模型设置。');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--surface)))] text-foreground">
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
        <aside className="space-y-3">
          <section className="rounded-3xl border bg-card/78 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-semibold">历史批次</p>
                <p className="mt-0.5 text-xs text-muted-foreground">共 {snapshots.length} 个快照</p>
              </div>
              <div className="flex items-center gap-1">
                {status && <span className="max-w-[120px] truncate text-xs text-muted-foreground">{status}</span>}
                {snapshots.length > 3 && (
                  <Button variant="ghost" size="icon-sm" aria-label={snapshotsCollapsed ? '展开历史批次' : '折叠历史批次'} onClick={() => setSnapshotsCollapsed((value) => !value)}>
                    {snapshotsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {snapshots.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  还没有热搜快照。点击右上角“拉取并保存”，或在内容创作面板里点击“热搜”。
                </div>
              ) : (
                visibleSnapshots.map((snapshot) => (
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
                      {snapshot.items.slice(0, 4).map((item, index) => `TOP${item.rank ?? index + 1} ${item.title}`).join('、')}
                    </p>
                  </button>
                ))
              )}
            </div>
            {snapshots.length > 3 && (
              <button
                type="button"
                className="mt-2 w-full rounded-xl border border-dashed border-border/70 py-2 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                onClick={() => setSnapshotsCollapsed((value) => !value)}
              >
                {snapshotsCollapsed ? `展开全部 ${snapshots.length} 个快照` : '收起历史快照'}
              </button>
            )}
          </section>

          <section className="rounded-3xl border bg-card/78 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-semibold">关键词趋势关注</p>
                <p className="mt-0.5 text-xs text-muted-foreground">抓取搜索联想、长尾词和关注词变化。</p>
              </div>
              <Search size={16} className="text-primary" />
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                className="h-9"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') fetchKeywordSuggestions();
                }}
                placeholder="输入关键词，如 CNC加工"
              />
              <Button variant="secondary" size="sm" className="h-9" onClick={() => fetchKeywordSuggestions()} disabled={keywordLoading}>
                <RefreshCw size={13} className={keywordLoading ? 'animate-spin' : ''} />
                抓取
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="tint" size="sm" className="flex-1" onClick={followCurrentKeyword}>
                <Star size={13} />
                关注关键词
              </Button>
              <Button variant="ghost" size="sm" onClick={() => keywordInput && fetchKeywordSuggestions(keywordInput, true)} disabled={keywordLoading || !keywordInput.trim()}>
                更新关注
              </Button>
            </div>
            {keywordStatus && <p className="mt-2 text-xs text-muted-foreground">{keywordStatus}</p>}

            {keywordResult && (
              <div className="mt-3 rounded-2xl border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{keywordResult.keyword}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{keywordResult.suggestions.length} 个词</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{keywordResult.source}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywordResult.suggestions.slice(0, 10).map((item) => (
                    <span key={`${item.keyword}-${item.rank}`} className="rounded-full border border-border/70 bg-card/70 px-2 py-1 text-[11px]">
                      TOP{item.rank} {item.keyword}
                    </span>
                  ))}
                </div>
                {keywordResult.longTailSuggestions.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-[11px] font-medium text-muted-foreground">长尾词</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {keywordResult.longTailSuggestions.slice(0, 12).map((item) => (
                        <span key={`${item.keyword}-${item.rank}`} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                          {item.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {keywordWatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-background/50 px-3 py-4 text-center text-xs text-muted-foreground">
                  还没有关注关键词。
                </div>
              ) : (
                keywordWatches.map((watch) => (
                  <button
                    key={watch.id}
                    type="button"
                    onClick={() => {
                      setActiveWatchId(watch.id);
                      setKeywordInput(watch.keyword);
                    }}
                    className={cn(
                      'w-full rounded-2xl border p-3 text-left transition',
                      activeWatch?.id === watch.id ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border/70 bg-background/55 hover:border-primary/25 hover:bg-primary/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{watch.keyword}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{watch.snapshots.length} 次</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">最近：{formatTime(watch.updatedAt)}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="min-w-0 rounded-3xl border bg-card/78 p-4 shadow-sm">
          {activeWatch && (
            <div className="mb-4 rounded-3xl border border-blue-500/15 bg-blue-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">正在关注：{activeWatch.keyword}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    已记录 {activeWatch.snapshots.length} 次联想快照，最近更新：{formatFullTime(activeWatch.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => fetchKeywordSuggestions(activeWatch.keyword, true)} disabled={keywordLoading}>
                    <RefreshCw size={13} className={keywordLoading ? 'animate-spin' : ''} />
                    刷新趋势
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => unfollowKeyword(activeWatch.id)}>
                    <X size={13} />
                    取消关注
                  </Button>
                </div>
              </div>

              {latestKeywordSnapshot ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border bg-background/65 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">热门联想趋势</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {watchedKeywordMomentum.slice(0, 16).map((item) => (
                        <span key={`${item.keyword}-${item.rank}`} className="rounded-full border border-border/70 bg-card/75 px-2 py-1 text-[11px]">
                          TOP{item.rank} {item.keyword}
                          {item.momentum === 'new' && <span className="ml-1 text-emerald-600">新</span>}
                          {item.momentum === 'up' && <span className="ml-1 text-red-600">升{item.delta}</span>}
                          {item.momentum === 'down' && <span className="ml-1 text-muted-foreground">降{Math.abs(item.delta || 0)}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-background/65 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">长尾词趋势</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {latestKeywordSnapshot.longTailSuggestions.slice(0, 18).map((item) => (
                        <span key={`${item.keyword}-${item.rank}`} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                          {item.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed bg-background/55 px-4 py-5 text-center text-sm text-muted-foreground">
                  这个关键词还没有趋势快照，点击“刷新趋势”后会记录热门联想和长尾词。
                </div>
              )}
            </div>
          )}

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
                <div className="flex flex-wrap gap-2">
                  <Button variant="tint" size="sm" onClick={analyzeActiveSnapshot} disabled={analysisLoading}>
                    <Brain size={14} className={analysisLoading ? 'animate-pulse' : ''} />
                    AI分析行业
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteSnapshot(activeSnapshot.id)}>
                    <Trash2 size={14} />
                    删除快照
                  </Button>
                </div>
              </div>

              {(industryAnalysis || analysisLoading) && (
                <div className="mt-4 rounded-3xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Brain size={15} className="text-primary" />
                    热搜词行业分析
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {analysisLoading ? '正在分析这批热搜的行业分布、借势机会和风险...' : industryAnalysis}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">今日热榜 TOP50</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">搜索链接已放在热搜词标题上，升降按上一次出现排名计算。</p>
                  </div>
                  <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-xs text-muted-foreground">
                    {activeSnapshotItems.length} 条
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {activeSnapshotItems.map((item, index) => (
                    <div
                      key={`${item.title}-${item.hot || ''}-${index}`}
                      className="group rounded-2xl border border-border/70 bg-background/60 p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                          {item.rank ?? index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <a
                            href={getDouyinTrendUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 text-sm font-medium text-foreground transition hover:text-primary hover:underline"
                          >
                            {item.title}
                            <ExternalLink size={11} className="ml-1 inline align-[-1px]" />
                          </a>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <TrendMovementBadge item={item} />
                            {item.hot && <span className="rounded-full bg-muted px-2 py-0.5">热度 {item.hot}</span>}
                            {item.label && <span className="rounded-full bg-muted px-2 py-0.5">{item.label}</span>}
                            <span className={cn('rounded-full px-2 py-0.5', item.seenBefore ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>
                              {formatTrendHistoryLabel(item)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {droppedHistoricalItems.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold">历史热榜</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">曾经进入过热榜，但当前不在这次 TOP50 内；保留最后排名和最后热度。</p>
                    </div>
                    <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-xs text-muted-foreground">
                      {droppedHistoricalItems.length} 条
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {droppedHistoricalItems.map((item, index) => (
                      <div
                        key={`${item.title}-${item.previousSeenAt || ''}-${index}`}
                        className="rounded-2xl border border-dashed border-border/75 bg-background/42 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-xs font-semibold text-muted-foreground">
                            {item.previousRank ?? item.rank ?? index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <a
                              href={getDouyinTrendUrl(item)}
                              target="_blank"
                              rel="noreferrer"
                              className="line-clamp-2 text-sm font-medium text-foreground transition hover:text-primary hover:underline"
                            >
                              {item.title}
                              <ExternalLink size={11} className="ml-1 inline align-[-1px]" />
                            </a>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-0.5">已掉出TOP50</span>
                              {item.previousHot && <span className="rounded-full bg-muted px-2 py-0.5">最后热度 {item.previousHot}</span>}
                              {item.previousRank && <span className="rounded-full bg-muted px-2 py-0.5">最后TOP{item.previousRank}</span>}
                              {item.previousSeenAt && <span className="rounded-full bg-muted px-2 py-0.5">最后出现 {formatTime(item.previousSeenAt)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
