import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url = (Constants.expoConfig?.extra?.supabaseUrl as string) ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = (Constants.expoConfig?.extra?.supabaseAnonKey as string) ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anon) {
  console.warn('Supabase URL/key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

// The personal-app convention: a single user row keyed by email.
// Set EXPO_PUBLIC_USER_EMAIL in .env to match the row you inserted after running migrations.
export const USER_EMAIL =
  process.env.EXPO_PUBLIC_USER_EMAIL ?? 'virojns@gmail.com';

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .maybeSingle();
  if (error) {
    console.warn('getCurrentUserId', error.message);
    return null;
  }
  return data?.id ?? null;
}
