// Per-ticker news aggregator across ~13 free sources.
// Triggered every 15 minutes by pg_cron.
//
// Flow:
//   1. Load distinct (ticker, name) pairs from holdings.
//   2. For each ticker, fan out in parallel to all sources via Promise.allSettled.
//   3. Normalize + dedupe by canonical URL and headline hash.
//   4. Upsert into news_articles (unique on (ticker, headline_hash)).

import { adminClient } from '../_shared/db.ts';
import { dedupe, headlineHash } from '../_shared/normalize.ts';
import type { RawArticle } from '../_shared/types.ts';

import { fetchFinnhub } from '../_shared/sources/finnhub.ts';
import { fetchYahoo } from '../_shared/sources/yahoo.ts';
import { fetchYahooRss } from '../_shared/sources/yahoo-rss.ts';
import { fetchMarketaux } from '../_shared/sources/marketaux.ts';
import { fetchAlphaVantage } from '../_shared/sources/alphavantage.ts';
import { fetchNewsApi } from '../_shared/sources/newsapi.ts';
import { fetchGoogleNews } from '../_shared/sources/google-news-rss.ts';
import { fetchMarketWatchRss } from '../_shared/sources/marketwatch-rss.ts';
import { fetchCnbcRss } from '../_shared/sources/cnbc-rss.ts';
import { fetchReutersRss } from '../_shared/sources/reuters-rss.ts';
import { fetchSeekingAlphaRss } from '../_shared/sources/seekingalpha-rss.ts';
import { fetchSecEdgar } from '../_shared/sources/sec-edgar.ts';
import { fetchStockTwits } from '../_shared/sources/stocktwits.ts';
import { fetchRedditRss } from '../_shared/sources/reddit-rss.ts';

Deno.serve(async (_req) => {
  const sb = adminClient();
  const { data: holdings, error } = await sb
    .from('holdings')
    .select('ticker, name')
    .order('ticker');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const uniq: Record<string, string | undefined> = {};
  for (const h of holdings ?? []) uniq[h.ticker] = h.name ?? undefined;

  let inserted = 0;
  const perSource: Record<string, number> = {};

  for (const [ticker, name] of Object.entries(uniq)) {
    const results = await Promise.allSettled([
      fetchFinnhub(ticker),
      fetchYahoo(ticker),
      fetchYahooRss(ticker),
      fetchMarketaux(ticker),
      fetchAlphaVantage(ticker),   // sparingly — has tight rate limit
      fetchNewsApi(ticker, name),
      fetchGoogleNews(ticker, name),
      fetchMarketWatchRss(ticker, name),
      fetchCnbcRss(ticker, name),
      fetchReutersRss(ticker, name),
      fetchSeekingAlphaRss(ticker),
      fetchSecEdgar(ticker),
      fetchStockTwits(ticker),
      fetchRedditRss(ticker, name),
    ]);

    const all: RawArticle[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
        for (const a of r.value) perSource[a.source] = (perSource[a.source] ?? 0) + 1;
      } else {
        console.warn('source failed', r.reason);
      }
    }
    const merged = dedupe(all);

    if (merged.length === 0) continue;

    const rows = merged.map((m) => ({
      ticker: m.ticker,
      source: m.source,
      url: m.url,
      headline: m.headline,
      headline_hash: headlineHash(m.headline),
      body_snippet: m.body_snippet?.slice(0, 1000) ?? null,
      published_at: m.published_at,
    }));

    const { error: insErr, count } = await sb
      .from('news_articles')
      .upsert(rows, { onConflict: 'ticker,headline_hash', ignoreDuplicates: true, count: 'exact' });
    if (insErr) console.warn('insert error', insErr.message);
    else inserted += count ?? 0;
  }

  return new Response(JSON.stringify({ ok: true, inserted, perSource }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
