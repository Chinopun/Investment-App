// Live quotes + charts from Yahoo Finance.
//
// We use the /v8/finance/chart endpoint for BOTH quotes and historical data.
// Why not /v7/finance/quote? Yahoo started requiring a "crumb" cookie on that
// endpoint and now returns 401 for naked fetches. /v8/finance/chart is used by
// Yahoo's embeddable chart widget and works without auth.
//
// We try query1.finance.yahoo.com first, then fall back to query2 (a mirror)
// if the first one rate-limits or blocks us.

import type { Quote } from './types';

const Y_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

// A real-browser User-Agent. RN's default UA is recognized by Yahoo's bot
// detection and sometimes triggers 401s on the search endpoint.
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

// ---------- QUOTES ----------
// We hit /v8/finance/chart with range=1d, interval=1d — the smallest payload
// that still gives us regularMarketPrice + chartPreviousClose in meta.
export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  if (tickers.length === 0) return [];
  const results = await Promise.all(
    tickers.map(async (t): Promise<Quote | null> => {
      const sym = t.toUpperCase();
      const json = await tryHosts(
        `/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
      );
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price = Number(meta.regularMarketPrice ?? 0);
      const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
      const change = price - prev;
      const change_pct = prev ? (change / prev) * 100 : 0;
      return {
        ticker: sym,
        price,
        change,
        change_pct,
        prev_close: prev,
        currency: meta.currency ?? 'USD',
        name: meta.longName ?? meta.shortName,
      };
    }),
  );
  return results.filter((q): q is Quote => q !== null);
}

// ---------- TICKER SEARCH ----------
// The search endpoint is on the same query1/2 hosts; usually unaffected by the
// /v7 auth change, but we still try both hosts.
export type TickerSearchHit = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
};

export async function searchTicker(q: string): Promise<TickerSearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const json = await tryHosts(
    `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
  );
  if (!json) return [];
  return (json?.quotes ?? []).filter(
    (item: any) => item.symbol && item.quoteType === 'EQUITY',
  );
}

// ---------- CHARTS ----------
export type Candle = { t: number; close: number };

export type ChartData = {
  candles: Candle[];
  changePct: number | null; // % change over the whole range
  changeAbs: number | null; // absolute $ change over the whole range
};

export async function fetchChart(
  ticker: string,
  range: '1d' | '5d' | '1mo' = '1d',
): Promise<ChartData> {
  const interval = range === '1d' ? '5m' : range === '5d' ? '30m' : '1d';
  const json = await tryHosts(
    `/v8/finance/chart/${encodeURIComponent(ticker.toUpperCase())}?range=${range}&interval=${interval}`,
  );
  const result = json?.chart?.result?.[0];
  if (!result) return { candles: [], changePct: null, changeAbs: null };

  const ts: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const candles = ts
    .map((t, i) => ({ t, close: closes[i] ?? NaN }))
    .filter((c) => Number.isFinite(c.close));

  // chartPreviousClose = the close immediately BEFORE the range starts, which is
  // exactly the reference point we want for an N-day return calc.
  const meta = result.meta ?? {};
  const currentPrice = Number(meta.regularMarketPrice ?? candles[candles.length - 1]?.close ?? 0);
  const startPrice = Number(meta.chartPreviousClose ?? candles[0]?.close ?? 0);

  let changePct: number | null = null;
  let changeAbs: number | null = null;
  if (startPrice > 0 && currentPrice > 0) {
    changeAbs = currentPrice - startPrice;
    changePct = (changeAbs / startPrice) * 100;
  }

  return { candles, changePct, changeAbs };
}
