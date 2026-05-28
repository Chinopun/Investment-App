// Live quotes from Yahoo Finance's public quote endpoint.
// No API key needed. Used inside the RN app for on-demand refresh of the portfolio screen.

import type { Quote } from './types';

const YQ = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YS = 'https://query1.finance.yahoo.com/v1/finance/search';
const YC = 'https://query1.finance.yahoo.com/v8/finance/chart';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  if (tickers.length === 0) return [];
  const symbols = tickers.map((t) => t.toUpperCase()).join(',');
  const res = await fetch(`${YQ}?symbols=${encodeURIComponent(symbols)}`, { headers });
  if (!res.ok) throw new Error(`Yahoo quote failed: ${res.status}`);
  const json = await res.json();
  const rows = json?.quoteResponse?.result ?? [];
  return rows.map(
    (r: any): Quote => ({
      ticker: r.symbol,
      price: r.regularMarketPrice ?? 0,
      change: r.regularMarketChange ?? 0,
      change_pct: r.regularMarketChangePercent ?? 0,
      prev_close: r.regularMarketPreviousClose ?? 0,
      currency: r.currency ?? 'USD',
      name: r.shortName ?? r.longName,
    }),
  );
}

export type TickerSearchHit = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
};

export async function searchTicker(q: string): Promise<TickerSearchHit[]> {
  if (!q.trim()) return [];
  const res = await fetch(
    `${YS}?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
    { headers },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.quotes ?? []).filter((q: any) => q.symbol && q.quoteType === 'EQUITY');
}

export type Candle = { t: number; close: number };

export async function fetchChart(
  ticker: string,
  range: '1d' | '5d' | '1mo' = '1d',
): Promise<Candle[]> {
  const interval = range === '1d' ? '5m' : range === '5d' ? '30m' : '1d';
  const res = await fetch(
    `${YC}/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`,
    { headers },
  );
  if (!res.ok) return [];
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) return [];
  const ts: number[] = r.timestamp ?? [];
  const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
  return ts
    .map((t, i) => ({ t, close: closes[i] ?? NaN }))
    .filter((c) => Number.isFinite(c.close));
}
