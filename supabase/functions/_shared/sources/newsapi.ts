import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

export async function fetchNewsApi(ticker: string, name?: string): Promise<RawArticle[]> {
  const key = Deno.env.get('NEWSAPI_KEY');
  if (!key) return [];
  const q = name ? `${ticker} OR "${name}"` : `${ticker} stock`;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&pageSize=15&sortBy=publishedAt&apiKey=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  const articles = (json?.articles ?? []) as Array<any>;
  return articles.map((a) => ({
    ticker,
    source: 'newsapi',
    url: a.url,
    headline: a.title,
    body_snippet: a.description ?? '',
    published_at: parsePubDate(a.publishedAt),
  })).filter((a) => a.url && a.headline);
}
