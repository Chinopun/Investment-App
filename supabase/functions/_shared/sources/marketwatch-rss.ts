import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

// MarketWatch publishes a few topical feeds. We pull "marketpulse" and "topstories" and
// then filter on the ticker/company name being mentioned in the headline.
const FEEDS = [
  'https://feeds.content.dowjones.io/public/rss/mw_marketpulse',
  'https://feeds.content.dowjones.io/public/rss/mw_topstories',
];

export async function fetchMarketWatchRss(ticker: string, name?: string): Promise<RawArticle[]> {
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
            source: 'marketwatch',
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
