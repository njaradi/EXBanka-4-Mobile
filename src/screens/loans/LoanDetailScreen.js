import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getLoanDetails } from '../../services/loanService';
import { card, colors } from '../../theme';

const LOAN_TYPE_LABELS = {
  gotovinski:      'Gotovinski kredit',
  stambeni:        'Stambeni kredit',
  auto:            'Auto kredit',
  refinansirajuci: 'Refinansirajući kredit',
  studentski:      'Studentski kredit',
};

const RATE_TYPE_LABELS = { fiksna: 'Fiksna', varijabilna: 'Varijabilna' };

const STATUS_COLORS = {
  PENDING:  colors.warning,
  APPROVED: colors.success,
  REJECTED: colors.error,
  PAID_OFF: colors.textMuted,
  IN_DELAY: colors.error,
};
const STATUS_LABELS = {
  PENDING:  'Na čekanju',
  APPROVED: 'Odobren',
  REJECTED: 'Odbijen',
  PAID_OFF: 'Otplaćen',
  IN_DELAY: 'U kašnjenju',
};

const INST_STATUS_COLORS = {
  PAID:   colors.success,
  UNPAID: colors.textMuted,
  LATE:   colors.error,
};
const INST_STATUS_LABELS = {
  PAID:   'Plaćeno',
  UNPAID: 'Neplaćeno',
  LATE:   'Kasni',
};

function fmtAmt(v, currency = '') {
  return `${Number(v).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ' ' + currency : ''}`;
}
function fmtRate(v) {
  return `${Number(v).toFixed(4)}%`;
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InstallmentRow({ item }) {
  const statusColor = INST_STATUS_COLORS[item.status] ?? colors.textMuted;
  return (
    <View style={styles.instRow}>
      <View style={styles.instDates}>
        <Text style={styles.instDue}>{item.expectedDueDate}</Text>
        {item.actualDueDate ? (
          <Text style={styles.instPaid}>Plaćeno: {item.actualDueDate}</Text>
        ) : null}
      </View>
      <Text style={styles.instAmt}>{fmtAmt(item.installmentAmount, item.currency)}</Text>
      <View style={[styles.instBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
        <Text style={[styles.instBadgeText, { color: statusColor }]}>
          {INST_STATUS_LABELS[item.status] ?? item.status}
        </Text>
      </View>
    </View>
  );
}

export default function LoanDetailScreen({ route }) {
  const { loanId } = route.params;
  const [loan, setLoan]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getLoanDetails(loanId);
      setLoan(data);
    } catch {
      setError('Nije moguće učitati detalje kredita.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loanId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !loan) {
    return <View style={styles.center}><Text style={styles.errorText}>{error ?? 'Greška.'}</Text></View>;
  }

  const statusColor = STATUS_COLORS[loan.status] ?? colors.textMuted;

  const header = (
    <View>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor }]}>
        <Text style={[styles.statusBannerText, { color: statusColor }]}>
          {STATUS_LABELS[loan.status] ?? loan.status}
        </Text>
      </View>

      {/* Main info card */}
      <View style={[card, styles.section]}>
        <Text style={styles.sectionTitle}>
          {LOAN_TYPE_LABELS[loan.loanType] ?? loan.loanType}
        </Text>
        <DetailRow label="Broj kredita"      value={String(loan.loanNumber)} />
        <DetailRow label="Račun"             value={loan.accountNumber} />
        <DetailRow label="Vrsta kamate"      value={RATE_TYPE_LABELS[loan.interestRateType] ?? loan.interestRateType} />
        <DetailRow label="Ukupan iznos"      value={fmtAmt(loan.amount, loan.currency)} />
        <DetailRow label="Period otplate"    value={`${loan.repaymentPeriod} rata`} />
        <DetailRow label="Nominalna stopa"   value={fmtRate(loan.nominalRate)} />
        <DetailRow label="Efektivna stopa"   value={fmtRate(loan.effectiveRate)} />
        <DetailRow label="Datum ugovaranja"  value={loan.agreedDate} />
        <DetailRow label="Datum dospeća"     value={loan.maturityDate} />
      </View>

      {/* Current state card — only if approved/in delay */}
      {loan.status === 'APPROVED' || loan.status === 'IN_DELAY' ? (
        <View style={[card, styles.section]}>
          <Text style={styles.sectionTitle}>Trenutno stanje</Text>
          <DetailRow label="Preostalo dugovanje"  value={fmtAmt(loan.remainingDebt, loan.currency)} />
          <DetailRow label="Sledeća rata"         value={fmtAmt(loan.nextInstallmentAmount, loan.currency)} />
          <DetailRow label="Datum sledeće rate"   value={loan.nextInstallmentDate || '—'} />
        </View>
      ) : null}

      {/* Installments header */}
      {loan.installments?.length > 0 && (
        <Text style={styles.instHeader}>Pregled rata ({loan.installments.length})</Text>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={loan.installments ?? []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
          colors={[colors.primary]} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        loan.status === 'PENDING' || loan.status === 'REJECTED'
          ? <Text style={styles.emptyText}>Rate će biti generisane nakon odobrenja.</Text>
          : null
      }
      renderItem={({ item }) => <InstallmentRow item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bgPage },
  content:    { padding: 16, paddingBottom: 32 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:  { color: colors.error, fontSize: 14 },
  emptyText:  { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 },

  statusBanner:     { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  statusBannerText: { fontSize: 14, fontWeight: '700' },

  section:      { padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },

  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
                 borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1 },

  instHeader: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, marginTop: 4 },
  instRow:    { ...card, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  instDates:  { flex: 1 },
  instDue:    { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  instPaid:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  instAmt:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginHorizontal: 8 },
  instBadge:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  instBadgeText: { fontSize: 11, fontWeight: '600' },
});
