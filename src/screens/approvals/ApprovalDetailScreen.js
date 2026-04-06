import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { getApprovalById, approveRequest, rejectRequest } from '../../services/approvalService';
import { colors, status as statusColors, card } from '../../theme';

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? '—'}</Text>
  </View>
);

const PaymentPayload = ({ payload }) => (
  <>
    <Row label="Iznos" value={`${payload.amount} ${payload.currency}`} />
    <Row label="Račun pošiljaoca" value={payload.fromAccount} />
    <Row label="Račun primaoca" value={payload.toAccount} />
    <Row label="Naziv primaoca" value={payload.recipientName} />
    <Row label="Svrha" value={payload.purpose} />
    <Row label="Poziv na broj" value={payload.referenceNumber} />
    <Row label="Šifra plaćanja" value={payload.paymentCode} />
  </>
);

const TransferPayload = ({ payload }) => (
  <>
    <Row label="Sa računa" value={payload.fromAccount} />
    <Row label="Na račun" value={payload.toAccount} />
    <Row label="Iznos" value={`${payload.amount} ${payload.currency}`} />
    {payload.exchangeRate && <Row label="Kurs" value={payload.exchangeRate} />}
    {payload.fee != null && <Row label="Provizija" value={`${payload.fee} ${payload.currency}`} />}
  </>
);

const LoginPayload = ({ payload }) => (
  <>
    <Row label="Datum i vreme" value={payload.timestamp} />
    {payload.device && <Row label="Uređaj" value={payload.device} />}
    {payload.location && <Row label="Lokacija" value={payload.location} />}
  </>
);

const LimitChangePayload = ({ payload }) => (
  <>
    <Row label="Račun" value={payload.accountNumber} />
    {payload.dailyLimit != null && (
      <Row label="Dnevni limit" value={`${payload.oldDailyLimit} → ${payload.dailyLimit} RSD`} />
    )}
    {payload.monthlyLimit != null && (
      <Row label="Mesečni limit" value={`${payload.oldMonthlyLimit} → ${payload.monthlyLimit} RSD`} />
    )}
  </>
);

const PAYLOAD_COMPONENTS = {
  PAYMENT: PaymentPayload,
  TRANSFER: TransferPayload,
  LOGIN: LoginPayload,
  LIMIT_CHANGE: LimitChangePayload,
};

const ACTION_LABELS = {
  LOGIN: 'Pokušaj prijave',
  PAYMENT: 'Plaćanje',
  TRANSFER: 'Transfer između računa',
  LIMIT_CHANGE: 'Promena limita računa',
  CARD_REQUEST: 'Zahtev za karticu',
};

export default function ApprovalDetailScreen({ navigation, route }) {
  const { approvalId } = route.params;
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApproval = useCallback(async () => {
    try {
      const data = await getApprovalById(approvalId);
      setApproval(data);
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati detalje zahteva.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => { fetchApproval(); }, [fetchApproval]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await approveRequest(approvalId);
      await fetchApproval();
      Alert.alert('Uspešno', 'Akcija uspešno odobrena.');
    } catch {
      Alert.alert('Greška', 'Odobravanje nije uspelo. Pokušajte ponovo.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    Alert.alert('Potvrda', 'Da li ste sigurni da želite da odbijete ovu akciju?', [
      { text: 'Ne', style: 'cancel' },
      {
        text: 'Odbij', style: 'destructive',
        onPress: async () => {
          setActionLoading('reject');
          try {
            await rejectRequest(approvalId);
            await fetchApproval();
            Alert.alert('Odbijeno', 'Akcija je odbijena.');
          } catch {
            Alert.alert('Greška', 'Odbijanje nije uspelo. Pokušajte ponovo.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const isPending = approval.status === 'PENDING';
  const PayloadComponent = PAYLOAD_COMPONENTS[approval.type];
  const statusColor = statusColors[approval.status] ?? colors.textMuted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.actionTitle}>{ACTION_LABELS[approval.type] ?? approval.type}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{approval.status}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(approval.createdAt).toLocaleString('sr-RS')}
        </Text>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>DETALJI AKCIJE</Text>
        {PayloadComponent
          ? <PayloadComponent payload={approval.payload ?? {}} />
          : <Text style={styles.noPayload}>Nema dodatnih podataka.</Text>}
      </View>

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, actionLoading && styles.btnDisabled]}
            onPress={handleReject}
            disabled={!!actionLoading}
          >
            {actionLoading === 'reject'
              ? <ActivityIndicator color={colors.error} />
              : <Text style={styles.rejectText}>ODBIJ</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveBtn, actionLoading && styles.btnDisabled]}
            onPress={handleApprove}
            disabled={!!actionLoading}
          >
            {actionLoading === 'approve'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.approveText}>ODOBRI</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!isPending && (
        <Text style={styles.resolvedNote}>
          Ovaj zahtev je već {approval.status === 'APPROVED' ? 'odobren' : approval.status === 'REJECTED' ? 'odbijen' : 'istekao'}.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { ...card, padding: 20, alignItems: 'center', marginBottom: 8 },
  actionTitle: { fontSize: 17, fontWeight: '500', color: colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  badge: { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 12, color: colors.textMuted },
  detailCard: { ...card, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: colors.textMuted, marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  noPayload: { color: colors.textMuted, fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  rejectBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.error, borderRadius: 4,
    paddingVertical: 16, alignItems: 'center',
  },
  rejectText: { color: colors.error, fontWeight: '600', fontSize: 12, letterSpacing: 1.5 },
  approveBtn: {
    flex: 1, backgroundColor: colors.success, borderRadius: 4,
    paddingVertical: 16, alignItems: 'center',
  },
  approveText: { color: '#fff', fontWeight: '600', fontSize: 12, letterSpacing: 1.5 },
  btnDisabled: { opacity: 0.5 },
  resolvedNote: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 16 },
});
