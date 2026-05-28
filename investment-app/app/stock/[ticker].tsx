import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { fetchQuotes, fetchChart, type Candle } from '../../lib/prices';
import { supabase } from '../../lib/supabase';
import type { NewsArticle, Quote } from '../../lib/types';
import { NewsCard } from '../../components/NewsCard';

type Range = '1d' | '5d' | '1mo';

export default function StockDetail() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const t = (ticker ?? '').toUpperCase();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [range, setRange] = useState<Range>('1d');
  const [chart, setChart] = useState<Candle[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    (async () => {
      const [qs, candles, { data }] = await Promise.all([
        fetchQuotes([t]),
        fetchChart(t, range),
        supabase.from('news_articles').select('*').eq('ticker', t)
          .order('published_at', { ascending: false }).limit(60),
      ]);
      setQuote(qs[0] ?? null);
      setChart(candles);
      setNews((data ?? []) as NewsArticle[]);
    })();
  }, [t, range]);

  const positive = (quote?.change_pct ?? 0) >= 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: t }} />
      <FlatList
        data={news}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={
          <View>
            <View style={{ padding: 16 }}>
              <Text style={styles.name}>{quote?.name ?? ''}</Text>
              <Text style={styles.price}>
                {quote ? `$${quote.price.toFixed(2)}` : <ActivityIndicator />}
              </Text>
              {quote && (
                <Text style={[styles.change, { color: positive ? '#0a8a3f' : '#c83a3a' }]}>
                  {positive ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_pct.toFixed(2)}%)
                </Text>
              )}
            </View>
            <ChartSvg candles={chart} positive={positive} />
            <View style={styles.rangeRow}>
              {(['1d','5d','1mo'] as Range[]).map((r) => (
                <Pressable key={r} onPress={() => setRange(r)}
                  style={[styles.rangeBtn, range === r && styles.rangeBtnOn]}>
                  <Text style={[styles.rangeText, range === r && { color: '#fff' }]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionHeader}>Recent news</Text>
          </View>
        }
        renderItem={({ item }) => <NewsCard article={item} />}
        ListEmptyComponent={<Text style={{ padding: 16, color: '#666' }}>No news yet for {t}.</Text>}
      />
    </View>
  );
}

function ChartSvg({ candles, positive }: { candles: Candle[]; positive: boolean }) {
  if (candles.length < 2) return <View style={{ height: 160 }} />;
  const w = 360, h = 160, pad = 8;
  const ys = candles.map((c) => c.close);
  const min = Math.min(...ys), max = Math.max(...ys);
  const xs = candles.map((c) => c.t);
  const xmin = xs[0], xmax = xs[xs.length - 1];
  const px = (t: number) => pad + ((t - xmin) / (xmax - xmin || 1)) * (w - 2 * pad);
  const py = (y: number) => h - pad - ((y - min) / (max - min || 1)) * (h - 2 * pad);
  const d = candles.map((c, i) =>
    (i === 0 ? 'M' : 'L') + px(c.t).toFixed(1) + ' ' + py(c.close).toFixed(1)).join(' ');
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} stroke={positive ? '#0a8a3f' : '#c83a3a'} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 14, color: '#666' },
  price: { fontSize: 34, fontWeight: '700', color: '#111', marginTop: 4 },
  change: { fontSize: 15, marginTop: 2 },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#eef0f4' },
  rangeBtnOn: { backgroundColor: '#0a84ff' },
  rangeText: { fontSize: 13, color: '#333', fontWeight: '600' },
  sectionHeader: { fontSize: 13, color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e4e9' },
});
