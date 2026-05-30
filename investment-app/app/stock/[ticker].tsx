import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { fetchQuotes, fetchChart, type ChartData } from '../../lib/prices';
import { supabase } from '../../lib/supabase';
import type { NewsArticle, Quote } from '../../lib/types';
import { NewsCard } from '../../components/NewsCard';
import { useTheme } from '../../lib/theme';

type Range = '1d' | '5d' | '1mo';
const RANGES: Range[] = ['1d', '5d', '1mo'];

export default function StockDetail() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const t = (ticker ?? '').toUpperCase();
  const { colors } = useTheme();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [activeRange, setActiveRange] = useState<Range>('1d');
  const [chartByRange, setChartByRange] = useState<Record<Range, ChartData | null>>({
    '1d': null, '5d': null, '1mo': null,
  });
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t }} />
      <FlatList
        data={news}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={
          <View>
            <View style={{ padding: 16 }}>
              <Text style={[styles.name, { color: colors.textSecondary }]}>{quote?.name ?? ''}</Text>
              <Text style={[styles.price, { color: colors.text }]}>
                {quote ? `$${quote.price.toFixed(2)}` : <ActivityIndicator />}
              </Text>
              {quote && (
                <Text style={[styles.change, { color: positive ? colors.pos : colors.neg }]}>
                  {positive ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_pct.toFixed(2)}%)
                  <Text style={[styles.changeLabel, { color: colors.textMuted }]}>  today</Text>
                </Text>
              )}
            </View>

            <ChartSvg
              candles={activeChart?.candles ?? []}
              positive={(activeChart?.changePct ?? 0) >= 0}
              colors={colors}
            />

            <View style={styles.rangeRow}>
              {RANGES.map((r) => {
                const data = chartByRange[r];
                const isOn = activeRange === r;
                const pctVal = data?.changePct;
                const periodColor = pctVal == null
                  ? colors.textMuted
                  : pctVal >= 0 ? colors.pos : colors.neg;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setActiveRange(r)}
                    style={[
                      styles.rangeBtn,
                      { backgroundColor: isOn ? colors.pillBgOn : colors.pillBg },
                    ]}
                  >
                    <Text style={[
                      styles.rangeLabel,
                      { color: isOn ? colors.pillTextOn : colors.textSecondary },
                    ]}>{r}</Text>
                    <Text style={[
                      styles.rangePct,
                      { color: isOn ? colors.pillTextOn : periodColor },
                    ]}>
                      {pctVal == null ? '…' : `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(2)}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {activeChart && activeChart.changePct != null && (
              <View style={styles.periodSummary}>
                <Text style={[styles.periodSummaryLabel, { color: colors.textMuted }]}>
                  Last {activeRange}
                </Text>
                <Text style={[
                  styles.periodSummaryValue,
                  { color: activeChart.changePct >= 0 ? colors.pos : colors.neg },
                ]}>
                  {activeChart.changePct >= 0 ? '+' : ''}{activeChart.changePct.toFixed(2)}%
                  {activeChart.changeAbs != null && (
                    <Text style={styles.periodSummaryAbs}>
                      {'   '}
                      {activeChart.changeAbs >= 0 ? '+' : '-'}$
                      {Math.abs(activeChart.changeAbs).toFixed(2)}
                    </Text>
                  )}
                </Text>
              </View>
            )}

            <Text style={[
              styles.sectionHeader,
              { color: colors.textMuted, borderTopColor: colors.border },
            ]}>Recent news</Text>
          </View>
        }
        renderItem={({ item }) => <NewsCard article={item} />}
        ListEmptyComponent={
          <Text style={{ padding: 16, color: colors.textSecondary }}>No news yet for {t}.</Text>
        }
      />
    </View>
  );
}

function ChartSvg({
  candles, positive, colors,
}: {
  candles: { t: number; close: number }[];
  positive: boolean;
  colors: { pos: string; neg: string };
}) {
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
      <Path d={d} stroke={positive ? colors.pos : colors.neg} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 14 },
  price: { fontSize: 34, fontWeight: '700', marginTop: 4 },
  change: { fontSize: 15, marginTop: 2, fontWeight: '600' },
  changeLabel: { fontWeight: '400', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  rangeBtn: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    alignItems: 'center',
  },
  rangeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rangePct: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  periodSummary: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
  },
  periodSummaryLabel: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  periodSummaryValue: { fontSize: 16, fontWeight: '700' },
  periodSummaryAbs: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
