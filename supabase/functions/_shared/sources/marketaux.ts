import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

export async function fetchMarketaux(ticker: string): Promise<RawArticle[]> {
  const key = Deno.env.get('MARKETAUX_KEY');
  if (!key) return [];
  const url = `https://api.marketaux.com/v1/news/all?symbols=${ticker}&filter_entities=true&language=en&limit=10&api_token=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const data = (json?.data ?? []) as Array<any>;
  return data.map((d) => ({
    ticker,
    source: 'marketaux',
    url: d.url,
    headline: d.title,
    body_snippet: d.description ?? d.snippet ?? '',
    published_at: parsePubDate(d.published_at),
  })).filter((a) => a.url && a.headline);
}
