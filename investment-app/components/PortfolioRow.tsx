import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Holding, Quote } from '../lib/types';
import { REDACTED } from '../store/privacy';
import { useTheme } from '../lib/theme';

type Props = {
  holding: Holding;
  quote?: Quote;
  onEdit?: (h: Holding) => void;
  hidden?: boolean;
};

const sign = (n: number) => (n >= 0 ? '+' : '-');
const cur = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => Math.abs(n).toFixed(2);

export function PortfolioRow({ holding, quote, onEdit, hidden = false }: Props) {
  const router = useRouter();
  const { colors } = useTheme();

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

  const allTimeColor = allTimeAbs == null ? colors.textSecondary : allTimeAbs >= 0 ? colors.pos : colors.neg;
  const dayColor = dayAbs == null ? colors.textSecondary : dayAbs >= 0 ? colors.pos : colors.neg;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => router.push(`/stock/${holding.ticker}`)}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.ticker, { color: colors.text }]}>{holding.ticker}</Text>
          <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
            {quote?.name ?? holding.name ?? ''}
          </Text>
          {shares != null && (
            <Text style={[styles.shares, { color: colors.textMuted }]} numberOfLines={1}>
              {shares} sh{cost != null && ` @ $${cost.toFixed(2)}`}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          <Text style={[styles.allTimePct, { color: allTimeColor }]} numberOfLines={1}>
            {allTimePct == null ? '—' : `${sign(allTimePct)}${pct(allTimePct)}%`}
          </Text>
          <Text style={[styles.allTimeAbs, { color: allTimeColor }]} numberOfLines={1}>
            {allTimeAbs == null
              ? <Text style={{ color: colors.textMuted, fontWeight: '400' }}>all time</Text>
              : <>
                  {hidden ? REDACTED : `${sign(allTimeAbs)}$${cur(allTimeAbs)}`}
                  <Text style={{ color: colors.textMuted, fontWeight: '400' }}>  all time</Text>
                </>
            }
          </Text>

          <Text style={[styles.today, { color: dayColor }]} numberOfLines={1}>
            {dayPct == null
              ? <Text style={{ color: colors.textMuted, fontWeight: '400' }}>today</Text>
              : <>
                  {sign(dayPct)}{pct(dayPct)}%
                  {dayAbs != null && `  ${hidden ? REDACTED : `${sign(dayAbs)}$${cur(dayAbs)}`}`}
                  <Text style={{ color: colors.textMuted, fontWeight: '400' }}>  today</Text>
                </>
            }
          </Text>

          <Text style={[styles.valueLine, { color: colors.textSecondary }]} numberOfLines={1}>
            {totalValue == null ? '—' : hidden ? REDACTED : `$${cur(totalValue)}`}
            {price != null && (
              <>
                <Text style={{ color: colors.textMuted }}>  ·  </Text>
                <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>${cur(price)}</Text>
                <Text style={{ color: colors.textMuted }}>/sh</Text>
              </>
            )}
          </Text>
        </View>
      </Pressable>

      {onEdit && (
        <Pressable
          onPress={() => onEdit(holding)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.editBtn,
            { borderLeftColor: colors.borderLight },
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={[styles.editIcon, { color: colors.accent }]}>✎</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', // vertically center the left column relative to the taller right column
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ticker: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 12, marginTop: 1 },
  shares: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', minWidth: 130 },
  allTimePct: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  allTimeAbs: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  today: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  valueLine: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  editBtn: {
    paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  editIcon: { fontSize: 16 },
});
