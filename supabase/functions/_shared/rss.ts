// Tiny dependency-free RSS / Atom parser for Deno Edge.
// Just regex; works for the curated set of feeds we hit.

export type RssItem = { title: string; link: string; pubDate?: string; description?: string };

export async function fetchRss(url: string, opts: RequestInit = {}): Promise<RssItem[]> {
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 InvestmentApp/0.1 (+rss reader)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
    ...(opts.headers ?? {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`RSS ${url} ${res.status}`);
  const xml = await res.text();
  return parseRss(xml);
}

export function parseRss(xml: string): RssItem[] {
  // RSS 2.0 <item>… or Atom <entry>…
  const isAtom = /<feed\b/i.test(xml) && !/<rss\b/i.test(xml);
  const entryRegex = isAtom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const items: RssItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(xml))) {
    const block = m[1];
    const title = tag(block, 'title');
    const link =
      isAtom ? attr(block, 'link', 'href') ?? tag(block, 'id') ?? ''
             : tag(block, 'link');
    const pubDate = isAtom
      ? (tag(block, 'updated') ?? tag(block, 'published'))
      : (tag(block, 'pubDate') ?? tag(block, 'dc:date'));
    const description = tag(block, 'description') ?? tag(block, 'summary') ?? tag(block, 'content');
    if (title && link) items.push({ title: decode(title), link: decode(link), pubDate: pubDate ?? undefined, description: description ? decode(description) : undefined });
  }
  return items;
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = re.exec(block);
  return m ? stripCdata(m[1]).trim() : null;
}

function attr(block: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}=["']([^"']+)["']`, 'i');
  const m = re.exec(block);
  return m ? m[1] : null;
}

function stripCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/i, '$1');
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
