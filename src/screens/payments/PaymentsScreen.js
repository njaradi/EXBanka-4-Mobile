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
import { getPayments } from '../../services/paymentService';
import { card, colors } from '../../theme';

const STATUS_COLORS = {
  COMPLETED: colors.success,
  PENDING:   colors.warning,
  FAILED:    colors.error,
};

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('sr-RS');
}

function fmtAmt(amount) {
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PaymentItem({ item, onPress }) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
  return (
    <TouchableOpacity style={[card, styles.item]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemMain}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.recipientName || item.toAccount || '—'}
        </Text>
        <Text style={[styles.itemAmount, { color: colors.error }]}>
          -{fmtAmt(item.finalAmount)}
        </Text>
      </View>
      <View style={styles.itemSub}>
        <Text style={styles.itemAccount} numberOfLines={1}>{item.fromAccount}</Text>
        <Text style={styles.itemDate}>{fmtDate(item.timestamp)}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PaymentsScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getPayments();
      setPayments(data ?? []);
    } catch {
      setError('Greška pri učitavanju plaćanja.');
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
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('NewPayment', {})}
        >
          <Text style={styles.actionBtnText}>+ Novo plaćanje</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => navigation.navigate('NewTransfer', {})}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>+ Novi transfer</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nema plaćanja za prikaz.</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PaymentItem
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
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  actionBtn: {
    flex: 1, backgroundColor: colors.primary,
    paddingVertical: 10, borderRadius: 6, alignItems: 'center',
  },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  actionBtnText:       { color: '#fff', fontWeight: '600', fontSize: 13 },
  actionBtnOutlineText:{ color: colors.primary, fontWeight: '600', fontSize: 13 },

  list: { padding: 16, gap: 10, paddingBottom: 40 },

  item:     { padding: 14 },
  itemMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: 8 },
  itemAmount:{ fontSize: 15, fontWeight: '700' },

  itemSub:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemAccount:{ fontSize: 11, color: colors.textMuted, flex: 1 },
  itemDate: { fontSize: 11, color: colors.textMuted },

  badge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
