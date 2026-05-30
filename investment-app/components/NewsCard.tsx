import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '../lib/types';
import { useTheme } from '../lib/theme';

export function NewsCard({ article }: { article: NewsArticle }) {
  const { colors } = useTheme();
  const sentiment = article.sentiment ?? 'neutral';
  const sentColor =
    sentiment === 'positive' ? colors.pos :
    sentiment === 'negative' ? colors.neg :
    colors.textMuted;

  const time = (() => {
    try {
      return formatDistanceToNow(new Date(article.published_at), { addSuffix: true });
    } catch { return ''; }
  })();

  return (
    <Pressable
      onPress={() => Linking.openURL(article.url)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.metaRow}>
        <Text style={[styles.ticker, { color: colors.accent }]}>{article.ticker}</Text>
        <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
        <Text style={[styles.source, { color: colors.textSecondary }]}>{article.source}</Text>
        <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
        <View style={{ flex: 1 }} />
        {!!article.impact_score && article.impact_score >= 70 && (
          <Text style={[styles.impact, { color: colors.neg }]}>🔔 high impact</Text>
        )}
      </View>
      <Text style={[styles.headline, { color: colors.text }]}>{article.headline}</Text>
      {article.summary ? (
        <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
      <View style={[styles.sentDot, { backgroundColor: sentColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ticker: { fontSize: 12, fontWeight: '700' },
  dot: { fontSize: 12, marginHorizontal: 4 },
  source: { fontSize: 12, textTransform: 'capitalize' },
  time: { fontSize: 12 },
  impact: { fontSize: 11, fontWeight: '600' },
  headline: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  summary: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  sentDot: {
    position: 'absolute', left: 4, top: 16,
    width: 4, height: 36, borderRadius: 2,
  },
});
