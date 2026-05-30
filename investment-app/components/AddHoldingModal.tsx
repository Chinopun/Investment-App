import { useEffect, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, Text, TextInput, View, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { searchTicker, type TickerSearchHit } from '../lib/prices';
import { usePortfolio } from '../store/portfolio';
import { useTheme } from '../lib/theme';

type Props = { visible: boolean; onClose: () => void };

export function AddHoldingModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bgRaised }]}>
          <Pressable onPress={() => { reset(); onClose(); }}>
            <Text style={[styles.cancel, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Add holding</Text>
          <Pressable onPress={submit} disabled={!selected}>
            <Text style={[styles.save, { color: colors.accent }, !selected && { opacity: 0.4 }]}>Add</Text>
          </Pressable>
        </View>
        <View style={{ padding: 16, flex: 1 }}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
            ]}
            placeholder="Search ticker or company (AAPL, Nvidia, ...)"
            placeholderTextColor={colors.textMuted}
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
                <Pressable
                  style={[styles.hit, { borderBottomColor: colors.borderLight }]}
                  onPress={() => setSelected(item)}
                >
                  <Text style={[styles.hitSym, { color: colors.accent }]}>{item.symbol}</Text>
                  <Text style={[styles.hitName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.shortname ?? item.longname}
                  </Text>
                </Pressable>
              )}
            />
          )}
          {selected && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Shares (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={shares}
                onChangeText={setShares}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Cost basis per share (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '600' },
  cancel: { fontSize: 16 },
  save: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 8,
  },
  label: { fontSize: 13, marginTop: 8, marginBottom: 4 },
  hit: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  hitSym: { fontWeight: '700' },
  hitName: { fontSize: 13, marginTop: 2 },
});
