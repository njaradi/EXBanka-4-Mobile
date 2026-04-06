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
import { getMyLoans } from '../../services/loanService';
import { card, colors } from '../../theme';

const LOAN_TYPE_LABELS = {
  CASH:        'Gotovinski kredit',
  HOUSING:     'Stambeni kredit',
  AUTO:        'Auto kredit',
  REFINANCING: 'Refinansirajući kredit',
  STUDENT:     'Studentski kredit',
};

const STATUS_COLORS = {
  PENDING:   colors.warning,
  APPROVED:  colors.success,
  REJECTED:  colors.error,
  PAID_OFF:  colors.textMuted,
  IN_DELAY:  colors.error,
};

const STATUS_LABELS = {
  PENDING:   'Na čekanju',
  APPROVED:  'Odobren',
  REJECTED:  'Odbijen',
  PAID_OFF:  'Otplaćen',
  IN_DELAY:  'U kašnjenju',
};

function fmtAmt(amount, currency) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function LoanItem({ item, onPress }) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.loanType} numberOfLines={1}>
          {LOAN_TYPE_LABELS[item.loanType] ?? item.loanType}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.loanNumber}>Br. kredita: {item.loanNumber}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.amount}>{fmtAmt(item.amount, item.currency)}</Text>
        <Text style={styles.period}>{item.repaymentPeriod} rata</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LoansScreen({ navigation }) {
  const [loans, setLoans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyLoans();
      setLoans(data ?? []);
    } catch {
      setError('Nije moguće učitati kredite.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{error || 'Nemate aktivnih kredita.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <LoanItem
            item={item}
            onPress={() => navigation.navigate('LoanDetail', { loanId: item.id })}
          />
        )}
      />
      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => navigation.navigate('LoanApplication')}
      >
        <Text style={styles.applyBtnText}>Zahtev za kredit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list:      { padding: 16, paddingBottom: 8 },

  card:       { ...card, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  loanType:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  statusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  loanNumber: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  amount:     { fontSize: 20, fontWeight: '700', color: colors.primary },
  period:     { fontSize: 13, color: colors.textSecondary },

  applyBtn:     { margin: 16, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
