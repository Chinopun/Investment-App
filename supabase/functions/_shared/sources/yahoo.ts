import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

export async function fetchYahoo(ticker: string): Promise<RawArticle[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&newsCount=20&quotesCount=0`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const json = await res.json();
  const news = (json?.news ?? []) as Array<any>;
  return news.map((n) => ({
    ticker,
    source: 'yahoo',
    url: n.link,
    headline: n.title,
    body_snippet: n.publisher ?? '',
    published_at: parsePubDate(n.providerPublishTime),
  })).filter((a) => a.url && a.headline);
}
