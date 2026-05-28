export type RawArticle = {
  ticker: string;
  source: string;
  url: string;
  headline: string;
  body_snippet?: string;
  published_at: string; // ISO
};

export type ScoredArticle = RawArticle & {
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  impact_score?: number;
};
