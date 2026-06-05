import type { DouyinTrendItem, DouyinTrendSnapshot } from '@/lib/types';

export const normalizeTrendTitle = (title: string) =>
  title
    .replace(/[“”"'‘’#【】[\]（）()\s]/g, '')
    .trim()
    .toLowerCase();

export const ensureTrendRanks = (items: DouyinTrendItem[]) =>
  items.map((item, index) => ({
    ...item,
    rank: item.rank ?? index + 1,
  }));

export const findPreviousTrendOccurrence = (
  title: string,
  snapshots: DouyinTrendSnapshot[],
) => {
  const key = normalizeTrendTitle(title);
  if (!key) return undefined;

  for (const snapshot of snapshots) {
    const matchedIndex = snapshot.items.findIndex((item) => normalizeTrendTitle(item.title) === key);
    if (matchedIndex < 0) continue;
    const matched = snapshot.items[matchedIndex];

    return {
      fetchedAt: snapshot.fetchedAt,
      rank: matched.rank ?? matchedIndex + 1,
      hot: matched.hot,
      sourceLabel: snapshot.sourceLabel,
    };
  }

  return undefined;
};

export const enrichTrendItemsWithHistory = (
  items: DouyinTrendItem[],
  snapshots: DouyinTrendSnapshot[],
) =>
  ensureTrendRanks(items).map((item) => {
    const previous = findPreviousTrendOccurrence(item.title, snapshots);

    return {
      ...item,
      seenBefore: Boolean(previous),
      previousSeenAt: previous?.fetchedAt,
      previousRank: previous?.rank,
      previousHot: previous?.hot,
      previousSourceLabel: previous?.sourceLabel,
    };
  });

export const formatTrendTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatTrendHistoryLabel = (item: DouyinTrendItem) => {
  if (!item.seenBefore && !item.previousSeenAt) return '历史未出现';

  const parts = ['上次出现'];
  const time = formatTrendTime(item.previousSeenAt);
  if (time) parts.push(time);
  if (item.previousRank) parts.push(`TOP${item.previousRank}`);
  if (item.previousHot) parts.push(`热度${item.previousHot}`);
  return parts.join(' · ');
};
