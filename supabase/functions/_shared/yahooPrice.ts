// Server-side delayed quote lookup used by digest + breaking-news flows.
// Uses Yahoo's /v8/finance/chart endpoint (no API key needed, no crumb auth).

export type SrvQuote = {
  ticker: string;
  price: number;
  prev_close: number;
  change_pct: number;
  name?: string;
};

const Y_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function tryHosts(path: string): Promise<any | null> {
  for (const host of Y_HOSTS) {
    try {
      const res = await fetch(host + path, { headers });
      if (res.ok) return await res.json();
    } catch {
      // try the next host
    }
  }
  return null;
}

export async function fetchServerQuotes(tickers: string[]): Promise<SrvQuote[]> {
  if (!tickers.length) return [];
  const results = await Promise.all(
    tickers.map(async (t): Promise<SrvQuote | null> => {
      const sym = t.toUpperCase();
      const json = await tryHosts(
        `/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
      );
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = Number(meta.regularMarketPrice ?? 0);
      const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
      const change_pct = prev ? ((price - prev) / prev) * 100 : 0;
      return {
        ticker: sym,
        price,
        prev_close: prev,
        change_pct,
        name: meta.longName ?? meta.shortName,
      };
    }),
  );
  return results.filter((q): q is SrvQuote => q !== null);
}
