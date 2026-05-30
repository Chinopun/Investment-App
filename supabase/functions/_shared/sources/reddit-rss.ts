import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

// Reddit exposes per-subreddit search RSS. We hit a few investing subs.
const SUBS = ['stocks', 'investing', 'wallstreetbets'];

export async function fetchRedditRss(ticker: string, name?: string): Promise<RawArticle[]> {
  const q = name ? `${ticker} OR "${name}"` : ticker;
  const out: RawArticle[] = [];
  for (const sub of SUBS) {
    const url = `https://www.reddit.com/r/${sub}/search.rss?q=${encodeURIComponent(q)}&restrict_sr=on&sort=new&t=day`;
    try {
      const items = await fetchRss(url, { headers: { 'User-Agent': 'InvestmentApp/0.1 by chinopun' } });
      for (const i of items.slice(0, 10)) {
        out.push({
          ticker,
          source: `reddit-${sub}`,
          url: i.link,
          headline: i.title,
          body_snippet: i.description ?? '',
          published_at: parsePubDate(i.pubDate),
        });
      }
    } catch { /* skip */ }
  }
  return out;
}
