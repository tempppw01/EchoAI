import { describe, expect, it } from 'vitest';
import {
  normalizeTrendTitle,
  ensureTrendRanks,
  findPreviousTrendOccurrence,
  enrichTrendItemsWithHistory,
  formatTrendTime,
  formatTrendHistoryLabel,
  getTrendRankMovement,
  findDroppedHistoricalTrends,
  dedupeKeywordSuggestions,
  isLongTailKeyword,
  splitKeywordSuggestions,
  summarizeKeywordMomentum,
} from './trend-utils';
import type { DouyinTrendItem, DouyinTrendSnapshot, DouyinKeywordSuggestion } from './types';

describe('normalizeTrendTitle', () => {
  it('removes special characters and normalizes', () => {
    expect(normalizeTrendTitle('#热搜【标题】')).toBe('热搜标题');
  });

  it('handles various quote marks', () => {
    expect(normalizeTrendTitle("\"测试\" '标题'")).toBe('测试标题');
  });

  it('trims and lowercases', () => {
    expect(normalizeTrendTitle('  ABC测试  ')).toBe('abc测试');
  });

  it('handles empty string', () => {
    expect(normalizeTrendTitle('')).toBe('');
  });

  it('removes brackets and parentheses', () => {
    expect(normalizeTrendTitle('标题（注释）[备注]')).toBe('标题注释备注');
  });
});

describe('ensureTrendRanks', () => {
  it('assigns sequential ranks when missing', () => {
    const items: DouyinTrendItem[] = [
      { title: 'A' },
      { title: 'B' },
      { title: 'C' },
    ];

    const result = ensureTrendRanks(items);
    expect(result).toEqual([
      { title: 'A', rank: 1 },
      { title: 'B', rank: 2 },
      { title: 'C', rank: 3 },
    ]);
  });

  it('preserves existing ranks', () => {
    const items: DouyinTrendItem[] = [
      { title: 'A', rank: 10 },
      { title: 'B', rank: 20 },
    ];

    const result = ensureTrendRanks(items);
    expect(result).toEqual([
      { title: 'A', rank: 10 },
      { title: 'B', rank: 20 },
    ]);
  });

  it('handles empty array', () => {
    expect(ensureTrendRanks([])).toEqual([]);
  });
});

describe('findPreviousTrendOccurrence', () => {
  const snapshots: DouyinTrendSnapshot[] = [
    {
      id: '1',
      source: 'douyin',
      sourceLabel: '抖音热搜',
      fetchedAt: '2024-01-01T10:00:00Z',
      createdAt: '2024-01-01T10:00:00Z',
      items: [
        { title: '热点A', rank: 1, hot: '1000万' },
        { title: '热点B', rank: 2, hot: '800万' },
      ],
    },
    {
      id: '2',
      source: 'douyin',
      sourceLabel: '抖音热搜',
      fetchedAt: '2024-01-01T12:00:00Z',
      createdAt: '2024-01-01T12:00:00Z',
      items: [
        { title: '热点C', rank: 1, hot: '1200万' },
      ],
    },
  ];

  it('finds previous occurrence in history', () => {
    const result = findPreviousTrendOccurrence('热点A', snapshots);
    expect(result).toEqual({
      fetchedAt: '2024-01-01T10:00:00Z',
      rank: 1,
      hot: '1000万',
      sourceLabel: '抖音热搜',
    });
  });

  it('returns undefined when not found', () => {
    const result = findPreviousTrendOccurrence('不存在的热点', snapshots);
    expect(result).toBeUndefined();
  });

  it('handles empty title', () => {
    const result = findPreviousTrendOccurrence('', snapshots);
    expect(result).toBeUndefined();
  });

  it('normalizes title for matching', () => {
    const result = findPreviousTrendOccurrence('【热点A】', snapshots);
    expect(result).toBeDefined();
    expect(result?.rank).toBe(1);
  });
});

