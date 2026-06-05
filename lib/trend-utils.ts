import type { DouyinKeywordSuggestion, DouyinTrendItem, DouyinTrendSnapshot } from '@/lib/types';

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

export const dedupeKeywordSuggestions = (suggestions: DouyinKeywordSuggestion[]) => {
  const seen = new Set<string>();

  return suggestions.filter((item) => {
    const key = normalizeTrendTitle(item.keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const isLongTailKeyword = (keyword: string) => {
  const normalized = keyword.trim();
  return normalized.length >= 8 || /怎么|如何|哪里|多少钱|厂家|价格|推荐|教程|区别|避坑|测评|排行榜|安装|定制|批发|维修|方案|案例/.test(normalized);
};

export const splitKeywordSuggestions = (suggestions: DouyinKeywordSuggestion[]) => {
  const ranked = dedupeKeywordSuggestions(suggestions).map((item, index) => ({
    ...item,
    rank: item.rank || index + 1,
    type: item.type || (isLongTailKeyword(item.keyword) ? 'longTail' : 'suggestion'),
  }));

  return {
    suggestions: ranked,
    longTailSuggestions: ranked.filter((item) => item.type === 'longTail' || isLongTailKeyword(item.keyword)),
  };
};

export const summarizeKeywordMomentum = (suggestions: DouyinKeywordSuggestion[], previous: DouyinKeywordSuggestion[] = []) => {
  const previousMap = new Map(previous.map((item) => [normalizeTrendTitle(item.keyword), item.rank]));

  return suggestions.map((item) => {
    const key = normalizeTrendTitle(item.keyword);
    const previousRank = previousMap.get(key);
    const delta = previousRank ? previousRank - item.rank : undefined;

    return {
      ...item,
      previousRank,
      delta,
      momentum: previousRank ? (delta && delta > 0 ? 'up' : delta && delta < 0 ? 'down' : 'flat') : 'new',
    };
  });
};
