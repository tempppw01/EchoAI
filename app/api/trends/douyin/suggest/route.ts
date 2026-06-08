import { NextRequest, NextResponse } from 'next/server';
import type { DouyinKeywordSuggestion } from '@/lib/types';
import { dedupeKeywordSuggestions, splitKeywordSuggestions } from '@/lib/trend-utils';

export const dynamic = 'force-dynamic';

const DOUYIN_SUGGEST_ENDPOINTS = [
  'https://www.douyin.com/aweme/v1/web/api/suggest/item/',
  'https://www.douyin.com/aweme/v1/web/api/suggest_words/',
];

const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

const parseJsonpArray = (text: string) => {
  const match = text.match(/s\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (!match) return [];

  try {
    const value = JSON.parse(match[1]);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

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

const normalizeWords = (words: string[], source: string): DouyinKeywordSuggestion[] =>
  dedupeKeywordSuggestions(
    words
      .map((word) => word.trim())
      .filter(Boolean)
      .map((keyword, index) => ({
        keyword,
        rank: index + 1,
        source,
      })),
  );

const fetchDouyinSuggestions = async (keyword: string, errors: string[]) => {
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
        errors.push(`抖音联想 ${response.status}`);
        continue;
      }

      const text = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        errors.push('抖音联想返回格式异常');
        continue;
      }

      const suggestions = normalizeApiSuggestions(payload, '抖音搜索联想');
      if (suggestions.length > 0) return suggestions;
      errors.push('抖音联想为空');
    } catch (error) {
      errors.push(`抖音联想 ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  return [];
};

const fetchBaiduSuggestions = async (keyword: string, errors: string[]) => {
  try {
    const url = new URL('https://suggestion.baidu.com/su');
    url.searchParams.set('wd', keyword);
    url.searchParams.set('cb', 'callback');
    url.searchParams.set('ie', 'utf-8');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/javascript,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      errors.push(`百度联想 ${response.status}`);
      return [];
    }

    const words = parseJsonpArray(await response.text()).filter((item): item is string => typeof item === 'string');
    return normalizeWords(words, '百度搜索联想');
  } catch (error) {
    errors.push(`百度联想 ${error instanceof Error ? error.message : '未知错误'}`);
    return [];
  }
};

const fetchSo360Suggestions = async (keyword: string, errors: string[]) => {
  try {
    const url = new URL('https://sug.so.360.cn/suggest');
    url.searchParams.set('word', keyword);
    url.searchParams.set('encodein', 'utf-8');
    url.searchParams.set('encodeout', 'utf-8');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      errors.push(`360联想 ${response.status}`);
      return [];
    }

    const payload = await response.json() as { result?: Array<{ word?: string } | string> };
    const words = (payload.result || []).map((item) => (typeof item === 'string' ? item : item.word || '')).filter(Boolean);
    return normalizeWords(words, '360搜索联想');
  } catch (error) {
    errors.push(`360联想 ${error instanceof Error ? error.message : '未知错误'}`);
    return [];
  }
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
  const douyinSuggestions = await fetchDouyinSuggestions(keyword, errors);
  const publicSuggestions = douyinSuggestions.length > 0
    ? []
    : [
        ...(await fetchBaiduSuggestions(keyword, errors)),
        ...(await fetchSo360Suggestions(keyword, errors)),
      ];
  const primarySuggestions = douyinSuggestions.length > 0 ? douyinSuggestions : publicSuggestions;
  const fallback = fallbackSuggestions(keyword);
  const merged = dedupeKeywordSuggestions([...primarySuggestions, ...fallback]).map((item, index) => ({ ...item, rank: index + 1 }));
  const split = splitKeywordSuggestions(merged);

  if (primarySuggestions.length > 0) {
    return NextResponse.json({
      keyword,
      source: douyinSuggestions.length > 0 ? '抖音搜索联想' : '搜索联想拓展',
      fetchedAt: new Date().toISOString(),
      suggestions: split.suggestions,
      longTailSuggestions: split.longTailSuggestions,
    });
  }

  return NextResponse.json({
    keyword,
    source: errors.length > 0 ? '本地长尾拓展（外部联想源暂不可用）' : '本地长尾拓展',
    fetchedAt: new Date().toISOString(),
    suggestions: split.suggestions,
    longTailSuggestions: split.longTailSuggestions,
  });
}
