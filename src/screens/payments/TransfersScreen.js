import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { getPayments } from '../../services/paymentService';
import { card, colors } from '../../theme';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('sr-RS');
}

function fmtAmt(amount) {
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TransferItem({ item, onPress }) {
  return (
    <TouchableOpacity style={[card, styles.item]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemRow}>
        <Text style={styles.label}>Sa računa</Text>
        <Text style={styles.value} numberOfLines={1}>{item.fromAccount}</Text>
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.label}>Na račun</Text>
        <Text style={styles.value} numberOfLines={1}>{item.toAccount}</Text>
      </View>
      <View style={styles.itemBottom}>
        <Text style={styles.date}>{fmtDate(item.timestamp)}</Text>
        <Text style={styles.amount}>{fmtAmt(item.finalAmount)} RSD</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TransfersScreen({ navigation }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [payments, accounts] = await Promise.all([getPayments(), getMyAccounts()]);
      const myNumbers = new Set((accounts ?? []).map(a => a.accountNumber));
      // A transfer has both fromAccount and toAccount belonging to this user
      const xfers = (payments ?? []).filter(
        p => myNumbers.has(p.fromAccount) && myNumbers.has(p.toAccount)
      );
      setTransfers(xfers);
    } catch {
      setError('Greška pri učitavanju transfera.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('NewTransfer', {})}>
          <Text style={styles.actionBtnText}>+ Novi transfer</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : transfers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nema internih transfera za prikaz.</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TransferItem
              item={item}
              onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  actionBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  actionBtn:     { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  list: { padding: 16, gap: 10, paddingBottom: 40 },

  item:     { padding: 14 },
  itemRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:    { fontSize: 12, color: colors.textMuted },
  value:    { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 8 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  date:     { fontSize: 12, color: colors.textMuted },
  amount:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
