import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import type { NewsArticle } from '../../lib/types';
import { NewsCard } from '../../components/NewsCard';
import { useTheme } from '../../lib/theme';

export default function NewsTab() {
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) { setItems([]); return; }
      const { data: holdings } = await supabase.from('holdings').select('ticker').eq('user_id', userId);
      const tickers = (holdings ?? []).map((r) => r.ticker);
      if (!tickers.length) { setItems([]); return; }
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .in('ticker', tickers)
        .order('published_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setItems((data ?? []) as NewsArticle[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>News</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Updates every 30 min across all sources
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NewsCard article={item} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textSecondary} />
        }
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              No news yet. Add a holding from the Portfolio tab and the feed will populate within 30 minutes.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
});
