import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { supabase, getCurrentUserId, USER_EMAIL } from '../../lib/supabase';
import { scheduleDailyDigestReminder } from '../../lib/notifications';
import { usePortfolio } from '../../store/portfolio';
import { useThemeMode, type ThemeMode } from '../../store/theme';
import { useTheme } from '../../lib/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsTab() {
  const [notifyTime, setNotifyTime] = useState('08:00');
  const [tz, setTz] = useState('Asia/Bangkok');
  const { holdings, refresh, removeHolding } = usePortfolio();
  const mode = useThemeMode((s) => s.mode);
  const setMode = useThemeMode((s) => s.setMode);
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      const id = await getCurrentUserId();
      if (!id) return;
      const { data } = await supabase.from('users').select('notify_time, tz').eq('id', id).maybeSingle();
      if (data) { setNotifyTime(String(data.notify_time).slice(0, 5)); setTz(data.tz); }
    })();
  }, []);

  const save = useCallback(async () => {
    const id = await getCurrentUserId();
    if (!id) return;
    await supabase.from('users').update({ notify_time: notifyTime + ':00', tz }).eq('id', id);
    const [h, m] = notifyTime.split(':').map(Number);
    await scheduleDailyDigestReminder(h, m + 5);
    Alert.alert('Saved', 'Notification time updated.');
  }, [notifyTime, tz]);

  async function toggleAlert(id: string, v: boolean) {
    await supabase.from('holdings').update({ alert_breaking: v }).eq('id', id);
    await refresh();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Signed in as</Text>
        <Text style={[styles.email, { color: colors.text }]}>{USER_EMAIL}</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const on = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setMode(opt.value)}
                style={[
                  styles.themePill,
                  { backgroundColor: on ? colors.pillBgOn : colors.pillBg },
                ]}
              >
                <Text
                  style={[
                    styles.themePillText,
                    { color: on ? colors.pillTextOn : colors.pillText },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Morning digest time (24h, local to {tz})
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={notifyTime}
          onChangeText={setNotifyTime}
          placeholder="08:00"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Time zone</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          value={tz}
          onChangeText={setTz}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Pressable style={[styles.btn, { backgroundColor: colors.accent }]} onPress={save}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 24 }]}>
          Per-stock breaking-news alerts
        </Text>
        {holdings.map((h) => (
          <View
            key={h.id}
            style={[styles.toggleRow, { borderBottomColor: colors.border }]}
          >
            <Text style={{ flex: 1, fontWeight: '600', color: colors.text }}>{h.ticker}</Text>
            <Switch value={h.alert_breaking} onValueChange={(v) => toggleAlert(h.id, v)} />
            <Pressable onPress={() => removeHolding(h.id)} style={{ marginLeft: 12 }}>
              <Text style={{ color: colors.neg }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  label: {
    fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 12, marginBottom: 4,
  },
  email: { fontSize: 15 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themePill: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  themePillText: { fontSize: 14, fontWeight: '600' },
  btn: { marginTop: 16, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
