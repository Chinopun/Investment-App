import type { RawArticle } from '../types.ts';
import { parsePubDate } from '../normalize.ts';
import { fetchRss } from '../rss.ts';

// SEC EDGAR exposes a per-CIK RSS, and a per-ticker JSON for recent filings.
// We use the public submissions JSON keyed by CIK. The mapping ticker → CIK is at:
//   https://www.sec.gov/files/company_tickers.json
// We cache it in memory per cold-start.

let tickerToCik: Record<string, string> | null = null;

async function getCik(ticker: string): Promise<string | null> {
  if (!tickerToCik) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'InvestmentApp virojns@gmail.com' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      tickerToCik = {};
      for (const k of Object.keys(json)) {
        const r = json[k];
        tickerToCik[String(r.ticker).toUpperCase()] = String(r.cik_str).padStart(10, '0');
      }
    } catch {
      return null;
    }
  }
  return tickerToCik[ticker.toUpperCase()] ?? null;
}

export async function fetchSecEdgar(ticker: string): Promise<RawArticle[]> {
  const cik = await getCik(ticker);
  if (!cik) return [];
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=10&output=atom`;
  try {
    const items = await fetchRss(url, { headers: { 'User-Agent': 'InvestmentApp virojns@gmail.com' } });
    return items.slice(0, 10).map((i) => ({
      ticker,
      source: 'sec-edgar',
      url: i.link,
      headline: i.title,
      body_snippet: i.description ?? '',
      published_at: parsePubDate(i.pubDate),
    })).filter((a) => a.url && a.headline);
  } catch {
    return [];
  }
}
