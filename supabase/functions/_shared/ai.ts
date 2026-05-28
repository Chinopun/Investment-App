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
  perTicker: { ticker: string; name?: string; change_pct?: number; headlines: { headline: string; source: string; snippet?: string }[] }[];
}): Promise<{ subject_line: string; body_md: string } | null> {
  const prompt = `You are writing a personal morning markets digest for ${input.date}.
Return JSON: { "subject_line": "<= 110 chars one-line summary that headlines the biggest moves and news, like 'NVDA +2.1% on earnings beat, AAPL -0.4%, recall hits TSLA'", "body_md": "Markdown body with a one-paragraph overview, then a per-ticker section (## TICKER — name) summarizing what mattered in 2-4 bullets, with each bullet referencing why it matters." }

Holdings:
${input.perTicker.map((t) => `\n### ${t.ticker} ${t.name ?? ''} (${t.change_pct?.toFixed(2) ?? '?'}% overnight)\nHeadlines:\n${t.headlines.slice(0, 8).map((h) => `- (${h.source}) ${h.headline} — ${h.snippet ?? ''}`).join('\n')}`).join('\n')}`;
  const r = (await llmJson(prompt)) as any;
  if (!r) return null;
  return {
    subject_line: String(r.subject_line ?? '').slice(0, 200),
    body_md: String(r.body_md ?? ''),
  };
}
