import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMyAccounts } from '../../services/accountService';
import { getPayments, getRecipients, getTransfers } from '../../services/paymentService';
import { card, colors } from '../../theme';

function fmt(amount, currency) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function AccountCard({ account, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.accountCard, selected && styles.accountCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.accountCardName, selected && styles.accountCardNameSel]} numberOfLines={1}>
        {account.accountName}
      </Text>
      <Text style={[styles.accountCardNum, selected && styles.accountCardNumSel]} numberOfLines={1}>
        {account.accountNumber}
      </Text>
      <Text style={[styles.accountCardBal, selected && styles.accountCardBalSel]}>
        {fmt(account.availableBalance, account.currency)}
      </Text>
    </TouchableOpacity>
  );
}

function TxRow({ payment, accountNumber, onPress }) {
  const isIncoming = payment.toAccount === accountNumber;
  return (
    <TouchableOpacity style={styles.txRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.txIcon, { backgroundColor: isIncoming ? '#dcfce7' : '#fef3c7' }]}>
        <Text style={{ fontSize: 16 }}>{isIncoming ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txPurpose} numberOfLines={1}>
          {payment._type === 'transfer'
            ? `Interni transfer → ${payment.toAccount}`
            : payment.purpose || (isIncoming ? payment.senderName : payment.recipientName) || '—'}
        </Text>
        <Text style={styles.txDate}>{fmtDate(payment.timestamp)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncoming ? colors.success : colors.textPrimary }]}>
        {isIncoming ? '+' : '-'}{fmt(payment.finalAmount, '')}
      </Text>
    </TouchableOpacity>
  );
}

function QuickAction({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.quickBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecipientChip({ recipient, onPress }) {
  const initials = recipient.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <TouchableOpacity style={styles.recipientChip} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.recipientAvatar}>
        <Text style={styles.recipientInitials}>{initials}</Text>
      </View>
      <Text style={styles.recipientName} numberOfLines={1}>{recipient.name}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [accs, pmts, xfers, recs] = await Promise.all([
        getMyAccounts(),
        getPayments(),
        getTransfers().catch(() => []),
        getRecipients().catch(() => []),
      ]);
      const sorted = [...accs].sort((a, b) => b.availableBalance - a.availableBalance);
      setAccounts(sorted);
      setPayments(pmts);
      setTransfers(xfers ?? []);
      setRecipients(recs.slice(0, 5));
      setSelectedAccount((prev) => {
        if (prev && sorted.find((a) => a.accountId === prev.accountId)) return prev;
        return sorted[0] ?? null;
      });
    } catch {
      setError('Greška pri učitavanju podataka.');
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const accountTxs = selectedAccount
    ? [
        ...payments
          .filter((p) => p.fromAccount === selectedAccount.accountNumber || p.toAccount === selectedAccount.accountNumber)
          .map((p) => ({ ...p, _type: 'payment' })),
        ...transfers
          .filter((t) => t.fromAccount === selectedAccount.accountNumber || t.toAccount === selectedAccount.accountNumber)
          .map((t) => ({ ...t, _type: 'transfer' })),
      ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5)
    : [];

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dobrodošli,</Text>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Odjava</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.sectionTitle}>Moji računi</Text>
      {accounts.length === 0 ? (
        <Text style={styles.emptyText}>Nema računa.</Text>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(a) => String(a.accountId)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              selected={selectedAccount?.accountId === item.accountId}
              onPress={() => setSelectedAccount(item)}
            />
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Poslednje transakcije</Text>
      {accountTxs.length === 0 ? (
        <Text style={styles.emptyText}>Nema transakcija za ovaj račun.</Text>
      ) : (
        <View style={card}>
          {accountTxs.map((item) => (
            <TxRow
              key={`${item._type}-${item.id}`}
              payment={item}
              accountNumber={selectedAccount?.accountNumber}
              onPress={() =>
                item._type === 'transfer'
                  ? navigation.navigate('PaymentsTab', { screen: 'TransferDetail', params: { transfer: item } })
                  : navigation.navigate('PaymentsTab', { screen: 'PaymentDetail', params: { paymentId: item.id } })
              }
            />
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Brze akcije</Text>
      <View style={styles.quickRow}>
        <QuickAction label="Novo plaćanje" onPress={() => navigation.navigate('PaymentsTab', { screen: 'NewPayment' })} />
        <QuickAction label="Transfer"      onPress={() => navigation.navigate('PaymentsTab', { screen: 'NewTransfer' })} />
        <QuickAction label="Menjačnica"    onPress={() => navigation.navigate('MoreTab', { screen: 'ExchangeRates' })} />
      </View>

      {recipients.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Brzo plaćanje</Text>
          <FlatList
            data={recipients}
            keyExtractor={(r) => String(r.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            renderItem={({ item }) => (
              <RecipientChip
                recipient={item}
                onPress={() => navigation.navigate('PaymentsTab', { screen: 'NewPayment', params: { recipient: item } })}
              />
            )}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting:  { fontSize: 13, color: colors.textMuted },
  userName:  { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  userEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.primaryTint },
  logoutText:{ color: colors.primary, fontSize: 13, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
  emptyText:    { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  errorText:    { color: colors.error, marginBottom: 12, fontSize: 13 },

  accountCard:        { ...card, width: 200, padding: 14, marginRight: 12, backgroundColor: colors.bgSurface },
  accountCardSelected:{ backgroundColor: colors.primary, borderColor: colors.primary },
  accountCardName:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  accountCardNameSel: { color: '#fff' },
  accountCardNum:     { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  accountCardNumSel:  { color: 'rgba(255,255,255,0.7)' },
  accountCardBal:     { fontSize: 17, fontWeight: '700', color: colors.primary },
  accountCardBalSel:  { color: '#fff' },

  txRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  txIcon:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  txInfo:   { flex: 1 },
  txPurpose:{ fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  txDate:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

  quickRow:    { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickBtn:    { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  quickBtnText:{ color: '#fff', fontSize: 12, fontWeight: '600' },

  recipientChip:    { alignItems: 'center', marginRight: 16, width: 60 },
  recipientAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  recipientInitials:{ color: colors.primary, fontWeight: '700', fontSize: 15 },
  recipientName:    { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
});
