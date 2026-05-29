// Secondary, in-app local notification (the email is the primary channel).
// On launch we schedule a daily local reminder so even if the email gets buried
// you still see a nudge to open the app and read the digest.

import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase, getCurrentUserId } from './supabase';
import { format } from 'date-fns';

const DAILY_TASK = 'daily-digest-refresh';

// Expo Go's pre-built native shell doesn't include background-mode entitlements,
// so registerTaskAsync throws. Detect it so we can skip cleanly.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyDigestReminder(hour = 7, minute = 5) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Today’s portfolio digest is ready',
      body: 'Tap to open the morning summary.',
      data: { type: 'digest-reminder', date: format(new Date(), 'yyyy-MM-dd') },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

// Background task that pulls the latest digest from Supabase when iOS wakes us.
// Only define + register outside of Expo Go.
if (!isExpoGo) TaskManager.defineTask(DAILY_TASK, async () => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return BackgroundFetch.BackgroundFetchResult.NoData;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('daily_digests')
      .select('subject_line, digest_date')
      .eq('user_id', userId)
      .eq('digest_date', today)
      .maybeSingle();
    if (data) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Markets — morning digest',
          body: data.subject_line,
          data: { type: 'digest', date: data.digest_date },
        },
        trigger: null, // fire now
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.warn('bg fetch failed', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundDigestRefresh() {
  if (Platform.OS === 'web') return;
  if (isExpoGo) {
    // Background fetch requires native entitlements not present in Expo Go.
    // The daily local-notification reminder still works; the email remains
    // the primary delivery channel. This becomes available automatically
    // the day you switch to an EAS development build.
    console.log('[notifications] Skipping background fetch (Expo Go).');
    return;
  }
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;
    await BackgroundFetch.registerTaskAsync(DAILY_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('[notifications] background fetch register failed:', e);
  }
}
