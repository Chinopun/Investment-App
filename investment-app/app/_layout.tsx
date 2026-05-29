import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ensureNotificationPermission,
  scheduleDailyDigestReminder,
  registerBackgroundDigestRefresh,
} from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
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
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="stock/[ticker]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="digest/[date]" options={{ headerShown: true, title: 'Daily Digest' }} />
    </Stack>
  );
}
