import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPaymentById } from '../../services/paymentService';
import { card, colors } from '../../theme';

const STATUS_COLORS = {
  COMPLETED: colors.success,
  PENDING:   colors.warning,
  FAILED:    colors.error,
};

function Row({ label, value }) {
  if (value == null || value === '' || value === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function fmt(amount) {
  if (amount == null) return '—';
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('sr-RS');
}

export default function PaymentDetailScreen({ route }) {
  const { paymentId } = route.params;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentById(paymentId)
      .then(setPayment)
      .catch(() => Alert.alert('Greška', 'Nije moguće učitati detalje plaćanja.'))
      .finally(() => setLoading(false));
  }, [paymentId]);

  const handlePrint = async () => {
    if (!payment) return;
    const text = [
      'POTVRDA O PLAĆANJU',
      '==================',
      `Nalog broj:      ${payment.orderNumber || '—'}`,
      `Datum i vreme:   ${fmtDate(payment.timestamp)}`,
      `Status:          ${payment.status}`,
      '',
      `Pošiljalac:      ${payment.senderName || '—'}`,
      `Sa računa:       ${payment.fromAccount}`,
      `Primalac:        ${payment.recipientName || '—'}`,
      `Na račun:        ${payment.toAccount}`,
      '',
      `Iznos:           ${fmt(payment.initialAmount)} RSD`,
      `Konačan iznos:   ${fmt(payment.finalAmount)} RSD`,
      `Provizija:       ${fmt(payment.fee)} RSD`,
      '',
      `Svrha:           ${payment.purpose || '—'}`,
      `Šifra plaćanja:  ${payment.paymentCode || '—'}`,
      `Poziv na broj:   ${payment.referenceNumber || '—'}`,
    ].join('\n');

    try {
      await Share.share({ message: text, title: 'Potvrda o plaćanju' });
    } catch {
      // user cancelled share — no action needed
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!payment) {
    return <View style={styles.center}><Text style={styles.errorText}>Plaćanje nije pronađeno.</Text></View>;
  }

  const statusColor = STATUS_COLORS[payment.status] ?? colors.textMuted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroAmount}>-{fmt(payment.finalAmount)} RSD</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{payment.status}</Text>
        </View>
        <Text style={styles.heroDate}>{fmtDate(payment.timestamp)}</Text>
      </View>

      {/* Parties */}
      <Text style={styles.sectionTitle}>Strane u plaćanju</Text>
      <View style={[card, styles.section]}>
        <Row label="Pošiljalac"    value={payment.senderName} />
        <Row label="Sa računa"     value={payment.fromAccount} />
        <Row label="Primalac"      value={payment.recipientName} />
        <Row label="Na račun"      value={payment.toAccount} />
      </View>

      {/* Amounts */}
      <Text style={styles.sectionTitle}>Finansijski detalji</Text>
      <View style={[card, styles.section]}>
        <Row label="Iznos"          value={`${fmt(payment.initialAmount)} RSD`} />
        <Row label="Konačan iznos"  value={`${fmt(payment.finalAmount)} RSD`} />
        <Row label="Provizija"      value={`${fmt(payment.fee)} RSD`} />
      </View>

      {/* Payment info */}
      <Text style={styles.sectionTitle}>Podaci naloga</Text>
      <View style={[card, styles.section]}>
        <Row label="Nalog broj"      value={payment.orderNumber} />
        <Row label="Svrha plaćanja"  value={payment.purpose} />
        <Row label="Šifra plaćanja"  value={payment.paymentCode} />
        <Row label="Poziv na broj"   value={payment.referenceNumber} />
      </View>

      <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
        <Text style={styles.printBtnText}>Štampaj potvrdu</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },

  hero:       { backgroundColor: colors.primary, padding: 24, paddingTop: 32, alignItems: 'center' },
  heroAmount: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 10 },
  badge:      { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  badgeText:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroDate:   { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 20, marginBottom: 6, paddingHorizontal: 16,
  },
  section: { marginHorizontal: 16, borderRadius: 8 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },

  printBtn:     { margin: 16, marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  printBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
