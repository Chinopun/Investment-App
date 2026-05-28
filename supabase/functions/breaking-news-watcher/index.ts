// Runs every 15 minutes (offset by 5 from fetch-news so it sees fresh rows).
// Picks out the most impactful new articles, scores them with the LLM,
// and emails an alert per article (subject = headline). Avoids double-sending
// via the alert_log table.

import { adminClient } from '../_shared/db.ts';
import { scoreArticle } from '../_shared/ai.ts';
import { sendEmail, emailFrame } from '../_shared/email.ts';

const HIGH_IMPACT_KEYWORDS = [
  'earnings','guidance','beats','misses','acquisition','acquires','merger',
  'fda','recall','lawsuit','sec','indictment','bankruptcy','restructuring',
  'downgrade','upgrade','price target','ceo','resigns','layoff','lays off',
  'guidance cut','guidance raised','dividend','buyback','spinoff','split',
];

function looksImpactful(headline: string, source: string): boolean {
  if (source === 'sec-edgar') return true;
  const lo = headline.toLowerCase();
  return HIGH_IMPACT_KEYWORDS.some((k) => lo.includes(k));
}

Deno.serve(async (_req) => {
  const sb = adminClient();
  const appBase = Deno.env.get('APP_DEEP_LINK_BASE') ?? 'investment-app://';

  // Articles ingested in the last 30 minutes (covers some overlap with the previous run).
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: candidates } = await sb
    .from('news_articles')
    .select('id, ticker, source, url, headline, body_snippet, summary, sentiment, impact_score')
    .gte('fetched_at', since)
    .order('fetched_at', { ascending: false })
    .limit(200);

  const triggered: { article_id: string; ticker: string }[] = [];

  for (const a of candidates ?? []) {
    if (!looksImpactful(a.headline, a.source)) continue;

    // Score if we haven't yet (saves AI calls).
    let { summary, sentiment, impact_score } = a as any;
    if (impact_score == null || summary == null) {
      const r = await scoreArticle({
        ticker: a.ticker, headline: a.headline,
        snippet: a.body_snippet ?? undefined, source: a.source,
      });
      if (r) {
        summary = r.summary; sentiment = r.sentiment; impact_score = r.impact_score;
        await sb.from('news_articles').update({
          summary, sentiment, impact_score,
        }).eq('id', a.id);
      }
    }
    if ((impact_score ?? 0) < 65 && a.source !== 'sec-edgar') continue;
    triggered.push({ article_id: a.id, ticker: a.ticker });
  }

  // Cross-reference with users + holdings + alert_log.
  let sent = 0;
  for (const t of triggered) {
    const { data: holdings } = await sb
      .from('holdings')
      .select('user_id, alert_breaking')
      .eq('ticker', t.ticker);
    for (const h of holdings ?? []) {
      if (!h.alert_breaking) continue;
      // Already sent?
      const { data: existing } = await sb
        .from('alert_log').select('id')
        .eq('user_id', h.user_id).eq('article_id', t.article_id)
        .maybeSingle();
      if (existing) continue;

      const { data: user } = await sb.from('users').select('email').eq('id', h.user_id).maybeSingle();
      const { data: art } = await sb.from('news_articles').select('*').eq('id', t.article_id).maybeSingle();
      if (!user || !art) continue;

      const subject = `🔔 ${art.ticker} — ${art.headline}`.slice(0, 200);
      const html = emailFrame({
        preheader: art.summary ?? art.headline,
        bodyHtml:
          `<div style="font-size:13px;color:#0a84ff;font-weight:700">${art.ticker} · ${art.source}</div>` +
          `<div style="font-size:18px;font-weight:700;margin:6px 0">${art.headline}</div>` +
          (art.summary ? `<div style="font-size:14px;color:#444;line-height:20px">${art.summary}</div>` : '') +
          `<div style="margin-top:14px"><a href="${art.url}" style="color:#0a84ff">Read original →</a></div>`,
        ctaLabel: `Open ${art.ticker} in the app`,
        ctaUrl: `${appBase}stock/${art.ticker}`,
        footer: 'Sent because a high-impact news item just landed for one of your holdings. Toggle these off per-stock in the app’s Settings.',
      });

      const ok = await sendEmail({ to: user.email, subject, html, text: art.summary ?? art.headline });
      if (ok) {
        await sb.from('alert_log').insert({ user_id: h.user_id, article_id: art.id });
        sent++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, considered: candidates?.length ?? 0, triggered: triggered.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
