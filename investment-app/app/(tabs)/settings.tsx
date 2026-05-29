import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { supabase, getCurrentUserId, USER_EMAIL } from '../../lib/supabase';
import { scheduleDailyDigestReminder } from '../../lib/notifications';
import { usePortfolio } from '../../store/portfolio';

export default function SettingsTab() {
  const [notifyTime, setNotifyTime] = useState('08:00');
  const [tz, setTz] = useState('Asia/Bangkok');
  const { holdings, refresh, removeHolding } = usePortfolio();

  useEffect(() => {
    (async () => {
      const id = await getCurrentUserId();
      if (!id) return;
      const { data } = await supabase.from('users').select('notify_time, tz').eq('id', id).maybeSingle();
      if (data) { setNotifyTime(String(data.notify_time).slice(0,5)); setTz(data.tz); }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{USER_EMAIL}</Text>
        <Text style={styles.label}>Morning digest time (24h, local to {tz})</Text>
        <TextInput
          style={styles.input}
          value={notifyTime}
          onChangeText={setNotifyTime}
          placeholder="07:00"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Time zone</Text>
        <TextInput style={styles.input} value={tz} onChangeText={setTz} autoCapitalize="none" />
        <Pressable style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 24 }]}>Per-stock breaking-news alerts</Text>
        {holdings.map((h) => (
          <View key={h.id} style={styles.toggleRow}>
            <Text style={{ flex: 1, fontWeight: '600' }}>{h.ticker}</Text>
            <Switch value={h.alert_breaking} onValueChange={(v) => toggleAlert(h.id, v)} />
            <Pressable onPress={() => removeHolding(h.id)} style={{ marginLeft: 12 }}>
              <Text style={{ color: '#c83a3a' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 16 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  email: { fontSize: 15, color: '#111' },
  input: {
    borderWidth: 1, borderColor: '#dcdfe5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff',
  },
  btn: { marginTop: 16, backgroundColor: '#0a84ff', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e4e9',
  },
});
