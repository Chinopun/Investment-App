import { createHash } from 'node:crypto';
import type { RawArticle } from './types.ts';

export function headlineHash(headline: string): string {
  const normalized = headline.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  return createHash('sha1').update(normalized).digest('hex');
}

export function canonicalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    // strip common tracking params
    const drop = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','mc_cid','mc_eid'];
    drop.forEach((k) => url.searchParams.delete(k));
    return url.toString();
  } catch {
    return u;
  }
}

export function dedupe(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const seenUrl = new Set<string>();
  const out: RawArticle[] = [];
  for (const a of articles) {
    const h = headlineHash(a.headline);
    const u = canonicalizeUrl(a.url);
    const key = `${a.ticker}:${h}`;
    if (seen.has(key) || seenUrl.has(u)) continue;
    seen.add(key);
    seenUrl.add(u);
    out.push({ ...a, url: u });
  }
  return out;
}

export function parsePubDate(s: string | number | undefined): string {
  if (!s) return new Date().toISOString();
  if (typeof s === 'number') {
    // epoch seconds vs ms
    const d = new Date(s > 1e12 ? s : s * 1000);
    return isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
  }
  const d = new Date(s);
  return isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}
