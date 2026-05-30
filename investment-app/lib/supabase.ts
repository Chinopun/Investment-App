import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anon) {
  throw new Error(
    'Supabase URL/key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in investment-app/.env, then restart `npx expo start --clear`.',
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

// The personal-app convention: a single user row keyed by email.
// Set EXPO_PUBLIC_USER_EMAIL in .env to match the row you inserted after running migrations.
export const USER_EMAIL =
  process.env.EXPO_PUBLIC_USER_EMAIL ?? 'chinopun2008@gmail.com';

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
