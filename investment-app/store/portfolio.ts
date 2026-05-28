import { create } from 'zustand';
import type { Holding, Quote } from '../lib/types';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { fetchQuotes } from '../lib/prices';

type State = {
  holdings: Holding[];
  quotes: Record<string, Quote>;
  loading: boolean;
  refresh: () => Promise<void>;
  addHolding: (h: { ticker: string; name?: string; shares?: number; cost_basis?: number }) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
};

export const usePortfolio = create<State>((set, get) => ({
  holdings: [],
  quotes: {},
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const userId = await getCurrentUserId();
      if (!userId) { set({ holdings: [], quotes: {}, loading: false }); return; }
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId)
        .order('ticker');
      if (error) throw error;
      const holdings = (data ?? []) as Holding[];
      const tickers = holdings.map((h) => h.ticker);
      let quotes: Record<string, Quote> = {};
      if (tickers.length) {
        try {
          const qs = await fetchQuotes(tickers);
          quotes = Object.fromEntries(qs.map((q) => [q.ticker, q]));
        } catch (e) {
          console.warn('quote fetch failed', e);
        }
      }
      set({ holdings, quotes, loading: false });
    } catch (e) {
      console.warn('portfolio refresh failed', e);
      set({ loading: false });
    }
  },

  addHolding: async ({ ticker, name, shares, cost_basis }) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('holdings').insert({
      user_id: userId,
      ticker: ticker.toUpperCase(),
      name: name ?? null,
      shares: shares ?? null,
      cost_basis: cost_basis ?? null,
    });
    await get().refresh();
  },

  removeHolding: async (id) => {
    await supabase.from('holdings').delete().eq('id', id);
    await get().refresh();
  },
}));
