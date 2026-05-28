import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

export async function fetchFinnhub(ticker: string): Promise<RawArticle[]> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return [];
  const today = new Date();
  const past = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fmt(past)}&to=${fmt(today)}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const items = (await res.json()) as Array<any>;
  return items.map((i) => ({
    ticker,
    source: 'finnhub',
    url: i.url,
    headline: i.headline,
    body_snippet: i.summary ?? '',
    published_at: parsePubDate(i.datetime),
  })).filter((a) => a.url && a.headline);
}
