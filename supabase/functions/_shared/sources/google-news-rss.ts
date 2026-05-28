import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

export async function fetchGoogleNews(ticker: string, name?: string): Promise<RawArticle[]> {
  const q = name ? `"${name}" OR ${ticker} stock` : `${ticker} stock`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const items = await fetchRss(url);
    return items.slice(0, 20).map((i) => ({
      ticker,
      source: 'google-news',
      url: i.link,
      headline: i.title,
      body_snippet: i.description ?? '',
      published_at: parsePubDate(i.pubDate),
    })).filter((a) => a.url && a.headline);
  } catch {
    return [];
  }
}
