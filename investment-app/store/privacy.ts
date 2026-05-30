// Global "hide my money" toggle. Persisted with expo-secure-store so the
// preference survives app restarts.

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'privacy.hidden';

type State = {
  hidden: boolean;
  ready: boolean;
  load: () => Promise<void>;
  toggle: () => Promise<void>;
};

export const usePrivacy = create<State>((set, get) => ({
  hidden: false,
  ready: false,

  load: async () => {
    try {
      const v = await SecureStore.getItemAsync(KEY);
      set({ hidden: v === '1', ready: true });
    } catch {
      set({ ready: true });
    }
  },

  toggle: async () => {
    const next = !get().hidden;
    set({ hidden: next });
    try {
      await SecureStore.setItemAsync(KEY, next ? '1' : '0');
    } catch {
      // Non-fatal — toggle still works in memory.
    }
  },
}));

// Visual constant used everywhere a $ amount would be.
export const REDACTED = '•••••';

// Convenience: returns a function that either passes through the input
// or returns REDACTED based on the current privacy state.
export function maskFn(hidden: boolean): (value: string) => string {
  return (value: string) => (hidden ? REDACTED : value);
}
