import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import type { DailyDigest } from '../../lib/types';
import { format, parseISO } from 'date-fns';

export default function DigestScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId || !date) { setLoading(false); return; }
      const { data } = await supabase
        .from('daily_digests')
        .select('*')
        .eq('user_id', userId)
        .eq('digest_date', date)
        .maybeSingle();
      setDigest((data ?? null) as DailyDigest | null);
      setLoading(false);
    })();
  }, [date]);

  const title = (() => {
    try { return format(parseISO(date ?? ''), 'EEEE, MMM d'); } catch { return date; }
  })();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title: title ?? 'Digest' }} />
      {loading && <ActivityIndicator />}
      {!loading && !digest && (
        <View>
          <Text style={styles.empty}>
            No digest for {date}. The morning digest is generated automatically on weekdays.
            If today’s hasn’t been built yet, check back after 7am ET.
          </Text>
        </View>
      )}
      {digest && (
        <View>
          <Text style={styles.subject}>{digest.subject_line}</Text>
          <Markdown style={mdStyles}>{digest.body_md}</Markdown>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  subject: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },
  empty: { color: '#666', lineHeight: 20 },
});

const mdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: '#222' },
  heading2: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  heading3: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  bullet_list: { marginVertical: 4 },
  link: { color: '#0a84ff' },
  code_inline: { backgroundColor: '#f0f2f6', paddingHorizontal: 4, borderRadius: 4 },
});
