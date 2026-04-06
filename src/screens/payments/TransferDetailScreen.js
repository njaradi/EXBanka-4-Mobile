import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { card, colors } from '../../theme';

function Row({ label, value }) {
  if (value == null || value === '' || value === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
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

export default function TransferDetailScreen({ route }) {
  const { transfer } = route.params;
  const isCross = transfer.exchangeRate && transfer.exchangeRate !== 1;

  const handleShare = async () => {
    const text = [
      'POTVRDA O TRANSFERU',
      '===================',
      `Nalog broj:    ${transfer.orderNumber || '—'}`,
      `Datum i vreme: ${fmtDate(transfer.timestamp)}`,
      '',
      `Sa računa:     ${transfer.fromAccount}`,
      `Na račun:      ${transfer.toAccount}`,
      '',
      `Poslato:       ${fmt(transfer.initialAmount)}`,
      `Primljeno:     ${fmt(transfer.finalAmount)}`,
      isCross ? `Kurs:          ${Number(transfer.exchangeRate).toFixed(4)}` : null,
      transfer.fee > 0 ? `Provizija:     ${fmt(transfer.fee)}` : null,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message: text, title: 'Potvrda o transferu' });
    } catch {
      // user cancelled
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroAmount}>{fmt(transfer.initialAmount)}</Text>
        {isCross && (
          <Text style={styles.heroReceived}>→ {fmt(transfer.finalAmount)} primljeno</Text>
        )}
        <Text style={styles.heroDate}>{fmtDate(transfer.timestamp)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Računi</Text>
      <View style={[card, styles.section]}>
        <Row label="Sa računa" value={transfer.fromAccount} />
        <Row label="Na račun"  value={transfer.toAccount} />
      </View>

      <Text style={styles.sectionTitle}>Finansijski detalji</Text>
      <View style={[card, styles.section]}>
        <Row label="Poslato"   value={fmt(transfer.initialAmount)} />
        <Row label="Primljeno" value={fmt(transfer.finalAmount)} />
        {isCross && <Row label="Kurs"      value={Number(transfer.exchangeRate).toFixed(4)} />}
        {transfer.fee > 0 && <Row label="Provizija" value={fmt(transfer.fee)} />}
      </View>

      <Text style={styles.sectionTitle}>Podaci naloga</Text>
      <View style={[card, styles.section]}>
        <Row label="Nalog broj" value={transfer.orderNumber} />
      </View>

      <TouchableOpacity style={styles.printBtn} onPress={handleShare}>
        <Text style={styles.printBtnText}>Štampaj potvrdu</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { paddingBottom: 40 },

  hero:           { backgroundColor: colors.primary, padding: 24, paddingTop: 32, alignItems: 'center' },
  heroAmount:     { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroReceived:   { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  heroDate:       { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

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
