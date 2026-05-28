import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

export async function fetchYahooRss(ticker: string): Promise<RawArticle[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
  try {
    const items = await fetchRss(url);
    return items.slice(0, 20).map((i) => ({
      ticker,
      source: 'yahoo-rss',
      url: i.link,
      headline: i.title,
      body_snippet: i.description ?? '',
      published_at: parsePubDate(i.pubDate),
    })).filter((a) => a.url && a.headline);
  } catch {
    return [];
  }
}
