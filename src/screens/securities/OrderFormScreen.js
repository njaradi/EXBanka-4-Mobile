import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { createOrder } from '../../services/orderService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Determines order type label based on which price fields are set
function orderTypeLabel(limitValue, stopValue) {
  const hasLimit = limitValue && parseFloat(limitValue) > 0;
  const hasStop  = stopValue  && parseFloat(stopValue)  > 0;
  if (hasLimit && hasStop) return 'STOP-LIMIT';
  if (hasLimit)            return 'LIMIT';
  if (hasStop)             return 'STOP';
  return 'TRŽIŠNI';
}

function AccountPicker({ accounts, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const label = selected
    ? `${selected.accountName} (${selected.currency}) — ${fmt(selected.availableBalance)}`
    : 'Izaberite račun';

  return (
    <View>
      <Text style={styles.label}>RAČUN</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen((v) => !v)}>
        <Text style={[styles.pickerBtnText, !selected && { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[card, styles.dropdown]}>
          {accounts.map((a) => (
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
        </View>
      )}
    </View>
  );
}

export default function OrderFormScreen({ route, navigation }) {
  const { security, direction: initialDirection, maxAmount } = route.params;

  const [direction, setDirection] = useState(initialDirection ?? 'BUY');
  const [quantity, setQuantity]   = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [stopValue, setStopValue]   = useState('');
  const [isAon, setIsAon]           = useState(false);
  const [isMargin, setIsMargin]     = useState(false);
  const [accounts, setAccounts]     = useState([]);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [accsLoading, setAccsLoading] = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    getMyAccounts()
      .then(setAccounts)
      .catch(() => setError('Nije moguće učitati račune.'))
      .finally(() => setAccsLoading(false));
  }, []);

  const orderType = orderTypeLabel(limitValue, stopValue);

  const handleSubmit = async () => {
    if (!selectedAcc) { setError('Izaberite račun.'); return; }
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0) { setError('Unesite ispravnu količinu.'); return; }
    if (direction === 'SELL' && maxAmount != null && qty > maxAmount) {
      setError(`Ne možete prodati više od ${maxAmount} ${qty === 1 ? 'hartije' : 'hartija'}.`);
      return;
    }
    setError(null);

    const limitNum = limitValue ? parseFloat(limitValue) : undefined;
    const stopNum  = stopValue  ? parseFloat(stopValue)  : undefined;

    Alert.alert(
      'Potvrda naloga',
      `${direction === 'BUY' ? 'Kupovina' : 'Prodaja'} ${qty} × ${security.ticker}\nTip: ${orderType}\n${limitNum ? `Limit: ${fmt(limitNum)}\n` : ''}${stopNum ? `Stop: ${fmt(stopNum)}\n` : ''}Račun: ${selectedAcc.accountName}`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Potvrdi',
          onPress: async () => {
            setSubmitting(true);
            try {
              const result = await createOrder({
                assetId:    security.id,
                quantity:   qty,
                limitValue: limitNum,
                stopValue:  stopNum,
                isAon,
                isMargin,
                accountId:  selectedAcc.accountId,
                direction,
              });
              navigation.replace('OrderResult', { order: result, ticker: security.ticker });
            } catch (e) {
              const msg = e?.response?.data?.error || 'Nalog nije mogao biti poslat.';
              setError(msg);
            } finally {
              setSubmitting(false);
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
        {/* Security info */}
        <View style={[card, styles.secCard]}>
          <Text style={styles.secTicker}>{security.ticker}</Text>
          <Text style={styles.secName}>{security.name}</Text>
          <Text style={styles.secPrice}>Cena: {fmt(security.price)}</Text>
        </View>

        {/* Direction toggle */}
        <View>
          <Text style={styles.label}>SMER</Text>
          <View style={styles.dirRow}>
            <TouchableOpacity
              style={[styles.dirBtn, direction === 'BUY' && styles.dirBuyActive]}
              onPress={() => setDirection('BUY')}
            >
              <Text style={[styles.dirBtnText, direction === 'BUY' && styles.dirActiveText]}>Kupi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dirBtn, direction === 'SELL' && styles.dirSellActive]}
              onPress={() => setDirection('SELL')}
            >
              <Text style={[styles.dirBtnText, direction === 'SELL' && styles.dirActiveText]}>Prodaj</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity */}
        <View>
          <Text style={styles.label}>
            KOLIČINA{direction === 'SELL' && maxAmount != null ? <Text style={styles.optional}> (max {maxAmount})</Text> : null}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={quantity}
            onChangeText={(v) => { setQuantity(v); setError(null); }}
          />
        </View>

        {/* Limit price */}
        <View>
          <Text style={styles.label}>LIMIT CENA <Text style={styles.optional}>(opcionalno)</Text></Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={limitValue}
            onChangeText={setLimitValue}
          />
        </View>

        {/* Stop price */}
        <View>
          <Text style={styles.label}>STOP CENA <Text style={styles.optional}>(opcionalno)</Text></Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            value={stopValue}
            onChangeText={setStopValue}
          />
        </View>

        {/* Order type indicator */}
        <View style={styles.orderTypeBadge}>
          <Text style={styles.orderTypeLabel}>Tip naloga: </Text>
          <Text style={styles.orderTypeValue}>{orderType}</Text>
        </View>

        {/* Account picker */}
        <AccountPicker accounts={accounts} selected={selectedAcc} onSelect={setSelectedAcc} />

        {/* Toggles */}
        <View style={[card, styles.togglesCard]}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>All-or-Nothing</Text>
              <Text style={styles.toggleHint}>Izvrši nalog samo u potpunosti</Text>
            </View>
            <Switch
              value={isAon}
              onValueChange={setIsAon}
              trackColor={{ true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 12 }]}>
            <View>
              <Text style={styles.toggleLabel}>Na marginu</Text>
              <Text style={styles.toggleHint}>Koristi maržu kao kolateral</Text>
            </View>
            <Switch
              value={isMargin}
              onValueChange={setIsMargin}
              trackColor={{ true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>
                {direction === 'BUY' ? 'Pošalji nalog za kupovinu' : 'Pošalji nalog za prodaju'}
              </Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.bgPage },
  container:      { flex: 1 },
  content:        { padding: 16, gap: 14, paddingBottom: 40 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },

  secCard:        { padding: 14 },
  secTicker:      { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  secName:        { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  secPrice:       { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  label:          { fontSize: 11, fontWeight: '600', color: colors.textSecondary,
                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  optional:       { fontWeight: '400', color: colors.textMuted },

  dirRow:         { flexDirection: 'row', gap: 10 },
  dirBtn:         { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.bgSurface },
  dirBuyActive:   { backgroundColor: colors.success, borderColor: colors.success },
  dirSellActive:  { backgroundColor: colors.error,   borderColor: colors.error },
  dirBtnText:     { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  dirActiveText:  { color: '#fff' },

  input:          { ...card, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.textPrimary },

  orderTypeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
                    backgroundColor: colors.primaryTint, borderRadius: 8, borderWidth: 1, borderColor: colors.borderFocus },
  orderTypeLabel: { fontSize: 13, color: colors.textSecondary },
  orderTypeValue: { fontSize: 13, fontWeight: '700', color: colors.primary },

  pickerBtn:      { ...card, flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  pickerBtnText:  { fontSize: 14, color: colors.textPrimary, flex: 1 },
  chevron:        { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
  dropdown:       { marginTop: 2, overflow: 'hidden' },
  dropItem:       { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropItemSelected: { backgroundColor: colors.primaryTint },
  dropItemText:   { fontSize: 14, color: colors.textPrimary },
  dropItemSel:    { color: colors.primary, fontWeight: '600' },
  dropItemBalance: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  togglesCard:    { padding: 14 },
  toggleRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel:    { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  toggleHint:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  errorText:      { color: colors.error, fontSize: 13, textAlign: 'center' },
  submitBtn:      { backgroundColor: colors.primary, borderRadius: 8, padding: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitBtnText:  { color: '#fff', fontWeight: '600', fontSize: 15 },
});