describe('enrichTrendItemsWithHistory', () => {
  const snapshots: DouyinTrendSnapshot[] = [
    {
      id: '1',
      source: 'douyin',
      sourceLabel: '抖音热搜',
      fetchedAt: '2024-01-01T10:00:00Z',
      createdAt: '2024-01-01T10:00:00Z',
      items: [
        { title: '老热点', rank: 5, hot: '500万' },
      ],
    },
  ];

  it('enriches items with history when found', () => {
    const items: DouyinTrendItem[] = [
      { title: '老热点', rank: 1, hot: '1000万' },
    ];

    const result = enrichTrendItemsWithHistory(items, snapshots);
    expect(result[0]).toMatchObject({
      title: '老热点',
      rank: 1,
      seenBefore: true,
      previousRank: 5,
      previousHot: '500万',
    });
  });

  it('marks new items as not seen before', () => {
    const items: DouyinTrendItem[] = [
      { title: '新热点', rank: 1 },
    ];

    const result = enrichTrendItemsWithHistory(items, snapshots);
    expect(result[0]).toMatchObject({
      title: '新热点',
      rank: 1,
      seenBefore: false,
    });
  });

  it('handles empty items', () => {
    expect(enrichTrendItemsWithHistory([], snapshots)).toEqual([]);
  });
});

describe('formatTrendTime', () => {
  it('formats valid date string', () => {
    const result = formatTrendTime('2024-01-15T13:30:00Z');
    expect(result).toMatch(/01.*15.*13.*30/);
  });

  it('returns empty string for undefined', () => {
    expect(formatTrendTime(undefined)).toBe('');
  });

  it('returns original string for invalid date', () => {
    expect(formatTrendTime('invalid-date')).toBe('invalid-date');
  });
});

describe('formatTrendHistoryLabel', () => {
  it('formats history label with all details', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      seenBefore: true,
      previousSeenAt: '2024-01-15T13:30:00Z',
      previousRank: 3,
      previousHot: '500万',
    };

    const result = formatTrendHistoryLabel(item);
    expect(result).toContain('上次出现');
    expect(result).toContain('TOP3');
    expect(result).toContain('热度500万');
  });

  it('handles missing history gracefully', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      seenBefore: false,
    };

    const result = formatTrendHistoryLabel(item);
    expect(result).toBe('历史未出现');
  });

  it('works with partial history data', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      seenBefore: true,
      previousRank: 5,
    };

    const result = formatTrendHistoryLabel(item);
    expect(result).toContain('上次出现');
    expect(result).toContain('TOP5');
  });
});

describe('getTrendRankMovement', () => {
  it('detects upward movement', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      rank: 3,
      previousRank: 10,
    };

    const result = getTrendRankMovement(item);
    expect(result).toEqual({ type: 'up', delta: 7 });
  });

  it('detects downward movement', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      rank: 10,
      previousRank: 3,
    };

    const result = getTrendRankMovement(item);
    expect(result).toEqual({ type: 'down', delta: 7 });
  });

  it('detects flat movement', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      rank: 5,
      previousRank: 5,
    };

    const result = getTrendRankMovement(item);
    expect(result).toEqual({ type: 'flat' });
  });

  it('marks as new when no previous rank', () => {
    const item: DouyinTrendItem = {
      title: 'Test',
      rank: 1,
    };

    const result = getTrendRankMovement(item);
    expect(result).toEqual({ type: 'new' });
  });
});

