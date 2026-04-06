import { useCallback, useEffect, useState } from 'react';
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
import { getRecipients, createPayment } from '../../services/paymentService';
import { card, colors } from '../../theme';

const PAYMENT_CODES = [
  { code: '189', label: '189 – Ostalo' },
  { code: '221', label: '221 – Kirija' },
  { code: '247', label: '247 – Komunalne usluge' },
  { code: '248', label: '248 – Telefon/internet' },
  { code: '249', label: '249 – Osiguranje' },
  { code: '253', label: '253 – Anuiteti kredita' },
  { code: '289', label: '289 – Ostale usluge' },
  { code: '290', label: '290 – Plaćanje robe' },
];

function fmt(amount, currency) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim();
}

function BalanceBar({ amount, available }) {
  if (!available || available <= 0) return null;
  const pct = Math.min((amount / available) * 100, 100);
  const remaining = available - amount;
  const barColor = pct < 60 ? colors.success : pct < 85 ? colors.warning : colors.error;
  return (
    <View style={barStyles.wrap}>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[barStyles.remaining, remaining < 0 && barStyles.remainingRed]}>
        {remaining < 0
          ? 'Nedovoljno sredstava'
          : `Preostalo: ${fmt(remaining, 'RSD')}`}
      </Text>
    </View>
  );
}

