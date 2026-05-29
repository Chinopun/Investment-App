import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ensureNotificationPermission,
  scheduleDailyDigestReminder,
  registerBackgroundDigestRefresh,
} from '../lib/notifications';
import { usePrivacy } from '../store/privacy';

export default function RootLayout() {
  useEffect(() => {
    // Restore the privacy toggle ASAP (before screens render values).
    usePrivacy.getState().load();
    (async () => {
      const granted = await ensureNotificationPermission();
      if (granted) {
        await scheduleDailyDigestReminder(8, 5);
        await registerBackgroundDigestRefresh();
      }
    })();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ title: 'Portfolio' }} />
      <Stack.Screen
        name="stock/[ticker]"
        options={{ headerShown: true, title: '', headerBackTitle: 'Portfolio' }}
      />
      <Stack.Screen
        name="digest/[date]"
        options={{ headerShown: true, title: 'Daily Digest', headerBackTitle: 'Portfolio' }}
      />
    </Stack>
  );
}
