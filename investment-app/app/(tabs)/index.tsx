import { useCallback, useEffect, useState } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View, SafeAreaView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePortfolio } from '../../store/portfolio';
import { PortfolioRow } from '../../components/PortfolioRow';
import { AddHoldingModal } from '../../components/AddHoldingModal';
import { format } from 'date-fns';

export default function PortfolioHome() {
  const { holdings, quotes, loading, refresh } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const totalValue = holdings.reduce((sum, h) => {
    const q = quotes[h.ticker];
    return sum + (q && h.shares ? q.price * h.shares : 0);
  }, 0);
  const totalDay = holdings.reduce((sum, h) => {
    const q = quotes[h.ticker];
    return sum + (q && h.shares ? q.change * h.shares : 0);
  }, 0);
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <Pressable onPress={() => router.push(`/digest/${today}`)}>
          <Text style={styles.digestLink}>Today’s digest →</Text>
        </Pressable>
      </View>
      {holdings.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.totalLabel}>Total value</Text>
          <Text style={styles.totalValue}>${totalValue.toFixed(2)}</Text>
          <Text style={[styles.totalChange, { color: totalDay >= 0 ? '#0a8a3f' : '#c83a3a' }]}>
            {totalDay >= 0 ? '+' : ''}${totalDay.toFixed(2)} today
          </Text>
        </View>
      )}
      <FlatList
        data={holdings}
        keyExtractor={(h) => h.id}
        renderItem={({ item }) => <PortfolioRow holding={item} quote={quotes[item.ticker]} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No holdings yet</Text>
            <Text style={styles.emptyBody}>
              Tap “Add holding” to start tracking your stocks. News and morning digests will follow automatically.
            </Text>
          </View>
        }
      />
      <Pressable onPress={() => setShowAdd(true)} style={styles.fab}>
        <Text style={styles.fabText}>＋ Add holding</Text>
      </Pressable>
      <AddHoldingModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 6, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  digestLink: { fontSize: 14, color: '#0a84ff', paddingBottom: 4 },
  summary: {
    paddingHorizontal: 16, paddingBottom: 16,
  },
  totalLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 32, fontWeight: '700', color: '#111', marginTop: 4 },
  totalChange: { fontSize: 14, marginTop: 2 },
  empty: { paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: 18, bottom: 22,
    backgroundColor: '#0a84ff', borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
