import { useCallback, useMemo, useState } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View, SafeAreaView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePortfolio } from '../../store/portfolio';
import { PortfolioRow } from '../../components/PortfolioRow';
import { AddHoldingModal } from '../../components/AddHoldingModal';
import { EditHoldingModal } from '../../components/EditHoldingModal';
import { format } from 'date-fns';
import type { Holding } from '../../lib/types';
import { usePrivacy, REDACTED } from '../../store/privacy';
import { useTheme } from '../../lib/theme';

const sign = (n: number) => (n >= 0 ? '+' : '-');
const cur = (n: number) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => Math.abs(n).toFixed(2);

export default function PortfolioHome() {
  const { holdings, quotes, loading, refresh } = usePortfolio();
  const hidden = usePrivacy((s) => s.hidden);
  const togglePrivacy = usePrivacy((s) => s.toggle);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const router = useRouter();
  const { colors } = useTheme();

  // Silent on focus so the RefreshControl doesn't briefly push the list down
  // and leave a phantom gap above the holdings until you scroll.
  useFocusEffect(useCallback(() => { refresh(true); }, [refresh]));

  const totals = useMemo(() => {
    let totalValue = 0;
    let totalDay = 0;
    let trackedCost = 0;
    let trackedValueNow = 0;
    let prevTotalValue = 0;

    for (const h of holdings) {
      const q = quotes[h.ticker];
      if (q && h.shares != null) {
        const positionValue = q.price * h.shares;
        const positionDay = q.change * h.shares;
        totalValue += positionValue;
        totalDay += positionDay;
        prevTotalValue += q.prev_close * h.shares;
        if (h.cost_basis != null) {
          trackedCost += h.cost_basis * h.shares;
          trackedValueNow += positionValue;
        }
      }
    }

    const dayPct = prevTotalValue > 0 ? (totalDay / prevTotalValue) * 100 : null;
    const allTimeAbs = trackedCost > 0 ? trackedValueNow - trackedCost : null;
    const allTimePct = trackedCost > 0 ? (allTimeAbs! / trackedCost) * 100 : null;

    return { totalValue, totalDay, dayPct, allTimeAbs, allTimePct };
  }, [holdings, quotes]);

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const va = (quotes[a.ticker]?.price ?? 0) * (a.shares ?? 0);
      const vb = (quotes[b.ticker]?.price ?? 0) * (b.shares ?? 0);
      if (vb !== va) return vb - va;
      return a.ticker.localeCompare(b.ticker);
    });
  }, [holdings, quotes]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const allTimeColor = totals.allTimeAbs == null ? colors.textSecondary : totals.allTimeAbs >= 0 ? colors.pos : colors.neg;
  const dayColor = totals.totalDay >= 0 ? colors.pos : colors.neg;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
        <Pressable onPress={() => router.push(`/digest/${today}`)}>
          <Text style={[styles.digestLink, { color: colors.accent }]}>Today's digest →</Text>
        </Pressable>
      </View>

      {holdings.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total value</Text>
            <Pressable
              onPress={togglePrivacy}
              hitSlop={10}
              style={({ pressed }) => [
                styles.eyeBtn,
                { backgroundColor: colors.pillBg },
                pressed && { opacity: 0.5 },
              ]}
            >
              <Text style={[styles.eyeText, { color: colors.pillText }]}>
                {hidden ? '👁  Show' : '🙈  Hide'}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {hidden ? REDACTED : `$${cur(totals.totalValue)}`}
          </Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Today</Text>
            <Text style={[styles.metricValue, { color: dayColor }]}>
              {totals.dayPct != null ? `${sign(totals.dayPct)}${pct(totals.dayPct)}%` : '—'}
              {'   '}
              <Text style={[styles.metricValueAbs, { color: dayColor }]}>
                {hidden ? REDACTED : `${sign(totals.totalDay)}$${cur(totals.totalDay)}`}
              </Text>
            </Text>
          </View>

          {totals.allTimeAbs != null && (
            <View style={styles.summaryRow}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>All time</Text>
              <Text style={[styles.metricValue, { color: allTimeColor }]}>
                {sign(totals.allTimePct!)}{pct(totals.allTimePct!)}%
                {'   '}
                <Text style={[styles.metricValueAbs, { color: allTimeColor }]}>
                  {hidden ? REDACTED : `${sign(totals.allTimeAbs)}$${cur(totals.allTimeAbs)}`}
                </Text>
              </Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={sortedHoldings}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => (
          <PortfolioRow
            holding={item}
            quote={quotes[item.ticker]}
            onEdit={setEditing}
            hidden={hidden}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => refresh(false)}
            tintColor={colors.textSecondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No holdings yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Tap "Add holding" to start tracking your stocks. News and morning digests will follow automatically.
            </Text>
          </View>
        }
      />
      <Pressable
        onPress={() => setShowAdd(true)}
        style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.shadow }]}
      >
        <Text style={styles.fabText}>＋ Add holding</Text>
      </Pressable>
      <AddHoldingModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <EditHoldingModal holding={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 6, paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  title: { fontSize: 28, fontWeight: '700' },
  digestLink: { fontSize: 14, paddingBottom: 4 },
  summary: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  eyeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  eyeText: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 30, fontWeight: '700', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  metricLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, width: 70 },
  metricValue: { fontSize: 15, fontWeight: '600' },
  metricValueAbs: { fontSize: 13, fontWeight: '500' },
  empty: { paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: 18, bottom: 22,
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12,
    shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