export default function NewPaymentScreen({ route, navigation }) {
  const prefillFromAccount   = route.params?.fromAccount   ?? '';
  const prefillRecipientName = route.params?.recipientName ?? '';
  const prefillRecipientAcc  = route.params?.recipientAccount ?? '';

  const [accounts, setAccounts]     = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [fromAccount, setFromAccount]           = useState(prefillFromAccount);
  const [recipientName, setRecipientName]       = useState(prefillRecipientName);
  const [recipientAccount, setRecipientAccount] = useState(prefillRecipientAcc);
  const [amount, setAmount]                     = useState('');
  const [paymentCode, setPaymentCode]           = useState('289');
  const [referenceNumber, setReferenceNumber]   = useState('');
  const [purpose, setPurpose]                   = useState('');

  const [showAccPicker, setShowAccPicker]       = useState(false);
  const [showRecipPicker, setShowRecipPicker]   = useState(false);
  const [showCodePicker, setShowCodePicker]     = useState(false);

  const [step, setStep]       = useState('form'); // 'form' | 'confirm'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    Promise.all([getMyAccounts(), getRecipients()])
      .then(([accs, recs]) => {
        setAccounts(accs ?? []);
        setRecipients(recs ?? []);
        if (!prefillFromAccount && accs?.length > 0) setFromAccount(accs[0].accountNumber);
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false));
  }, []);

  const selectedAccount = accounts.find(a => a.accountNumber === fromAccount);
  const amt = parseFloat(amount.replace(',', '.')) || 0;

  const handleSelectRecipient = useCallback((r) => {
    setRecipientName(r.name);
    setRecipientAccount(r.accountNumber);
    setShowRecipPicker(false);
  }, []);

  const validateForm = () => {
    if (!fromAccount)             return 'Izaberite račun za plaćanje.';
    if (!recipientName.trim())    return 'Unesite naziv primaoca.';
    if (!recipientAccount.trim()) return 'Unesite broj računa primaoca.';
    if (!amount.trim() || isNaN(amt) || amt <= 0) return 'Unesite ispravan iznos.';
    if (selectedAccount && amt > selectedAccount.availableBalance) return 'Nedovoljno sredstava.';
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
      await createPayment({
        fromAccount,
        recipientName:    recipientName.trim(),
        recipientAccount: recipientAccount.trim(),
        amount:           amt,
        paymentCode,
        referenceNumber:  referenceNumber.trim(),
        purpose:          purpose.trim(),
      });

      // Offer "Dodaj primaoca" if not already in recipients
      const alreadySaved = recipients.some(r => r.accountNumber === recipientAccount.trim());
      if (!alreadySaved) {
        Alert.alert(
          'Plaćanje uspešno',
          'Da li želite da dodate primaoca u listu?',
          [
            {
              text: 'Dodaj primaoca',
              onPress: () => navigation.replace('AddRecipient', {
                name: recipientName.trim(),
                accountNumber: recipientAccount.trim(),
              }),
            },
            { text: 'Ne', onPress: () => navigation.navigate('Payments') },
          ],
        );
      } else {
        navigation.navigate('Payments');
      }
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

  const selectedCodeLabel = PAYMENT_CODES.find(c => c.code === paymentCode)?.label ?? paymentCode;

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Pregled naloga</Text>
        <View style={[card, styles.section]}>
          {[
            ['Sa računa',       fromAccount],
            ['Primalac',        recipientName],
            ['Račun primaoca',  recipientAccount],
            ['Iznos',           fmt(amt, 'RSD')],
            ['Šifra plaćanja',  selectedCodeLabel],
            ['Poziv na broj',   referenceNumber || '—'],
            ['Svrha plaćanja',  purpose || '—'],
          ].map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Potvrdi plaćanje</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('form')} disabled={loading}>
          <Text style={styles.cancelText}>Nazad</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Novo plaćanje</Text>

        {/* From account */}
        <Text style={styles.label}>Račun platioca</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowAccPicker(v => !v)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerText}>
              {selectedAccount ? `${selectedAccount.accountName} — ${selectedAccount.accountNumber}` : 'Izaberite račun'}
            </Text>
            {selectedAccount && (
              <Text style={styles.pickerSub}>{fmt(selectedAccount.availableBalance, selectedAccount.currency)} raspoloživo</Text>
            )}
          </View>
          <Text style={styles.pickerArrow}>{showAccPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showAccPicker && (
          <View style={[card, styles.dropdownCard]}>
            {accounts.map(a => (
              <TouchableOpacity key={a.accountId} style={styles.dropdownItem}
                onPress={() => { setFromAccount(a.accountNumber); setShowAccPicker(false); }}>
                <Text style={styles.dropdownItemText}>{a.accountName}</Text>
                <Text style={styles.dropdownItemSub}>{a.accountNumber} · {fmt(a.availableBalance, a.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recipient */}
        <Text style={styles.label}>Primalac</Text>
        {recipients.length > 0 && (
          <TouchableOpacity style={[styles.picker, styles.pickerSecondary]}
            onPress={() => setShowRecipPicker(v => !v)}>
            <Text style={styles.pickerTextSecondary}>Izaberi iz liste primalaca</Text>
            <Text style={styles.pickerArrow}>{showRecipPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}
        {showRecipPicker && (
          <View style={[card, styles.dropdownCard]}>
            {recipients.map(r => (
              <TouchableOpacity key={r.id} style={styles.dropdownItem} onPress={() => handleSelectRecipient(r)}>
                <Text style={styles.dropdownItemText}>{r.name}</Text>
                <Text style={styles.dropdownItemSub}>{r.accountNumber}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput style={styles.input} placeholder="Naziv primaoca" placeholderTextColor={colors.textMuted}
          value={recipientName} onChangeText={setRecipientName} />
        <TextInput style={styles.input} placeholder="Broj računa primaoca" placeholderTextColor={colors.textMuted}
          value={recipientAccount} onChangeText={setRecipientAccount} autoCapitalize="none" />

        {/* Amount + balance bar */}
        <Text style={styles.label}>Iznos (RSD)</Text>
        <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textMuted}
          value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        {selectedAccount && amt > 0 && (
          <BalanceBar amount={amt} available={selectedAccount.availableBalance} />
        )}

        {/* Payment code dropdown */}
        <Text style={styles.label}>Šifra plaćanja</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowCodePicker(v => !v)}>
          <Text style={styles.pickerText}>{selectedCodeLabel}</Text>
          <Text style={styles.pickerArrow}>{showCodePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showCodePicker && (
          <View style={[card, styles.dropdownCard]}>
            {PAYMENT_CODES.map(c => (
              <TouchableOpacity key={c.code} style={styles.dropdownItem}
                onPress={() => { setPaymentCode(c.code); setShowCodePicker(false); }}>
                <Text style={[styles.dropdownItemText, paymentCode === c.code && { color: colors.primary }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Optional fields */}
        <Text style={styles.label}>Poziv na broj (opciono)</Text>
        <TextInput style={styles.input} placeholder="npr. 97 123456789" placeholderTextColor={colors.textMuted}
          value={referenceNumber} onChangeText={setReferenceNumber} />
        <Text style={styles.label}>Svrha plaćanja</Text>
        <TextInput style={[styles.input, styles.inputMulti]} placeholder="Opis plaćanja"
          placeholderTextColor={colors.textMuted} value={purpose} onChangeText={setPurpose}
          multiline numberOfLines={2} />

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

const barStyles = StyleSheet.create({
  wrap:         { marginBottom: 12 },
  track:        { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  fill:         { height: '100%', borderRadius: 3 },
  remaining:    { fontSize: 12, color: colors.textSecondary },
  remainingRed: { color: colors.error, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },

  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgSurface, marginBottom: 12,
  },
  inputMulti: { minHeight: 56, textAlignVertical: 'top' },

  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, backgroundColor: colors.bgSurface, marginBottom: 8,
  },
  pickerSecondary:    { backgroundColor: colors.primaryTint, borderColor: colors.primaryLight },
  pickerText:         { fontSize: 14, color: colors.textPrimary, flex: 1 },
  pickerSub:          { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pickerTextSecondary:{ fontSize: 13, color: colors.primary, flex: 1 },
  pickerArrow:        { fontSize: 12, color: colors.textMuted, marginLeft: 8 },

  dropdownCard:     { marginBottom: 12, overflow: 'hidden' },
  dropdownItem:     { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  dropdownItemSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  section:  { marginBottom: 16 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },

  error:      { color: colors.error, fontSize: 13, marginBottom: 12 },
  btn:        { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText:    { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
});
