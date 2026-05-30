import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Holding, Quote } from '../lib/types';
import { REDACTED } from '../store/privacy';

type Props = {
  holding: Holding;
  quote?: Quote;
  onEdit?: (h: Holding) => void;
  hidden?: boolean;
};

const POS = '#0a8a3f';
const NEG = '#c83a3a';
const sign = (n: number) => (n >= 0 ? '+' : '-');
const cur = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => Math.abs(n).toFixed(2);

export function PortfolioRow({ holding, quote, onEdit, hidden = false }: Props) {
  const router = useRouter();

  const shares = holding.shares;
  const cost = holding.cost_basis;
  const price = quote?.price;

  const totalValue = price != null && shares != null ? price * shares : null;
  const dayAbs = quote && shares != null ? quote.change * shares : null;
  const dayPct = quote?.change_pct ?? null;

  const allTimeAbs =
    price != null && cost != null && shares != null ? (price - cost) * shares : null;
  const allTimePct =
    price != null && cost != null && cost > 0 ? ((price - cost) / cost) * 100 : null;

  const allTimeColor = allTimeAbs == null ? '#666' : allTimeAbs >= 0 ? POS : NEG;
  const dayColor = dayAbs == null ? '#666' : dayAbs >= 0 ? POS : NEG;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push(`/stock/${holding.ticker}`)}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        {/* LEFT — identity */}
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.ticker}>{holding.ticker}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {quote?.name ?? holding.name ?? ''}
          </Text>
          {shares != null && (
            <Text style={styles.shares} numberOfLines={1}>
              {shares} sh{cost != null && ` @ $${cost.toFixed(2)}`}
            </Text>
          )}
        </View>

        {/* RIGHT — change-first stack */}
        <View style={styles.right}>
          {/* All-time (primary) */}
          <Text style={[styles.allTimePct, { color: allTimeColor }]} numberOfLines={1}>
            {allTimePct == null ? '—' : `${sign(allTimePct)}${pct(allTimePct)}%`}
          </Text>
          <Text style={[styles.allTimeAbs, { color: allTimeColor }]} numberOfLines={1}>
            {allTimeAbs == null
              ? <Text style={styles.inlineLabel}>all time</Text>
              : <>
                  {hidden ? REDACTED : `${sign(allTimeAbs)}$${cur(allTimeAbs)}`}
                  <Text style={styles.inlineLabel}>  all time</Text>
                </>
            }
          </Text>

          {/* Today (secondary) */}
          <Text style={[styles.today, { color: dayColor }]} numberOfLines={1}>
            {dayPct == null
              ? <Text style={styles.inlineLabel}>today</Text>
              : <>
                  {sign(dayPct)}{pct(dayPct)}%
                  {dayAbs != null && `  ${hidden ? REDACTED : `${sign(dayAbs)}$${cur(dayAbs)}`}`}
                  <Text style={styles.inlineLabel}>  today</Text>
                </>
            }
          </Text>

          {/* Value + stock price (tertiary) */}
          <Text style={styles.valueLine} numberOfLines={1}>
            {totalValue == null ? '—' : hidden ? REDACTED : `$${cur(totalValue)}`}
            {price != null && (
              <>
                <Text style={styles.inlineLabel}>  ·  </Text>
                <Text style={styles.stockPrice}>${cur(price)}</Text>
                <Text style={styles.inlineLabel}>/sh</Text>
              </>
            )}
          </Text>
        </View>
      </Pressable>

      {onEdit && (
        <Pressable
          onPress={() => onEdit(holding)}
          hitSlop={10}
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e4e9',
  },
  main: {
    flex: 1, flexDirection: 'row',
    paddingVertical: 10, paddingHorizontal: 14,
  },
  // LEFT
  ticker: { fontSize: 16, fontWeight: '700', color: '#111' },
  name: { fontSize: 12, color: '#666', marginTop: 1 },
  shares: { fontSize: 11, color: '#999', marginTop: 2 },

  // RIGHT
  right: { alignItems: 'flex-end', minWidth: 130 },
  allTimePct: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  allTimeAbs: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  today: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  valueLine: { fontSize: 11, fontWeight: '500', color: '#444', marginTop: 4 },
  stockPrice: { color: '#444', fontWeight: '500' },
  inlineLabel: { color: '#999', fontWeight: '400' },

  // edit chip
  editBtn: {
    paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#eef0f4',
  },
  editIcon: { fontSize: 16, color: '#0a84ff' },
});
