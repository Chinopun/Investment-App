// LLM helpers — Gemini (primary, free) with Groq Llama 3.3 fallback (also free).

type Json = unknown;

async function geminiJson(prompt: string): Promise<Json | null> {
  const key = Deno.env.get('GEMINI_KEY');
  if (!key) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  };
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function groqJson(prompt: string): Promise<Json | null> {
  const key = Deno.env.get('GROQ_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You output only valid JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '';
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function llmJson(prompt: string): Promise<Json | null> {
  return (await geminiJson(prompt)) ?? (await groqJson(prompt));
}

// Score one article into { summary, sentiment, impact_score }.
export async function scoreArticle(input: {
  ticker: string; headline: string; snippet?: string; source: string;
}): Promise<{ summary: string; sentiment: 'positive'|'negative'|'neutral'; impact_score: number } | null> {
  const prompt = `You are a stock-news analyst. Read the headline + snippet about ${input.ticker} and respond with JSON:
{
  "summary": "1-2 sentence plain-English TL;DR",
  "sentiment": "positive" | "negative" | "neutral",
  "impact_score": 0-100   // 100 = company-moving; 0 = irrelevant chatter
}
Headline: ${input.headline}
Snippet: ${input.snippet ?? ''}
Source: ${input.source}`;
  const r = (await llmJson(prompt)) as any;
  if (!r) return null;
  const sent = (['positive','negative','neutral'] as const).includes(r.sentiment) ? r.sentiment : 'neutral';
  const score = Math.max(0, Math.min(100, Math.round(Number(r.impact_score) || 0)));
  return { summary: String(r.summary ?? '').slice(0, 600), sentiment: sent, impact_score: score };
}

export async function buildDigest(input: {
  date: string;
  perTicker: { ticker: string; name?: string; change_pct?: number; headlines: { headline: string; snippet?: string }[] }[];
}): Promise<{ subject_line: string; body_md: string } | null> {
  const positions = input.perTicker.map((t) => {
    const move = t.change_pct == null
      ? '(no quote)'
      : `${t.change_pct >= 0 ? '+' : ''}${t.change_pct.toFixed(2)}%`;
    const heads = t.headlines.length === 0
      ? '  (no recent headlines)'
      : t.headlines
          .slice(0, 12)
          .map((h) => `  - ${h.headline}${h.snippet ? ' — ' + h.snippet.slice(0, 220) : ''}`)
          .join('\n');
    return `${t.ticker} — ${t.name ?? ''} (${move})\n${heads}`;
  }).join('\n\n');

  const prompt = `You are a senior equities analyst writing the morning markets brief for an individual investor. Date: ${input.date}.

Your job is to surface ONLY the most material developments and overnight moves across this portfolio. Be selective. Many tickers should be skipped entirely if nothing material happened.

PORTFOLIO POSITIONS:
${positions}

MATERIALITY BAR — only flag a ticker if at least one of these is true:
- Earnings or guidance announcement
- M&A activity, partnerships, major contract wins/losses
- Regulatory action (FDA decision, SEC enforcement, antitrust, recall, lawsuit)
- Insider transactions or 8-K filings indicating something substantive
- Analyst rating action from a major firm with a specific thesis change
- Overnight price move greater than +/-2% with a clear catalyst

IGNORE entirely: routine commentary, repackaged old news, social media speculation, broad market chatter, generic sector takes, anything you cannot trace to a substantive event.

RESPOND with strict JSON of this exact shape:

{
  "subject_line": "Single line, MAX 110 characters. Capture only the 2-3 most material developments. Lead with ticker symbols and the specific event, e.g. 'NVDA +3.1% on guidance raise; TSLA recall expands; CRM downgrade'. No fluff words like 'today' or 'morning'.",
  "body_md": "Concise professional markdown brief. Structure:\\n\\n**Opening paragraph (2-3 sentences):** the dominant theme across the flagged names.\\n\\nFor each ticker that meets the materiality bar, a section in this format:\\n\\n## TICKER — Company Name\\n2 to 3 sentences of clean factual analysis. State what happened and why it matters for the position. No bullet points unless absolutely needed for clarity. No filler.\\n\\nAt the very end, if any tickers had no material news, a single closing line: '**Quiet:** TICKER1, TICKER2, TICKER3.'"
}

ABSOLUTE RULES:
- Never cite or name news outlets or sources anywhere in the output.
- Write in your own voice as the analyst, as if you researched it yourself.
- Tone: professional, factual, neutral. No hype, no marketing language, no exclamation marks.
- If after applying the materiality bar there is genuinely nothing significant, body_md may be a single paragraph saying so and the subject_line should reflect it.`;

  const r = (await llmJson(prompt)) as any;
  if (!r) return null;
  return {
    subject_line: String(r.subject_line ?? '').slice(0, 200),
    body_md: String(r.body_md ?? ''),
  };
}
