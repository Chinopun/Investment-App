// Runs every weekday morning (06:30 ET via pg_cron).
// For each user:
//   1. Pull their tickers.
//   2. Fetch overnight price changes (Yahoo).
//   3. Pull last 24h of news_articles for those tickers.
//   4. Ask Gemini for a JSON digest { subject_line, body_md }.
//   5. Upsert into daily_digests for today.

import { adminClient } from '../_shared/db.ts';
import { fetchServerQuotes } from '../_shared/yahooPrice.ts';
import { buildDigest } from '../_shared/ai.ts';

Deno.serve(async (_req) => {
  const sb = adminClient();
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: users } = await sb.from('users').select('id, email, tz');
  const results: any[] = [];

  for (const u of users ?? []) {
    const { data: holdings } = await sb
      .from('holdings').select('ticker, name')
      .eq('user_id', u.id);
    const tickers = (holdings ?? []).map((h) => h.ticker);
    if (!tickers.length) continue;

    const [quotes, { data: news }] = await Promise.all([
      fetchServerQuotes(tickers),
      sb.from('news_articles').select('*')
        .in('ticker', tickers)
        .gte('published_at', since)
        .order('published_at', { ascending: false })
        .limit(400),
    ]);
    const qMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]));

    const perTicker = (holdings ?? []).map((h) => ({
      ticker: h.ticker,
      name: h.name ?? qMap[h.ticker]?.name,
      change_pct: qMap[h.ticker]?.change_pct,
      headlines: (news ?? [])
        .filter((n) => n.ticker === h.ticker)
        .slice(0, 8)
        .map((n) => ({ headline: n.headline, source: n.source, snippet: n.body_snippet ?? '' })),
    }));

    let digest = await buildDigest({ date: today, perTicker });
    if (!digest) {
      // Deterministic fallback if AI is unavailable: build a markdown digest from data alone.
      const subject = perTicker
        .map((t) => `${t.ticker} ${t.change_pct == null ? '?' : (t.change_pct >= 0 ? '+' : '') + t.change_pct.toFixed(1) + '%'}`)
        .join(', ');
      const body_md = `# Morning digest — ${today}\n\n` + perTicker.map((t) =>
        `## ${t.ticker} — ${t.name ?? ''}\n` +
        (t.change_pct != null ? `Overnight: ${t.change_pct.toFixed(2)}%\n\n` : '') +
        t.headlines.map((h) => `- (${h.source}) ${h.headline}`).join('\n')
      ).join('\n\n');
      digest = { subject_line: subject.slice(0, 200), body_md };
    }

    const priceMoves: Record<string, { close: number; change_pct: number }> = {};
    for (const q of quotes) priceMoves[q.ticker] = { close: q.price, change_pct: q.change_pct };

    const { error } = await sb.from('daily_digests').upsert(
      {
        user_id: u.id,
        digest_date: today,
        subject_line: digest.subject_line,
        body_md: digest.body_md,
        price_moves: priceMoves,
      },
      { onConflict: 'user_id,digest_date' },
    );
    if (error) console.warn('digest insert failed', error.message);
    results.push({ user: u.email, ok: !error });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
