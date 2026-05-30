import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ensureNotificationPermission,
  scheduleDailyDigestReminder,
  registerBackgroundDigestRefresh,
} from '../lib/notifications';
import { usePrivacy } from '../store/privacy';
import { useThemeMode } from '../store/theme';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  useEffect(() => {
    // Restore persisted prefs ASAP (before screens render).
    usePrivacy.getState().load();
    useThemeMode.getState().load();
    (async () => {
      const granted = await ensureNotificationPermission();
      if (granted) {
        await scheduleDailyDigestReminder(8, 5);
        await registerBackgroundDigestRefresh();
      }
    })();
  }, []);

  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.bgRaised },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
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
    </>
  );
}
