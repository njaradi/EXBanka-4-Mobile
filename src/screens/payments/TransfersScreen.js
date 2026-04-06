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
import { getTransfers } from '../../services/paymentService';
import { card, colors } from '../../theme';

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('sr-RS');
}

function fmtAmt(amount) {
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TransferItem({ item, onPress }) {
  const isCross = item.exchangeRate && item.exchangeRate !== 1;
  return (
    <TouchableOpacity style={[card, styles.item]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <View style={styles.dirIcon}>
          <Text style={styles.dirArrow}>⇄</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemAccounts} numberOfLines={1}>
            {item.fromAccount}
          </Text>
          <Text style={styles.itemAccountsTo} numberOfLines={1}>
            → {item.toAccount}
          </Text>
          <Text style={styles.itemDate}>{fmtDate(item.timestamp)}</Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemAmountSent}>{fmtAmt(item.initialAmount)}</Text>
          {isCross && (
            <Text style={styles.itemAmountReceived}>→ {fmtAmt(item.finalAmount)}</Text>
          )}
        </View>
      </View>
      {(isCross || item.fee > 0) && (
        <View style={styles.itemMeta}>
          {isCross && (
            <Text style={styles.metaText}>Kurs: {Number(item.exchangeRate).toFixed(4)}</Text>
          )}
          {item.fee > 0 && (
            <Text style={styles.metaText}>Provizija: {fmtAmt(item.fee)}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TransfersScreen({ navigation }) {
  const [transfers, setTransfers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getTransfers();
      setTransfers(data ?? []);
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
              onPress={() => navigation.navigate('TransferDetail', { transfer: item })}
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

  list: { padding: 16, gap: 8, paddingBottom: 40 },

  item:        { padding: 12 },
  itemHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dirIcon:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dirArrow:    { fontSize: 16, fontWeight: '700', color: '#0284c7' },
  itemInfo:    { flex: 1, minWidth: 0 },
  itemAccounts:    { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  itemAccountsTo:  { fontSize: 12, color: colors.textMuted },
  itemDate:        { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemRight:       { alignItems: 'flex-end', flexShrink: 0 },
  itemAmountSent:  { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  itemAmountReceived: { fontSize: 12, color: colors.success, marginTop: 2 },

  itemMeta: { flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  metaText: { fontSize: 11, color: colors.textMuted },
});
