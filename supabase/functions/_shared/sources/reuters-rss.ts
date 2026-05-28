import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

// Reuters proper has locked down their RSS, but Reuters Business via Google News works
// and so does the still-live "topstories" feed mirror.
const FEEDS = [
  'https://news.google.com/rss/search?q=site:reuters.com+business&hl=en-US&gl=US&ceid=US:en',
];

export async function fetchReutersRss(ticker: string, name?: string): Promise<RawArticle[]> {
  const needle = (s: string) => {
    const lo = s.toLowerCase();
    if (lo.includes(ticker.toLowerCase())) return true;
    if (name && lo.includes(name.toLowerCase().split(/[\s,]/)[0])) return true;
    return false;
  };
  const out: RawArticle[] = [];
  for (const url of FEEDS) {
    try {
      const items = await fetchRss(url);
      for (const i of items) {
        if (needle(i.title) || (i.description && needle(i.description))) {
          out.push({
            ticker,
            source: 'reuters',
            url: i.link,
            headline: i.title,
            body_snippet: i.description ?? '',
            published_at: parsePubDate(i.pubDate),
          });
        }
      }
    } catch { /* skip */ }
  }
  return out;
}
