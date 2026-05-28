import { useEffect, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, Text, TextInput, View, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { searchTicker, type TickerSearchHit } from '../lib/prices';
import { usePortfolio } from '../store/portfolio';

type Props = { visible: boolean; onClose: () => void };

export function AddHoldingModal({ visible, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<TickerSearchHit[]>([]);
  const [selected, setSelected] = useState<TickerSearchHit | null>(null);
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const add = usePortfolio((s) => s.addHolding);

  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    const t = setTimeout(async () => {
      const r = await searchTicker(query);
      setHits(r);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function reset() {
    setQuery(''); setHits([]); setSelected(null); setShares(''); setCost('');
  }

  async function submit() {
    if (!selected) return;
    await add({
      ticker: selected.symbol,
      name: selected.shortname ?? selected.longname,
      shares: shares ? Number(shares) : undefined,
      cost_basis: cost ? Number(cost) : undefined,
    });
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => { reset(); onClose(); }}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>Add holding</Text>
          <Pressable onPress={submit} disabled={!selected}>
            <Text style={[styles.save, !selected && { opacity: 0.4 }]}>Add</Text>
          </Pressable>
        </View>
        <View style={{ padding: 16 }}>
          <TextInput
            style={styles.input}
            placeholder="Search ticker or company (AAPL, Nvidia, ...)"
            value={selected ? selected.symbol : query}
            onChangeText={(t) => { setSelected(null); setQuery(t); }}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {!selected && (
            <FlatList
              data={hits}
              keyExtractor={(i) => i.symbol}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.hit} onPress={() => setSelected(item)}>
                  <Text style={styles.hitSym}>{item.symbol}</Text>
                  <Text style={styles.hitName} numberOfLines={1}>
                    {item.shortname ?? item.longname}
                  </Text>
                </Pressable>
              )}
            />
          )}
          {selected && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Shares (optional)</Text>
              <TextInput style={styles.input} value={shares} onChangeText={setShares} keyboardType="decimal-pad" placeholder="0" />
              <Text style={styles.label}>Cost basis per share (optional)</Text>
              <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e4e9',
  },
  title: { fontSize: 16, fontWeight: '600' },
  cancel: { color: '#0a84ff', fontSize: 16 },
  save: { color: '#0a84ff', fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#dcdfe5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 8,
    backgroundColor: '#fff',
  },
  label: { fontSize: 13, color: '#666', marginTop: 8, marginBottom: 4 },
  hit: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  hitSym: { fontWeight: '700', color: '#0a84ff' },
  hitName: { color: '#555', fontSize: 13, marginTop: 2 },
});
