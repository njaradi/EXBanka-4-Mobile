import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts, getAccount } from '../../services/accountService';
import { initiateCardRequest, confirmCardRequest } from '../../services/cardService';
import { card, colors } from '../../theme';

const CARD_BRANDS = [
  { value: 'VISA',             label: 'Visa' },
  { value: 'MASTERCARD',       label: 'Mastercard' },
  { value: 'DINACARD',         label: 'DinaCard' },
  { value: 'AMERICAN_EXPRESS', label: 'American Express' },
];

function OptionPicker({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === selected)?.label ?? 'Odaberi...';
  return (
    <View style={styles.optionPickerWrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.pickerText}>{selectedLabel}</Text>
        <Text style={styles.pickerChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[styles.dropItem, o.value === selected && styles.dropItemSelected]}
              onPress={() => { onSelect(o.value); setOpen(false); }}
            >
              <Text style={[styles.dropItemText, o.value === selected && styles.dropItemTextSelected]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CardRequestScreen({ navigation }) {
  // Step 1: request form
  const [accounts, setAccounts]             = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [cardBrand, setCardBrand]           = useState('VISA');
  const [forSelf, setForSelf]               = useState(true);
  const [authorizedPerson, setAuthorizedPerson] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    email: '', phoneNumber: '', address: '',
  });
  const [submitting, setSubmitting]         = useState(false);

  // Step 2: confirm code
  const [step, setStep]                     = useState(1);
  const [requestToken, setRequestToken]     = useState('');
  const [code, setCode]                     = useState('');
  const [confirming, setConfirming]         = useState(false);

  useEffect(() => {
    getMyAccounts()
      .then((data) => {
        setAccounts(data ?? []);
        if (data?.length) setSelectedAccountId(data[0].accountId);
      })
      .catch(() => Alert.alert('Greška', 'Nije moguće učitati račune.'))
      .finally(() => setLoadingAccounts(false));
  }, []);

  // When selected account changes, fetch its type to show business option
  useEffect(() => {
    if (!selectedAccountId) return;
    setSelectedAccountType(null);
    getAccount(selectedAccountId)
      .then((acc) => setSelectedAccountType(acc.accountType))
      .catch(() => setSelectedAccountType(null));
  }, [selectedAccountId]);

  const accountOptions = accounts.map((a) => ({
    value: a.accountId,
    label: `${a.accountName} (${a.accountNumber})`,
  }));

  const selectedAccount = accounts.find((a) => a.accountId === selectedAccountId);
  const isBusinessAccount = selectedAccountType === 'business';

  const updateAP = (field, value) =>
    setAuthorizedPerson((prev) => ({ ...prev, [field]: value }));

  const handleSubmitRequest = async () => {
    if (!selectedAccount) {
      Alert.alert('Greška', 'Izaberite račun.');
      return;
    }
    if (!forSelf) {
      const { firstName, lastName, dateOfBirth, gender, email, phoneNumber, address } = authorizedPerson;
      if (!firstName || !lastName || !dateOfBirth || !gender || !email || !phoneNumber || !address) {
        Alert.alert('Greška', 'Popunite sve podatke o ovlašćenom licu.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        accountNumber: selectedAccount.accountNumber,
        cardName: cardBrand,
        forSelf,
        ...((!forSelf) && { authorizedPerson }),
      };
      const { requestToken: token } = await initiateCardRequest(payload);
      setRequestToken(token);
      setStep(2);
    } catch (e) {
      const msg = e.response?.data?.error ?? 'Greška pri podnošenju zahteva.';
      Alert.alert('Greška', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Greška', 'Unesite 6-cifreni kod.');
      return;
    }
    setConfirming(true);
    try {
      await confirmCardRequest(requestToken, code);
      Alert.alert(
        'Uspeh',
        'Kartica je uspešno kreirana.',
        [{ text: 'U redu', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      const msg = e.response?.data?.error ?? 'Pogrešan ili istekao kod.';
      Alert.alert('Greška', msg);
    } finally {
      setConfirming(false);
    }
  };

  if (loadingAccounts) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  // ── Step 2: enter confirmation code ──────────────────────────────────────
  if (step === 2) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[card, styles.section]}>
          <Text style={styles.sectionTitle}>Potvrdni kod</Text>
          <Text style={styles.infoText}>
            Poslali smo 6-cifreni kod na Vašu email adresu. Kod važi 15 minuta.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Unesite kod"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
        <TouchableOpacity
          style={[styles.btn, confirming && styles.btnDisabled]}
          onPress={handleConfirmCode}
          disabled={confirming}
        >
          <Text style={styles.btnText}>{confirming ? 'Potvrđivanje...' : 'Potvrdi'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(1)}>
          <Text style={styles.btnOutlineText}>Nazad</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step 1: request form ──────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <OptionPicker
        label="Račun"
        options={accountOptions}
        selected={selectedAccountId}
        onSelect={setSelectedAccountId}
      />

      <OptionPicker
        label="Vrsta kartice"
        options={CARD_BRANDS}
        selected={cardBrand}
        onSelect={setCardBrand}
      />

      {/* For self / authorized person — only for business accounts */}
      {isBusinessAccount && (
        <View style={[card, styles.toggleRow]}>
          <Text style={styles.toggleLabel}>Kartica za sebe</Text>
          <Switch
            value={forSelf}
            onValueChange={setForSelf}
            trackColor={{ true: colors.primary }}
          />
        </View>
      )}

      {/* Authorized person form */}
      {isBusinessAccount && !forSelf && (
        <View style={[card, styles.section]}>
          <Text style={styles.sectionTitle}>Podaci o ovlašćenom licu</Text>
          {[
            { field: 'firstName',   label: 'Ime',                       keyboard: 'default' },
            { field: 'lastName',    label: 'Prezime',                   keyboard: 'default' },
            { field: 'dateOfBirth', label: 'Datum rođenja (YYYY-MM-DD)', keyboard: 'default' },
            { field: 'gender',      label: 'Pol (M/F)',                 keyboard: 'default' },
            { field: 'email',       label: 'Email',                     keyboard: 'email-address' },
            { field: 'phoneNumber', label: 'Telefon',                   keyboard: 'phone-pad' },
            { field: 'address',     label: 'Adresa',                    keyboard: 'default' },
          ].map(({ field, label, keyboard }) => (
            <View key={field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                value={authorizedPerson[field]}
                onChangeText={(v) => updateAP(field, v)}
                keyboardType={keyboard}
                autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
              />
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={handleSubmitRequest}
        disabled={submitting}
      >
        <Text style={styles.btnText}>{submitting ? 'Slanje...' : 'Podnesi zahtev'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  label:           { fontSize: 13, fontWeight: '600', color: colors.textSecondary,
                     textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 12 },
  optionPickerWrap:{ marginBottom: 4, zIndex: 10 },
  pickerBtn:       { ...card, flexDirection: 'row', justifyContent: 'space-between',
                     alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8 },
  pickerText:      { fontSize: 14, color: colors.textPrimary },
  pickerChevron:   { fontSize: 11, color: colors.textMuted },
  dropdown:        { ...card, marginTop: 2, borderRadius: 8, overflow: 'hidden' },
  dropItem:        { paddingVertical: 11, paddingHorizontal: 14,
                     borderBottomWidth: 1, borderBottomColor: colors.border },
  dropItemSelected:{ backgroundColor: colors.primaryTint },
  dropItemText:    { fontSize: 14, color: colors.textPrimary },
  dropItemTextSelected: { color: colors.primary, fontWeight: '600' },

  section:      { padding: 16, marginTop: 12, borderRadius: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },

  toggleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 padding: 14, marginTop: 12, borderRadius: 8 },
  toggleLabel: { fontSize: 14, color: colors.textPrimary },

  fieldLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input:      { borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
                color: colors.textPrimary, backgroundColor: colors.bgSurface },
  infoText:   { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },

  btn:            { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8,
                    alignItems: 'center', marginTop: 16 },
  btnDisabled:    { opacity: 0.6 },
  btnText:        { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnOutline:     { borderWidth: 1, borderColor: colors.primary, paddingVertical: 14,
                    borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
});
