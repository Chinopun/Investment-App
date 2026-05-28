export type Holding = {
  id: string;
  user_id: string;
  ticker: string;
  name: string | null;
  shares: number | null;
  cost_basis: number | null;
  alert_breaking: boolean;
  created_at: string;
};

export type NewsArticle = {
  id: string;
  ticker: string;
  source: string;
  url: string;
  headline: string;
  body_snippet: string | null;
  summary: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  impact_score: number | null;
  published_at: string;
  fetched_at: string;
};

export type DailyDigest = {
  id: string;
  user_id: string;
  digest_date: string;
  body_md: string;
  subject_line: string;
  price_moves: Record<string, { close: number; change_pct: number }>;
  sent_at: string | null;
  created_at: string;
};

export type Quote = {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  prev_close: number;
  currency: string;
  name?: string;
};
