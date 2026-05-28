import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

export async function fetchSeekingAlphaRss(ticker: string): Promise<RawArticle[]> {
  const url = `https://seekingalpha.com/api/sa/combined/${ticker}.xml`;
  try {
    const items = await fetchRss(url);
    return items.slice(0, 20).map((i) => ({
      ticker,
      source: 'seekingalpha',
      url: i.link,
      headline: i.title,
      body_snippet: i.description ?? '',
      published_at: parsePubDate(i.pubDate),
    })).filter((a) => a.url && a.headline);
  } catch {
    return [];
  }
}
