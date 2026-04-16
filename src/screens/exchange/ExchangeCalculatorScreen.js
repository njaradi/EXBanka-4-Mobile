import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { previewConversion } from '../../services/exchangeService';
import { card, colors } from '../../theme';

const CURRENCIES = ['RSD', 'EUR', 'CHF', 'USD', 'GBP', 'JPY', 'CAD', 'AUD'];

const CURRENCY_NAMES = {
  RSD: 'Srpski dinar',
  EUR: 'Euro',
  CHF: 'Švajcarski franak',
  USD: 'Američki dolar',
  GBP: 'Britanska funta',
  JPY: 'Japanski jen',
  CAD: 'Kanadski dolar',
  AUD: 'Australijski dolar',
};

function fmtAmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function CurrencyPicker({ label, selected, onSelect, exclude }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.pickerBtnText}>
          {selected} — {CURRENCY_NAMES[selected]}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {CURRENCIES.filter((c) => c !== exclude).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.dropItem, c === selected && styles.dropItemSelected]}
              onPress={() => { onSelect(c); setOpen(false); }}
            >
              <Text style={[styles.dropItemText, c === selected && styles.dropItemTextSelected]}>
                {c} — {CURRENCY_NAMES[c]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ResultRow({ label, value }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

export default function ExchangeCalculatorScreen() {
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency]     = useState('RSD');
  const [amount, setAmount]             = useState('');
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const debounceRef = useRef(null);

  const calculate = useCallback(async (from, to, amt) => {
    const parsed = parseFloat(amt);
    if (!amt || isNaN(parsed) || parsed <= 0 || from === to) {
      setResult(null);
      setError(from === to ? 'Valute moraju biti različite.' : null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await previewConversion({ fromCurrency: from, toCurrency: to, amount: parsed });
      setResult(data);
    } catch (e) {
      setError('Nije moguće izračunati konverziju.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce any input change by 500ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      calculate(fromCurrency, toCurrency, amount);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fromCurrency, toCurrency, amount, calculate]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.disclaimer}>
        Informativni kalkulator — prikazuje okvirnu vrednost bez izvršenja konverzije.
      </Text>

      <CurrencyPicker
        label="Iz valute"
        selected={fromCurrency}
        onSelect={setFromCurrency}
        exclude={toCurrency}
      />

      <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
        <Text style={styles.swapText}>⇅  Zameni valute</Text>
      </TouchableOpacity>

      <CurrencyPicker
        label="U valutu"
        selected={toCurrency}
        onSelect={setToCurrency}
        exclude={fromCurrency}
      />

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Iznos</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Računam...</Text>
        </View>
      )}

      {!loading && result && (
        <View style={[card, styles.resultCard]}>
          <Text style={styles.resultTitle}>Rezultat konverzije</Text>
          <ResultRow
            label="Kurs"
            value={result.fromCurrency === 'RSD'
              ? `1 ${result.toCurrency} = ${fmtAmt(result.rate, 4)} RSD`
              : `1 ${result.fromCurrency} = ${fmtAmt(result.rate, 4)} ${result.toCurrency}`}
          />
          <ResultRow
            label={`Provizija (0.5%)`}
            value={`${fmtAmt(result.commission)} ${result.fromCurrency}`}
          />
          <View style={styles.divider} />
          <View style={styles.resultRow}>
            <Text style={styles.finalLabel}>Primate</Text>
            <Text style={styles.finalValue}>
              {fmtAmt(result.toAmount)} {result.toCurrency}
            </Text>
          </View>
          <Text style={styles.fromAmtNote}>
            Za {fmtAmt(result.fromAmount)} {result.fromCurrency}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.primaryTint,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderFocus,
    textAlign: 'center',
  },
  pickerContainer: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pickerBtn: {
    ...card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dropdown: {
    ...card,
    marginTop: -4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  dropItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropItemSelected: {
    backgroundColor: colors.primaryTint,
  },
  dropItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  dropItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  swapBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  swapText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  inputContainer: {
    gap: 4,
  },
  input: {
    ...card,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  resultCard: {
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  finalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  finalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  fromAmtNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -4,
  },
});
