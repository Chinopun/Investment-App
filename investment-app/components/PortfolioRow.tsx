import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Holding, Quote } from '../lib/types';

type Props = { holding: Holding; quote?: Quote };

export function PortfolioRow({ holding, quote }: Props) {
  const router = useRouter();
  const positive = (quote?.change_pct ?? 0) >= 0;
  const value = quote && holding.shares ? quote.price * holding.shares : null;
  const dayChange =
    quote && holding.shares ? quote.change * holding.shares : null;

  return (
    <Pressable
      onPress={() => router.push(`/stock/${holding.ticker}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.ticker}>{holding.ticker}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {quote?.name ?? holding.name ?? ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.price}>
          {quote ? `$${quote.price.toFixed(2)}` : '—'}
        </Text>
        <Text style={[styles.change, { color: positive ? '#0a8a3f' : '#c83a3a' }]}>
          {quote
            ? `${positive ? '+' : ''}${quote.change.toFixed(2)} (${quote.change_pct.toFixed(2)}%)`
            : ''}
        </Text>
        {value !== null && (
          <Text style={styles.value}>
            ${value.toFixed(0)}{' '}
            {dayChange !== null && (
              <Text style={{ color: positive ? '#0a8a3f' : '#c83a3a' }}>
                ({positive ? '+' : ''}${dayChange.toFixed(0)})
              </Text>
            )}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e4e9',
    backgroundColor: '#fff',
  },
  ticker: { fontSize: 17, fontWeight: '600', color: '#111' },
  name: { fontSize: 13, color: '#666', marginTop: 2 },
  price: { fontSize: 17, fontWeight: '500', color: '#111' },
  change: { fontSize: 13, marginTop: 2 },
  value: { fontSize: 12, color: '#666', marginTop: 2 },
});
