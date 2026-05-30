// Theme preference. 'system' follows the iOS appearance setting,
// 'light' / 'dark' override it. Persisted via expo-secure-store.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'theme.mode';
export type ThemeMode = 'system' | 'light' | 'dark';

type State = {
  mode: ThemeMode;
  load: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

export const useThemeMode = create<State>((set) => ({
  mode: 'system',
  load: async () => {
    try {
      const v = await SecureStore.getItemAsync(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') set({ mode: v });
    } catch { /* non-fatal */ }
  },
  setMode: async (mode) => {
    set({ mode });
    try { await SecureStore.setItemAsync(KEY, mode); } catch {}
  },
}));
