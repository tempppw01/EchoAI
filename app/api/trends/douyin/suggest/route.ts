import { NextRequest, NextResponse } from 'next/server';
import type { DouyinKeywordSuggestion } from '@/lib/types';
import { dedupeKeywordSuggestions, splitKeywordSuggestions } from '@/lib/trend-utils';

export const dynamic = 'force-dynamic';

const DOUYIN_SUGGEST_ENDPOINTS = [
  'https://www.douyin.com/aweme/v1/web/api/suggest/item/',
  'https://www.douyin.com/aweme/v1/web/api/suggest_words/',
];

const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

const flattenRecords = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.data,
    record.words,
    record.suggest_words,
    record.sug_words,
    record.list,
    record.items,
    record.result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      const nestedArray = nested.words || nested.list || nested.data || nested.items;
      if (Array.isArray(nestedArray)) return nestedArray;
    }
  }

  return [];
};

const readKeyword = (item: unknown) => {
  if (typeof item === 'string' || typeof item === 'number') return textOf(item);
  if (!item || typeof item !== 'object') return '';
  const record = item as Record<string, unknown>;
  return textOf(record.word) || textOf(record.keyword) || textOf(record.query) || textOf(record.sentence) || textOf(record.name) || textOf(record.title) || textOf(record.content);
};

const normalizeApiSuggestions = (payload: unknown, source: string): DouyinKeywordSuggestion[] => {
  const suggestions: DouyinKeywordSuggestion[] = [];

  flattenRecords(payload).forEach((item, index) => {
    const keyword = readKeyword(item);
    if (!keyword) return;

    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const scoreText = textOf(record.score) || textOf(record.hot) || textOf(record.weight);
    const score = scoreText ? Number.parseFloat(scoreText.replace(/[^\d.]/g, '')) : undefined;

    suggestions.push({
      keyword,
      rank: index + 1,
      score,
      source,
    });
  });

  return dedupeKeywordSuggestions(suggestions);
};

const fallbackModifiers = [
  '怎么选',
  '多少钱',
  '厂家',
  '避坑',
  '推荐',
  '教程',
  '区别',
  '价格',
  '安装',
  '定制',
  '批发',
  '测评',
  '案例',
  '方案',
  '排行榜',
  '值不值得买',
];

const fallbackSuggestions = (keyword: string): DouyinKeywordSuggestion[] =>
  fallbackModifiers.map((modifier, index) => ({
    keyword: `${keyword}${modifier}`,
    rank: index + 1,
    source: '本地长尾拓展',
    type: 'longTail',
  }));

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword')?.trim() || '';
  if (!keyword) {
    return NextResponse.json({ error: '请输入要拓展的关键词', suggestions: [], longTailSuggestions: [] }, { status: 400 });
  }

  const errors: string[] = [];

  for (const endpoint of DOUYIN_SUGGEST_ENDPOINTS) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set('keyword', keyword);
      url.searchParams.set('query', keyword);
      url.searchParams.set('business_id', '100');
      url.searchParams.set('count', '20');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          Referer: `https://www.douyin.com/search/${encodeURIComponent(keyword)}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        errors.push(`${endpoint}: ${response.status}`);
        continue;
      }

      const text = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        errors.push(`${endpoint}: invalid json`);
        continue;
      }

      const apiSuggestions = normalizeApiSuggestions(payload, '抖音搜索联想');
      if (apiSuggestions.length > 0) {
        const merged = dedupeKeywordSuggestions([...apiSuggestions, ...fallbackSuggestions(keyword)]).map((item, index) => ({ ...item, rank: index + 1 }));
        const split = splitKeywordSuggestions(merged);

        return NextResponse.json({
          keyword,
          source: '抖音搜索联想',
          fetchedAt: new Date().toISOString(),
          suggestions: split.suggestions,
          longTailSuggestions: split.longTailSuggestions,
        });
      }

      errors.push(`${endpoint}: empty`);
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  const fallback = fallbackSuggestions(keyword);
  const split = splitKeywordSuggestions(fallback);

  return NextResponse.json({
    keyword,
    source: `本地长尾拓展（抖音联想暂不可用：${errors.join('；')}）`,
    fetchedAt: new Date().toISOString(),
    suggestions: split.suggestions,
    longTailSuggestions: split.longTailSuggestions,
  });
}
