import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

// 25 reqs/day on free tier — we'll call this sparingly (one ticker per cron run, round-robin).
export async function fetchAlphaVantage(ticker: string): Promise<RawArticle[]> {
  const key = Deno.env.get('ALPHAVANTAGE_KEY');
  if (!key) return [];
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&limit=20&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const feed = (json?.feed ?? []) as Array<any>;
  return feed.map((d) => ({
    ticker,
    source: 'alphavantage',
    url: d.url,
    headline: d.title,
    body_snippet: d.summary ?? '',
    published_at: parsePubDate(parseAVDate(d.time_published)),
  })).filter((a) => a.url && a.headline);
}

function parseAVDate(s?: string): string | undefined {
  // Format: YYYYMMDDTHHmmss
  if (!s || s.length < 15) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
}
