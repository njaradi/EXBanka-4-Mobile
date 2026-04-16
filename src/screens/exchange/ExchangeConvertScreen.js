import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { previewConversion, convertAmount } from '../../services/exchangeService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function AccountPicker({ label, accounts, selected, onSelect, exclude }) {
  const [open, setOpen] = useState(false);
  const available = accounts.filter((a) => a.accountId !== exclude?.accountId);
  const label_ = selected
    ? `${selected.accountName} (${selected.currency}) — ${fmt(selected.availableBalance)}`
    : 'Izaberite račun';

  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.pickerBtnText, !selected && { color: colors.textMuted }]} numberOfLines={1}>
          {label_}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {available.map((a) => (
            <TouchableOpacity
              key={a.accountId}
              style={[styles.dropItem, selected?.accountId === a.accountId && styles.dropItemSelected]}
              onPress={() => { onSelect(a); setOpen(false); }}
            >
              <Text style={[styles.dropItemText, selected?.accountId === a.accountId && styles.dropItemSel]}>
                {a.accountName} ({a.currency})
              </Text>
              <Text style={styles.dropItemBalance}>{fmt(a.availableBalance)} {a.currency}</Text>
            </TouchableOpacity>
          ))}
          {available.length === 0 && (
            <Text style={styles.dropEmpty}>Nema dostupnih računa.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function ExchangeConvertScreen({ navigation }) {
  const [accounts, setAccounts]   = useState([]);
  const [fromAcc, setFromAcc]     = useState(null);
  const [toAcc, setToAcc]         = useState(null);
  const [amount, setAmount]       = useState('');
  const [preview, setPreview]     = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [accsLoading, setAccsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const debounce = useRef(null);

  // Load accounts
  useEffect(() => {
    getMyAccounts()
      .then(setAccounts)
      .catch(() => setError('Nije moguće učitati račune.'))
      .finally(() => setAccsLoading(false));
  }, []);

  // Live preview whenever from/to/amount changes
  const fetchPreview = useCallback(async (from, to, amt) => {
    if (!from || !to || from.currency === to.currency) { setPreview(null); return; }
    const parsed = parseFloat(amt);
    if (!amt || isNaN(parsed) || parsed <= 0) { setPreview(null); return; }
    setPreviewLoading(true);
    try {
      const data = await previewConversion({ fromCurrency: from.currency, toCurrency: to.currency, amount: parsed });
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPreview(fromAcc, toAcc, amount), 500);
    return () => clearTimeout(debounce.current);
  }, [fromAcc, toAcc, amount, fetchPreview]);

  const handleConvert = () => {
    if (!fromAcc || !toAcc) { setError('Izaberite oba računa.'); return; }
    if (fromAcc.currency === toAcc.currency) { setError('Računi moraju biti u različitim valutama.'); return; }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Unesite ispravan iznos.'); return; }
    if (parsed > fromAcc.availableBalance) { setError('Nemate dovoljno sredstava na računu.'); return; }
    if (!preview) { setError('Sačekajte pregled konverzije.'); return; }
    setError(null);

    Alert.alert(
      'Potvrda konverzije',
      `Konvertujete ${fmt(preview.fromAmount)} ${preview.fromCurrency} → ${fmt(preview.toAmount)} ${preview.toCurrency}\nProvizija: ${fmt(preview.commission)} ${preview.fromCurrency}`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Konvertuj',
          onPress: async () => {
            setConverting(true);
            try {
              const result = await convertAmount({
                fromAccount: fromAcc.accountNumber,
                toAccount:   toAcc.accountNumber,
                amount:      parsed,
              });
              Alert.alert(
                'Konverzija uspešna',
                `Primljeno: ${fmt(result.toAmount)} ${result.toCurrency}`,
                [{ text: 'U redu', onPress: () => navigation.goBack() }],
              );
            } catch (e) {
              const msg = e?.response?.data?.error || 'Konverzija nije uspela.';
              Alert.alert('Greška', msg);
            } finally {
              setConverting(false);
            }
          },
        },
      ],
    );
  };

  if (accsLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <AccountPicker label="SA RAČUNA" accounts={accounts} selected={fromAcc} onSelect={setFromAcc} exclude={toAcc} />
        <AccountPicker label="NA RAČUN"  accounts={accounts} selected={toAcc}   onSelect={setToAcc}   exclude={fromAcc} />

        <View>
          <Text style={styles.label}>IZNOS ({fromAcc?.currency ?? '—'})</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={amount}
            onChangeText={(v) => { setAmount(v); setError(null); }}
          />
        </View>

        {fromAcc && toAcc && fromAcc.currency === toAcc.currency && (
          <Text style={styles.warnText}>Izaberite račune u različitim valutama.</Text>
        )}

        {previewLoading && (
          <View style={styles.previewLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.previewLoadingText}>Računam kurs...</Text>
          </View>
        )}

        {!previewLoading && preview && (
          <View style={[card, styles.previewCard]}>
            <Text style={styles.previewTitle}>Pregled konverzije</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Kurs</Text>
              <Text style={styles.previewValue}>
                {preview.fromCurrency === 'RSD'
                  ? `1 ${preview.toCurrency} = ${fmt(preview.rate, 4)} RSD`
                  : `1 ${preview.fromCurrency} = ${fmt(preview.rate, 4)} ${preview.toCurrency}`}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Provizija (0.5%)</Text>
              <Text style={styles.previewValue}>{fmt(preview.commission)} {preview.fromCurrency}</Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewTotalLabel}>Primate</Text>
              <Text style={styles.previewTotalValue}>{fmt(preview.toAmount)} {preview.toCurrency}</Text>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!preview || converting) && styles.btnDisabled]}
          onPress={handleConvert}
          disabled={!preview || converting}
        >
          {converting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Konvertuj</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:               { flex: 1, backgroundColor: colors.bgPage },
  container:          { flex: 1 },
  content:            { padding: 16, gap: 14, paddingBottom: 40 },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },

  label:              { fontSize: 11, fontWeight: '600', color: colors.textSecondary,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  pickerWrap:         { gap: 0 },
  pickerBtn:          { ...card, flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  pickerBtnText:      { fontSize: 14, color: colors.textPrimary, flex: 1 },
  chevron:            { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
  dropdown:           { ...card, marginTop: 2, overflow: 'hidden' },
  dropItem:           { paddingHorizontal: 14, paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: colors.border },
  dropItemSelected:   { backgroundColor: colors.primaryTint },
  dropItemText:       { fontSize: 14, color: colors.textPrimary },
  dropItemSel:        { color: colors.primary, fontWeight: '600' },
  dropItemBalance:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dropEmpty:          { padding: 14, color: colors.textMuted, fontSize: 13 },

  input:              { ...card, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.textPrimary },

  warnText:           { color: colors.warning, fontSize: 13, textAlign: 'center' },

  previewLoading:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewLoadingText: { color: colors.textMuted, fontSize: 13 },

  previewCard:        { padding: 14, gap: 8 },
  previewTitle:       { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  previewRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel:       { fontSize: 13, color: colors.textSecondary },
  previewValue:       { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  previewTotal:       { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  previewTotalLabel:  { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  previewTotalValue:  { fontSize: 16, fontWeight: '700', color: colors.primary },

  errorText:          { color: colors.error, fontSize: 13, textAlign: 'center' },
  btn:                { backgroundColor: colors.primary, borderRadius: 8, padding: 16, alignItems: 'center' },
  btnDisabled:        { opacity: 0.4 },
  btnText:            { color: '#fff', fontWeight: '600', fontSize: 15 },
});
