import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { applyForLoan } from '../../services/loanService';
import { card, colors } from '../../theme';

const LOAN_TYPES = [
  { value: 'gotovinski',      label: 'Gotovinski kredit' },
  { value: 'stambeni',        label: 'Stambeni kredit' },
  { value: 'auto',            label: 'Auto kredit' },
  { value: 'refinansirajuci', label: 'Refinansirajući kredit' },
  { value: 'studentski',      label: 'Studentski kredit' },
];

const RATE_TYPES = [
  { value: 'fiksna',      label: 'Fiksna' },
  { value: 'varijabilna', label: 'Varijabilna' },
];

const CURRENCIES = ['RSD', 'EUR', 'CHF', 'USD', 'GBP', 'JPY', 'CAD', 'AUD'];

const EMPLOYMENT_STATUSES = [
  { value: 'stalno',    label: 'Stalno zaposlenje' },
  { value: 'privremeno',label: 'Privremeno zaposlenje' },
  { value: 'nezaposlen',label: 'Nezaposlen' },
];

const REPAYMENT_PERIODS = {
  gotovinski:     [12, 24, 36, 48, 60, 72, 84],
  stambeni:       [60, 120, 180, 240, 300, 360],
  auto:           [12, 24, 36, 48, 60, 72, 84],
  refinansirajuci:[12, 24, 36, 48, 60, 72, 84],
  studentski:     [12, 24, 36, 48, 60, 72, 84],
};

function OptionPicker({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === selected)?.label ?? 'Odaberi...';
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.pickerText, !selected && styles.placeholder]}>{selectedLabel}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
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

