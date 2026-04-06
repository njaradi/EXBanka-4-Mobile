import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAccount } from '../../services/accountService';
import { card, colors } from '../../theme';

function fmt(amount, currency) {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim();
}

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const ACCOUNT_TYPE_LABELS = {
  personal: 'Lični',
  business: 'Poslovni',
};

export default function AccountDetailScreen({ route, navigation }) {
  const { accountId } = route.params;
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getAccount(accountId);
      setAccount(data);
    } catch {
      setError('Greška pri učitavanju računa.');
    }
  }, [accountId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Reload when returning from RenameAccount or other sub-screens
  useFocusEffect(useCallback(() => {
    if (!loading) load();
  }, [load, loading]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (error || !account) {
    return <View style={styles.center}><Text style={styles.errorText}>{error || 'Račun nije pronađen.'}</Text></View>;
  }

  const cur = account.currency ?? '';
  const typeLabel = ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroName}>{account.accountName}</Text>
        <Text style={styles.heroNumber}>{account.accountNumber}</Text>
        <Text style={styles.heroBalance}>{fmt(account.availableBalance, cur)}</Text>
        <Text style={styles.heroBalanceLabel}>Raspoloživo stanje</Text>
      </View>

      {/* Main info */}
      <View style={[card, styles.section]}>
        <Row label="Vlasnik"           value={account.owner} />
        <Row label="Tip računa"        value={typeLabel} />
        <Row label="Valuta"            value={cur} />
        <Row label="Status"            value={account.status} />
        <Row label="Ukupno stanje"     value={fmt(account.balance, cur)} />
        <Row label="Rezervisana sred." value={fmt(account.reservedFunds, cur)} />
      </View>

      {/* Limits */}
      <Text style={styles.sectionTitle}>Limiti</Text>
      <View style={[card, styles.section]}>
        <Row label="Dnevni limit"      value={fmt(account.dailyLimit, cur)} />
        <Row label="Dnevna potrošnja"  value={fmt(account.dailySpent, cur)} />
        <Row label="Mesečni limit"     value={fmt(account.monthlyLimit, cur)} />
        <Row label="Mes. potrošnja"    value={fmt(account.monthlySpent, cur)} />
      </View>

      {/* Business */}
      {account.accountType === 'business' && account.companyName && (
        <>
          <Text style={styles.sectionTitle}>Podaci o firmi</Text>
          <View style={[card, styles.section]}>
            <Row label="Naziv firme"    value={account.companyName} />
            <Row label="Matični broj"   value={account.registrationNumber} />
            <Row label="PIB"            value={account.pib} />
            <Row label="Šifra delat."   value={account.activityCode} />
            <Row label="Adresa"         value={account.companyAddress} />
          </View>
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('PaymentsTab', { screen: 'NewPayment', params: { fromAccount: account.accountNumber } })}
        >
          <Text style={styles.actionBtnText}>Novo plaćanje</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => navigation.navigate('RenameAccount', { accountId, currentName: account.accountName })}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Promena naziva</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => navigation.navigate('LimitChange', {
            accountId,
            accountNumber: account.accountNumber,
            dailyLimit:    account.dailyLimit,
            monthlyLimit:  account.monthlyLimit,
            currency:      account.currency ?? '',
          })}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextOutline]}>Promena limita</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },

  hero:            { backgroundColor: colors.primary, padding: 24, paddingTop: 32 },
  heroName:        { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroNumber:      { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  heroBalance:     { fontSize: 32, fontWeight: '700', color: '#fff' },
  heroBalanceLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 6, paddingHorizontal: 16 },
  section:      { marginHorizontal: 16, borderRadius: 8 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:  { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:  { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },

  actions:            { padding: 16, gap: 10, marginTop: 8 },
  actionBtn:          { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  actionBtnOutline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  actionBtnText:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  actionBtnTextOutline:{ color: colors.primary },
});