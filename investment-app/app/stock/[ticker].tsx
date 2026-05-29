import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { fetchQuotes, fetchChart, type ChartData } from '../../lib/prices';
import { supabase } from '../../lib/supabase';
import type { NewsArticle, Quote } from '../../lib/types';
import { NewsCard } from '../../components/NewsCard';

type Range = '1d' | '5d' | '1mo';
const RANGES: Range[] = ['1d', '5d', '1mo'];
const POS = '#0a8a3f';
const NEG = '#c83a3a';

export default function StockDetail() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const t = (ticker ?? '').toUpperCase();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [activeRange, setActiveRange] = useState<Range>('1d');
  const [chartByRange, setChartByRange] = useState<Record<Range, ChartData | null>>({
    '1d': null, '5d': null, '1mo': null,
  });
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fire everything in parallel: live quote, all 3 chart ranges, and news.
      const [qs, c1d, c5d, c1mo, { data }] = await Promise.all([
        fetchQuotes([t]),
        fetchChart(t, '1d'),
        fetchChart(t, '5d'),
        fetchChart(t, '1mo'),
        supabase.from('news_articles').select('*').eq('ticker', t)
          .order('published_at', { ascending: false }).limit(60),
      ]);
      if (cancelled) return;
      setQuote(qs[0] ?? null);
      setChartByRange({ '1d': c1d, '5d': c5d, '1mo': c1mo });
      setNews((data ?? []) as NewsArticle[]);
    })();
    return () => { cancelled = true; };
  }, [t]);

  const positive = (quote?.change_pct ?? 0) >= 0;
  const activeChart = chartByRange[activeRange];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: t }} />
      <FlatList
        data={news}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={
          <View>
            {/* Live quote */}
            <View style={{ padding: 16 }}>
              <Text style={styles.name}>{quote?.name ?? ''}</Text>
              <Text style={styles.price}>
                {quote ? `$${quote.price.toFixed(2)}` : <ActivityIndicator />}
              </Text>
              {quote && (
                <Text style={[styles.change, { color: positive ? POS : NEG }]}>
                  {positive ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_pct.toFixed(2)}%)
                  <Text style={styles.changeLabel}>  today</Text>
                </Text>
              )}
            </View>

            {/* Chart */}
            <ChartSvg
              candles={activeChart?.candles ?? []}
              positive={(activeChart?.changePct ?? 0) >= 0}
            />

            {/* Range pills with each period's % change inline */}
            <View style={styles.rangeRow}>
              {RANGES.map((r) => {
                const data = chartByRange[r];
                const isOn = activeRange === r;
                const pct = data?.changePct;
                const periodColor = pct == null ? '#999' : pct >= 0 ? POS : NEG;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setActiveRange(r)}
                    style={[styles.rangeBtn, isOn && styles.rangeBtnOn]}
                  >
                    <Text style={[styles.rangeLabel, isOn && { color: '#fff' }]}>{r}</Text>
                    <Text
                      style={[
                        styles.rangePct,
                        { color: isOn ? '#fff' : periodColor },
                      ]}
                    >
                      {pct == null
                        ? '…'
                        : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Detailed period summary for the active range */}
            {activeChart && activeChart.changePct != null && (
              <View style={styles.periodSummary}>
                <Text style={styles.periodSummaryLabel}>
                  Last {activeRange}
                </Text>
                <Text
                  style={[
                    styles.periodSummaryValue,
                    { color: activeChart.changePct >= 0 ? POS : NEG },
                  ]}
                >
                  {activeChart.changePct >= 0 ? '+' : ''}{activeChart.changePct.toFixed(2)}%
                  {activeChart.changeAbs != null && (
                    <Text style={styles.periodSummaryAbs}>
                      {'   '}{activeChart.changeAbs >= 0 ? '+' : ''}${Math.abs(activeChart.changeAbs).toFixed(2)}
                    </Text>
                  )}
                </Text>
              </View>
            )}

            <Text style={styles.sectionHeader}>Recent news</Text>
          </View>
        }
        renderItem={({ item }) => <NewsCard article={item} />}
        ListEmptyComponent={
          <Text style={{ padding: 16, color: '#666' }}>No news yet for {t}.</Text>
        }
      />
    </View>
  );
}

function ChartSvg({
  candles, positive,
}: { candles: { t: number; close: number }[]; positive: boolean }) {
  if (candles.length < 2) return <View style={{ height: 160 }} />;
  const w = 360, h = 160, pad = 8;
  const ys = candles.map((c) => c.close);
  const min = Math.min(...ys), max = Math.max(...ys);
  const xs = candles.map((c) => c.t);
  const xmin = xs[0], xmax = xs[xs.length - 1];
  const px = (t: number) => pad + ((t - xmin) / (xmax - xmin || 1)) * (w - 2 * pad);
  const py = (y: number) => h - pad - ((y - min) / (max - min || 1)) * (h - 2 * pad);
  const d = candles
    .map((c, i) => (i === 0 ? 'M' : 'L') + px(c.t).toFixed(1) + ' ' + py(c.close).toFixed(1))
    .join(' ');
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} stroke={positive ? POS : NEG} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 14, color: '#666' },
  price: { fontSize: 34, fontWeight: '700', color: '#111', marginTop: 4 },
  change: { fontSize: 15, marginTop: 2, fontWeight: '600' },
  changeLabel: {
    color: '#999', fontWeight: '400',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  rangeBtn: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#eef0f4',
    alignItems: 'center',
  },
  rangeBtnOn: { backgroundColor: '#0a84ff' },
  rangeLabel: { fontSize: 12, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rangePct: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  periodSummary: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
  },
  periodSummaryLabel: {
    fontSize: 11, color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  periodSummaryValue: { fontSize: 16, fontWeight: '700' },
  periodSummaryAbs: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e4e9',
  },
});