function Field({ label, children }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function RadioGroup({ options, selected, onSelect }) {
  return (
    <View style={styles.radioGroup}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.radioBtn, selected === o.value && styles.radioBtnSelected]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={[styles.radioText, selected === o.value && styles.radioTextSelected]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PreviewCard({ preview }) {
  return (
    <View style={[card, styles.previewCard]}>
      <Text style={styles.previewTitle}>Okvirna mesečna rata</Text>
      <Text style={styles.previewAmt}>
        {Number(preview).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      <Text style={styles.previewNote}>Informativni iznos — može varirati pri odobravanju.</Text>
    </View>
  );
}

export default function LoanApplicationScreen({ navigation }) {
  const [accounts, setAccounts]           = useState([]);
  const [loanType, setLoanType]           = useState('');
  const [rateType, setRateType]           = useState('fiksna');
  const [amount, setAmount]               = useState('');
  const [currency, setCurrency]           = useState('RSD');
  const [purpose, setPurpose]             = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [employmentPeriod, setEmploymentPeriod] = useState('');
  const [repaymentPeriod, setRepaymentPeriod]   = useState('');
  const [contactPhone, setContactPhone]   = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [previewAmt, setPreviewAmt]       = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState(null);

  const debounceRef = useRef(null);

  // Load accounts filtered by selected currency
  useEffect(() => {
    getMyAccounts().then((data) => {
      setAccounts(data ?? []);
      setAccountNumber('');
    }).catch(() => {});
  }, [currency]);

  const filteredAccounts = accounts.filter((a) => a.currency === currency);
  const accountOptions = filteredAccounts.map((a) => ({
    value: a.accountNumber,
    label: `${a.accountName} (${a.accountNumber})`,
  }));

  const periodOptions = (REPAYMENT_PERIODS[loanType] ?? []).map((p) => ({
    value: String(p),
    label: `${p} rata`,
  }));

  // Preview installment with debounce 500ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const parsed = parseFloat(amount);
    if (!loanType || !rateType || !parsed || parsed <= 0 || !repaymentPeriod) {
      setPreviewAmt(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        // Compute preview locally using same PMT formula as backend
        // (avoids an extra network call — backend returns this in apply response anyway)
        const rate = estimateRate(loanType, parsed, currency, rateType);
        const r = rate / 100 / 12;
        const n = parseInt(repaymentPeriod, 10);
        let monthly;
        if (r === 0) {
          monthly = parsed / n;
        } else {
          const factor = Math.pow(1 + r, n);
          monthly = parsed * (r * factor) / (factor - 1);
        }
        setPreviewAmt(Math.round(monthly * 100) / 100);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [loanType, rateType, amount, currency, repaymentPeriod]);

  const handleSubmit = async () => {
    setError(null);
    const parsed = parseFloat(amount);
    if (!loanType || !rateType || !parsed || parsed <= 0 || !currency || !repaymentPeriod || !accountNumber) {
      setError('Popunite sva obavezna polja.');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await applyForLoan({
        loanType,
        interestRateType: rateType,
        amount: parsed,
        currency,
        purpose,
        monthlySalary: parseFloat(monthlySalary) || 0,
        employmentStatus,
        employmentPeriod: parseInt(employmentPeriod, 10) || 0,
        repaymentPeriod: parseInt(repaymentPeriod, 10),
        contactPhone,
        accountNumber,
      });
      Alert.alert(
        'Zahtev podnet',
        `Vaš zahtev za kredit je uspešno podnet.\nOkvirna mesečna rata: ${Number(resp.monthlyInstallment).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} ${currency}`,
        [{ text: 'U redu', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setError(e?.response?.data?.error ?? 'Greška pri podnošenju zahteva.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <OptionPicker label="Vrsta kredita *" options={LOAN_TYPES} selected={loanType} onSelect={(v) => { setLoanType(v); setRepaymentPeriod(''); }} />

      <Field label="Tip kamatne stope *">
        <RadioGroup options={RATE_TYPES} selected={rateType} onSelect={setRateType} />
      </Field>

      <Field label="Iznos kredita *">
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00"
          placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} />
      </Field>

      <OptionPicker label="Valuta *"
        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        selected={currency} onSelect={(v) => { setCurrency(v); setRepaymentPeriod(''); }} />

      <OptionPicker label="Račun *"
        options={accountOptions.length > 0 ? accountOptions : [{ value: '', label: `Nema ${currency} računa` }]}
        selected={accountNumber} onSelect={setAccountNumber} />

      <OptionPicker
        label="Rok otplate *"
        options={periodOptions.length > 0 ? periodOptions : [{ value: '', label: 'Prvo odaberite vrstu kredita' }]}
        selected={repaymentPeriod} onSelect={setRepaymentPeriod} />

      <Field label="Svrha kredita">
        <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={3}
          placeholder="Opišite svrhu kredita..." placeholderTextColor={colors.textMuted}
          value={purpose} onChangeText={setPurpose} />
      </Field>

      <Field label="Iznos mesečne plate">
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00"
          placeholderTextColor={colors.textMuted} value={monthlySalary} onChangeText={setMonthlySalary} />
      </Field>

      <OptionPicker label="Status zaposlenja" options={EMPLOYMENT_STATUSES}
        selected={employmentStatus} onSelect={setEmploymentStatus} />

      <Field label="Period zaposlenja (meseci)">
        <TextInput style={styles.input} keyboardType="numeric" placeholder="npr. 24"
          placeholderTextColor={colors.textMuted} value={employmentPeriod} onChangeText={setEmploymentPeriod} />
      </Field>

      <Field label="Kontakt telefon">
        <TextInput style={styles.input} keyboardType="phone-pad" placeholder="+381..."
          placeholderTextColor={colors.textMuted} value={contactPhone} onChangeText={setContactPhone} />
      </Field>

      {previewLoading && (
        <View style={styles.previewLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.previewLoadingText}>Računam ratu...</Text>
        </View>
      )}
      {!previewLoading && previewAmt !== null && <PreviewCard preview={previewAmt} />}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Podnesi zahtev</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// Local PMT estimation — mirrors backend rate logic
const RATE_TIERS = [
  [500_000, 6.25], [1_000_000, 6.00], [2_000_000, 5.75],
  [5_000_000, 5.50], [10_000_000, 5.25], [20_000_000, 5.00], [Infinity, 4.75],
];
const MARGINS = { gotovinski: 1.75, stambeni: 1.50, auto: 1.25, refinansirajuci: 1.00, studentski: 0.75 };
// Rough RSD conversion for preview only (exact conversion done server-side)
const APPROX_RSD = { RSD: 1, EUR: 117, USD: 108, CHF: 116, GBP: 136, JPY: 0.72, CAD: 80, AUD: 70 };

function estimateRate(loanType, amount, currency, rateType) {
  const amountRSD = amount * (APPROX_RSD[currency] ?? 1);
  const base = RATE_TIERS.find(([max]) => amountRSD <= max)?.[1] ?? 4.75;
  const margin = MARGINS[loanType] ?? 1.00;
  return base + margin;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 32 },

  fieldGroup:  { marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary,
                 textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:       { ...card, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
  textarea:    { height: 80, textAlignVertical: 'top' },

  pickerBtn:   { ...card, flexDirection: 'row', justifyContent: 'space-between',
                 alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  pickerText:  { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  placeholder: { color: colors.textMuted },
  chevron:     { fontSize: 11, color: colors.textMuted },

  dropdown:          { ...card, marginTop: -4, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden' },
  dropItem:          { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropItemSelected:  { backgroundColor: colors.primaryTint },
  dropItemText:      { fontSize: 14, color: colors.textPrimary },
  dropItemTextSelected: { color: colors.primary, fontWeight: '600' },

  radioGroup:        { flexDirection: 'row', gap: 10 },
  radioBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                       borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface },
  radioBtnSelected:  { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  radioText:         { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  radioTextSelected: { color: colors.primary, fontWeight: '700' },

  previewLoading:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  previewLoadingText: { color: colors.textMuted, fontSize: 13 },
  previewCard:        { padding: 16, marginBottom: 14, alignItems: 'center' },
  previewTitle:       { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  previewAmt:         { fontSize: 28, fontWeight: '700', color: colors.primary },
  previewNote:        { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' },

  errorText:          { color: colors.error, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  submitBtn:          { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  submitBtnDisabled:  { opacity: 0.6 },
  submitBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
