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
    try { return format(parseISO(date ?? ''), 'EEEE, MMMM d'); } catch { return date; }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Daily Digest' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator style={{ marginTop: 60 }} />}

        {!loading && !digest && (
          <Text style={styles.empty}>
            No digest for {date}. The morning digest is generated automatically each day. If today's
            hasn't been built yet, check back after 8:00 Bangkok time.
          </Text>
        )}

        {digest && (
          <View>
            <Text style={styles.dateLabel}>{title}</Text>
            <Text style={styles.subject}>{digest.subject_line}</Text>
            <View style={styles.divider} />
            <Markdown style={mdStyles}>{digest.body_md}</Markdown>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  dateLabel: {
    fontSize: 12, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8,
  },
  subject: {
    fontSize: 22, fontWeight: '700', color: '#111',
    lineHeight: 28,
  },
  divider: {
    height: StyleSheet.hairlineWidth, backgroundColor: '#e2e4e9',
    marginTop: 16, marginBottom: 16,
  },
  empty: {
    color: '#666', lineHeight: 22, fontSize: 14,
    paddingTop: 24, textAlign: 'center',
  },
});

// Markdown component styles — generous spacing so adjacent blocks never overlap.
const mdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 24, color: '#222' },
  paragraph: { marginTop: 0, marginBottom: 14 },
  heading1: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 22, marginBottom: 10 },
  heading2: {
    fontSize: 18, fontWeight: '700', color: '#111',
    marginTop: 24, marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eef0f4',
  },
  heading3: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 18, marginBottom: 6 },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 2, lineHeight: 22 },
  link: { color: '#0a84ff' },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  hr: { backgroundColor: '#e2e4e9', height: 1, marginVertical: 18 },
  blockquote: {
    backgroundColor: '#f6f7fa',
    borderLeftWidth: 3, borderLeftColor: '#0a84ff',
    paddingHorizontal: 12, paddingVertical: 6,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: '#f0f2f6',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    fontSize: 13,
  },
});
