import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';

// Public read endpoint; rate-limited but unauth'd.
// Returns recent messages — we keep only ones with a link (i.e. linked-article posts).
export async function fetchStockTwits(ticker: string): Promise<RawArticle[]> {
  const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const msgs = (json?.messages ?? []) as Array<any>;
    const out: RawArticle[] = [];
    for (const m of msgs) {
      const linkEntity = m.entities?.chart?.url || m.entities?.url || null;
      const link = m.links?.[0]?.url ?? linkEntity ?? null;
      if (!link) continue;
      out.push({
        ticker,
        source: 'stocktwits',
        url: link,
        headline: (m.links?.[0]?.title ?? m.body ?? '').slice(0, 240),
        body_snippet: m.body ?? '',
        published_at: parsePubDate(m.created_at),
      });
    }
    return out;
  } catch {
    return [];
  }
}