describe('findDroppedHistoricalTrends', () => {
  const previousSnapshots: DouyinTrendSnapshot[] = [
    {
      id: '1',
      source: 'douyin',
      sourceLabel: '抖音热搜',
      fetchedAt: '2024-01-01T10:00:00Z',
      createdAt: '2024-01-01T10:00:00Z',
      items: [
        { title: '热点A', rank: 1 },
        { title: '热点B', rank: 2 },
        { title: '热点C', rank: 3 },
      ],
    },
  ];

  it('finds dropped trends', () => {
    const currentItems: DouyinTrendItem[] = [
      { title: '热点A', rank: 1 },
    ];

    const result = findDroppedHistoricalTrends(currentItems, previousSnapshots);
    expect(result).toHaveLength(2);
    expect(result.map(item => item.title)).toEqual(['热点B', '热点C']);
  });

  it('returns empty when all trends are still present', () => {
    const currentItems: DouyinTrendItem[] = [
      { title: '热点A' },
      { title: '热点B' },
      { title: '热点C' },
    ];

    const result = findDroppedHistoricalTrends(currentItems, previousSnapshots);
    expect(result).toHaveLength(0);
  });

  it('handles empty current items', () => {
    const result = findDroppedHistoricalTrends([], previousSnapshots);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('dedupeKeywordSuggestions', () => {
  it('removes duplicate keywords', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: '测试关键词', rank: 1 },
      { keyword: '测试关键词', rank: 2 },
      { keyword: '另一个关键词', rank: 3 },
    ];

    const result = dedupeKeywordSuggestions(suggestions);
    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe('测试关键词');
    expect(result[1].keyword).toBe('另一个关键词');
  });

  it('normalizes for comparison', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: '测试', rank: 1 },
      { keyword: '【测试】', rank: 2 },
    ];

    const result = dedupeKeywordSuggestions(suggestions);
    expect(result).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(dedupeKeywordSuggestions([])).toEqual([]);
  });
});

describe('isLongTailKeyword', () => {
  it('identifies long keywords as long-tail', () => {
    expect(isLongTailKeyword('这是一个很长的关键词')).toBe(true);
  });

  it('identifies keywords with specific patterns', () => {
    expect(isLongTailKeyword('怎么做')).toBe(true);
    expect(isLongTailKeyword('如何使用')).toBe(true);
    expect(isLongTailKeyword('多少钱')).toBe(true);
    expect(isLongTailKeyword('价格对比')).toBe(true);
  });

  it('returns false for short generic keywords', () => {
    expect(isLongTailKeyword('测试')).toBe(false);
    expect(isLongTailKeyword('关键词')).toBe(false);
  });

  it('handles empty string', () => {
    expect(isLongTailKeyword('')).toBe(false);
  });
});

describe('splitKeywordSuggestions', () => {
  it('splits suggestions into regular and long-tail', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: '短词', rank: 1 },
      { keyword: '这是一个很长的长尾关键词', rank: 2 },
      { keyword: '怎么使用', rank: 3 },
    ];

    const result = splitKeywordSuggestions(suggestions);
    expect(result.suggestions).toHaveLength(3);
    expect(result.longTailSuggestions).toHaveLength(2);
  });

  it('assigns ranks when missing', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: '测试1', rank: 0 },
      { keyword: '测试2', rank: 0 },
    ];

    const result = splitKeywordSuggestions(suggestions);
    expect(result.suggestions[0].rank).toBe(1);
    expect(result.suggestions[1].rank).toBe(2);
  });
});

describe('summarizeKeywordMomentum', () => {
  it('calculates momentum for keywords', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: 'A', rank: 1 },
      { keyword: 'B', rank: 5 },
    ];

    const previous: DouyinKeywordSuggestion[] = [
      { keyword: 'A', rank: 3 },
      { keyword: 'B', rank: 4 },
    ];

    const result = summarizeKeywordMomentum(suggestions, previous);
    expect(result[0].momentum).toBe('up');
    expect(result[0].delta).toBe(2);
    expect(result[1].momentum).toBe('down');
    expect(result[1].delta).toBe(-1);
  });

  it('marks new keywords', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: 'New', rank: 1 },
    ];

    const result = summarizeKeywordMomentum(suggestions, []);
    expect(result[0].momentum).toBe('new');
  });

  it('handles flat momentum', () => {
    const suggestions: DouyinKeywordSuggestion[] = [
      { keyword: 'A', rank: 5 },
    ];

    const previous: DouyinKeywordSuggestion[] = [
      { keyword: 'A', rank: 5 },
    ];

    const result = summarizeKeywordMomentum(suggestions, previous);
    expect(result[0].momentum).toBe('flat');
  });
});
