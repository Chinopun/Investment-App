import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

const FEEDS = [
  'https://www.cnbc.com/id/100003114/device/rss/rss.html', // Top news
  'https://www.cnbc.com/id/15839135/device/rss/rss.html',  // Markets
  'https://www.cnbc.com/id/19854910/device/rss/rss.html',  // Earnings
];

export async function fetchCnbcRss(ticker: string, name?: string): Promise<RawArticle[]> {
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
            source: 'cnbc',
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
