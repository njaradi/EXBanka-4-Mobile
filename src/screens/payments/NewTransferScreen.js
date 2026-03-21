import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { createTransfer } from '../../services/paymentService';
import { card, colors } from '../../theme';

function fmt(amount, currency) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim();
}

export default function NewTransferScreen({ navigation }) {
  const [accounts, setAccounts]   = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount]     = useState('');
  const [amount, setAmount]           = useState('');

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);

  const [step, setStep]     = useState('form'); // 'form' | 'confirm'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getMyAccounts()
      .then(accs => {
        setAccounts(accs ?? []);
        if (accs?.length >= 1) setFromAccount(accs[0].accountNumber);
        if (accs?.length >= 2) setToAccount(accs[1].accountNumber);
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  const selectedFrom = accounts.find(a => a.accountNumber === fromAccount);
  const selectedTo   = accounts.find(a => a.accountNumber === toAccount);

  const validateForm = () => {
    if (!fromAccount) return 'Izaberite izvorni račun.';
    if (!toAccount)   return 'Izaberite odredišni račun.';
    if (fromAccount === toAccount) return 'Računi moraju biti različiti.';
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(amt) || amt <= 0) return 'Unesite ispravan iznos.';
    if (selectedFrom && amt > selectedFrom.availableBalance) return 'Nedovoljno sredstava.';
    return null;
  };

  const handleContinue = () => {
    const err = validateForm();
    if (err) { setError(err); return; }
    setError(null);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const amt = parseFloat(amount.replace(',', '.'));
      await createTransfer({ fromAccount, toAccount, amount: amt });
      navigation.navigate('Payments');
    } catch (e) {
      setError(e?.response?.data?.error || 'Greška. Pokušajte ponovo.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInit) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (accounts.length < 2) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Potrebna su najmanje 2 računa za transfer.</Text>
      </View>
    );
  }

  const amt = parseFloat(amount.replace(',', '.')) || 0;

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Pregled transfera</Text>

        <View style={[card, styles.section]}>
          {[
            ['Sa računa',    `${selectedFrom?.accountName ?? ''} (${fromAccount})`],
            ['Na račun',     `${selectedTo?.accountName ?? ''} (${toAccount})`],
            ['Iznos',        fmt(amt, selectedFrom?.currencyCode)],
          ].map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>

        {selectedFrom?.currencyCode !== selectedTo?.currencyCode && (
          <Text style={styles.hint}>
            Računi su u različitim valutama. Primenjivaće se tržišni kurs u trenutku izvršenja transfera.
          </Text>
        )}

        <Text style={styles.hint}>
          Transfer zahteva odobrenje. Nakon potvrde bićete obavešteni putem aplikacije.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji nalog</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('form')} disabled={loading}>
          <Text style={styles.cancelText}>Nazad</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const toAccounts   = accounts.filter(a => a.accountNumber !== fromAccount);
  const fromAccounts = accounts.filter(a => a.accountNumber !== toAccount);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Novi interni transfer</Text>

        {/* From account */}
        <Text style={styles.label}>Sa računa</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowFromPicker(v => !v)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerText}>{selectedFrom?.accountName ?? 'Izaberite račun'}</Text>
            {selectedFrom && (
              <Text style={styles.pickerSub}>{selectedFrom.accountNumber} · {fmt(selectedFrom.availableBalance, selectedFrom.currencyCode)}</Text>
            )}
          </View>
          <Text style={styles.pickerArrow}>{showFromPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showFromPicker && (
          <View style={[card, styles.dropdownCard]}>
            {fromAccounts.map(a => (
              <TouchableOpacity
                key={a.accountId}
                style={styles.dropdownItem}
                onPress={() => { setFromAccount(a.accountNumber); setShowFromPicker(false); }}
              >
                <Text style={styles.dropdownItemText}>{a.accountName}</Text>
                <Text style={styles.dropdownItemSub}>{a.accountNumber} · {fmt(a.availableBalance, a.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* To account */}
        <Text style={styles.label}>Na račun</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowToPicker(v => !v)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerText}>{selectedTo?.accountName ?? 'Izaberite račun'}</Text>
            {selectedTo && (
              <Text style={styles.pickerSub}>{selectedTo.accountNumber} · {fmt(selectedTo.availableBalance, selectedTo.currencyCode)}</Text>
            )}
          </View>
          <Text style={styles.pickerArrow}>{showToPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showToPicker && (
          <View style={[card, styles.dropdownCard]}>
            {toAccounts.map(a => (
              <TouchableOpacity
                key={a.accountId}
                style={styles.dropdownItem}
                onPress={() => { setToAccount(a.accountNumber); setShowToPicker(false); }}
              >
                <Text style={styles.dropdownItemText}>{a.accountName}</Text>
                <Text style={styles.dropdownItemSub}>{a.accountNumber} · {fmt(a.availableBalance, a.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Amount */}
        <Text style={styles.label}>
          Iznos ({selectedFrom?.currencyCode ?? 'RSD'})
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleContinue}>
          <Text style={styles.btnText}>Nastavi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Otkaži</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },

  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgSurface, marginBottom: 12,
  },

  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, backgroundColor: colors.bgSurface, marginBottom: 8,
  },
  pickerText:  { fontSize: 15, color: colors.textPrimary },
  pickerSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pickerArrow: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },

  dropdownCard: { marginBottom: 12, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  dropdownItemSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  section: { marginBottom: 16 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:{ fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:{ fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },

  hint:   { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 12 },
  error:  { color: colors.error, fontSize: 13, marginBottom: 12 },

  btn:        { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText:    { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
});
