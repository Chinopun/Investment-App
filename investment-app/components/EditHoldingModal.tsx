import { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import type { Holding } from '../lib/types';
import { usePortfolio } from '../store/portfolio';

type Props = {
  holding: Holding | null;
  onClose: () => void;
};

export function EditHoldingModal({ holding, onClose }: Props) {
  const updateHolding = usePortfolio((s) => s.updateHolding);
  const removeHolding = usePortfolio((s) => s.removeHolding);
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [alertBreaking, setAlertBreaking] = useState(true);

  useEffect(() => {
    if (!holding) return;
    setShares(holding.shares != null ? String(holding.shares) : '');
    setCost(holding.cost_basis != null ? String(holding.cost_basis) : '');
    setAlertBreaking(holding.alert_breaking);
  }, [holding?.id]);

  if (!holding) return null;

  async function save() {
    if (!holding) return;
    const sharesNum = shares.trim() === '' ? null : Number(shares);
    const costNum = cost.trim() === '' ? null : Number(cost);
    if (sharesNum !== null && !Number.isFinite(sharesNum)) {
      Alert.alert('Invalid input', 'Shares must be a number.'); return;
    }
    if (costNum !== null && !Number.isFinite(costNum)) {
      Alert.alert('Invalid input', 'Cost basis must be a number.'); return;
    }
    await updateHolding(holding.id, {
      shares: sharesNum, cost_basis: costNum, alert_breaking: alertBreaking,
    });
    onClose();
  }

  function confirmDelete() {
    if (!holding) return;
    Alert.alert(
      `Remove ${holding.ticker}?`,
      'This deletes the holding from your portfolio. News for this ticker stops being fetched too. You can re-add it any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await removeHolding(holding.id);
          onClose();
        }},
      ],
    );
  }

  return (
    <Modal visible={!!holding} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>Edit {holding.ticker}</Text>
          <Pressable onPress={save}><Text style={styles.save}>Save</Text></Pressable>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={styles.subtitle} numberOfLines={1}>{holding.name ?? ''}</Text>

          <Text style={styles.label}>Shares held</Text>
          <TextInput
            style={styles.input} value={shares} onChangeText={setShares}
            keyboardType="decimal-pad" placeholder="0" autoFocus
          />

          <Text style={styles.label}>Cost basis per share (USD)</Text>
          <TextInput
            style={styles.input} value={cost} onChangeText={setCost}
            keyboardType="decimal-pad" placeholder="0.00"
          />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Breaking-news alerts</Text>
              <Text style={styles.toggleHint}>Email me when impactful news lands for this ticker</Text>
            </View>
            <Switch value={alertBreaking} onValueChange={setAlertBreaking} />
          </View>

          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Remove from portfolio</Text>
          </Pressable>
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
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#dcdfe5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e4e9',
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleHint: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { marginTop: 32, padding: 14, alignItems: 'center' },
  deleteText: { color: '#c83a3a', fontSize: 15, fontWeight: '600' },
});
