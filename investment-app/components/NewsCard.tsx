import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import type { NewsArticle } from '../lib/types';

const SENT_COLOR: Record<string, string> = {
  positive: '#0a8a3f',
  negative: '#c83a3a',
  neutral: '#777',
};

export function NewsCard({ article }: { article: NewsArticle }) {
  const sentiment = article.sentiment ?? 'neutral';
  const time = (() => {
    try {
      return formatDistanceToNow(new Date(article.published_at), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <Pressable
      onPress={() => Linking.openURL(article.url)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.metaRow}>
        <Text style={styles.ticker}>{article.ticker}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.source}>{article.source}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.time}>{time}</Text>
        <View style={{ flex: 1 }} />
        {!!article.impact_score && article.impact_score >= 70 && (
          <Text style={styles.impact}>🔔 high impact</Text>
        )}
      </View>
      <Text style={styles.headline}>{article.headline}</Text>
      {article.summary ? (
        <Text style={styles.summary} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
      <View style={[styles.sentDot, { backgroundColor: SENT_COLOR[sentiment] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e4e9',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ticker: { fontSize: 12, fontWeight: '700', color: '#0a84ff' },
  dot: { fontSize: 12, color: '#999', marginHorizontal: 4 },
  source: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  time: { fontSize: 12, color: '#999' },
  impact: { fontSize: 11, color: '#c83a3a', fontWeight: '600' },
  headline: { fontSize: 15, fontWeight: '600', color: '#111', lineHeight: 20 },
  summary: { fontSize: 13, color: '#444', marginTop: 6, lineHeight: 18 },
  sentDot: {
    position: 'absolute',
    left: 4,
    top: 16,
    width: 4,
    height: 36,
    borderRadius: 2,
  },
});
