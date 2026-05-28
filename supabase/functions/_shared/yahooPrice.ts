// Server-side delayed quote lookup used by digest + breaking-news flows.
// Yahoo's public quote endpoint — no key required.

export type SrvQuote = {
  ticker: string;
  price: number;
  prev_close: number;
  change_pct: number;
  name?: string;
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
};

export async function fetchServerQuotes(tickers: string[]): Promise<SrvQuote[]> {
  if (!tickers.length) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(','))}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = (json?.quoteResponse?.result ?? []) as Array<any>;
    return rows.map((r) => ({
      ticker: r.symbol,
      price: Number(r.regularMarketPrice ?? 0),
      prev_close: Number(r.regularMarketPreviousClose ?? 0),
      change_pct: Number(r.regularMarketChangePercent ?? 0),
      name: r.shortName ?? r.longName,
    }));
  } catch {
    return [];
  }
}
