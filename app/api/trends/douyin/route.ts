import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type TrendItem = {
  title: string;
  hot?: string;
  label?: string;
  url?: string;
  desc?: string;
};

const SOURCES = [
  'https://tophub.today/n/K7GdaMgdQy',
  'https://api.xk.ee/hot/douyin.php',
  'https://api.juehen.com/hot/douyin.php',
];

const TOPHUB_ORIGIN = 'https://tophub.today';

const textOf = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

const pickArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const candidates = [record.data, record.list, record.result, record.news, record.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.list)) return nested.list;
      if (Array.isArray(nested.data)) return nested.data;
    }
  }
  return [];
};

const normalizeTrend = (item: unknown): TrendItem | null => {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const title = textOf(record.title) || textOf(record.name) || textOf(record.word) || textOf(record.keyword) || textOf(record.hot_word);
  if (!title) return null;

  return {
    title,
    hot: textOf(record.hot) || textOf(record.heat) || textOf(record.hot_value) || textOf(record.popularity),
    label: textOf(record.label) || textOf(record.tag),
    url: textOf(record.url) || textOf(record.link),
    desc: textOf(record.desc) || textOf(record.description) || textOf(record.summary),
  };
};

const decodeHtml = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const stripTags = (value: string) => decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

const toAbsoluteUrl = (url: string) => {
  if (!url) return undefined;
  try {
    return new URL(url, TOPHUB_ORIGIN).toString();
  } catch {
    return url;
  }
};

const parseTopHubTableRows = (raw: string) => {
  const seen = new Set<string>();
  const rows = [
    ...raw.matchAll(
      /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d+)\.\s*<\/td>[\s\S]*?<td[^>]*>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class=["'][^"']*\bws\b[^"']*["'][^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi,
    ),
  ];

  return rows
    .map((match): TrendItem | null => {
      const rank = match[1];
      const url = toAbsoluteUrl(decodeHtml(match[2]));
      const title = stripTags(match[3]);
      const hot = stripTags(match[4]);
      if (!title || seen.has(title)) return null;
      seen.add(title);

      return {
        title,
        hot,
        label: 'TopHub',
        url,
        desc: rank ? `TopHub 抖音热搜第 ${rank} 位` : 'TopHub 抖音热搜',
      };
    })
    .filter((item): item is TrendItem => Boolean(item));
};

const parsePayload = (raw: string, contentType: string) => {
  if (contentType.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      const payload = JSON.parse(raw);
      return pickArray(payload).map(normalizeTrend).filter((item): item is TrendItem => Boolean(item));
    } catch {
      // Fall through to HTML parsing because some endpoints return text/html with JSON-like payloads.
    }
  }

  const topHubItems = parseTopHubTableRows(raw);
  if (topHubItems.length > 0) return topHubItems;

  const blocks = [...raw.matchAll(/<div\s+class=["']item["'][\s\S]*?(?=<div\s+class=["']item["']|<\/div>\s*<\/div>\s*<\/body>|$)/gi)].map((match) => match[0]);
  const htmlItems = blocks
    .map((block): TrendItem | null => {
      const keyword = block.match(/<div\s+class=["']keyword["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const hot = block.match(/<div\s+class=["']hotnum["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const label = block.match(/<span\s+class=["']tag[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
      const title = keyword ? stripTags(keyword) : '';
      if (!title) return null;
      return {
        title,
        hot: hot ? stripTags(hot).replace(/^热度值[:：]\s*/, '') : undefined,
        label: label ? stripTags(label) : undefined,
      };
    })
    .filter((item): item is TrendItem => Boolean(item));

  if (htmlItems.length > 0) return htmlItems;

  return [...raw.matchAll(/<div\s+class=["']keyword["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
    .map((title) => ({ title }));
};

export async function GET() {
  const errors: string[] = [];

  for (const source of SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(source, {
        headers: {
          Accept: 'application/json,text/html,text/plain,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        errors.push(`${source}: ${response.status}`);
        continue;
      }

      const raw = await response.text();
      const items = parsePayload(raw, response.headers.get('content-type') || '');

      if (items.length > 0) {
        return NextResponse.json({
          source,
          sourceLabel: source.includes('tophub.today') ? '今日热榜 TopHub' : '第三方热搜接口',
          fetchedAt: new Date().toISOString(),
          items,
        });
      }

      errors.push(`${source}: empty`);
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  return NextResponse.json(
    { error: `抖音热搜暂时不可用：${errors.join('；')}`, items: [] },
    { status: 502 },
  );
}
