import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { card, colors } from '../../theme';

function fmt(amount, currency) {
  return `${Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default function AccountsScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyAccounts();
      const sorted = [...data].sort((a, b) => b.availableBalance - a.availableBalance);
      setAccounts(sorted);
    } catch {
      setError('Greška pri učitavanju računa.');
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={accounts}
      keyExtractor={(a) => String(a.accountId)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error || 'Nema aktivnih računa.'}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AccountDetail', { accountId: item.accountId })}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.accountName} numberOfLines={1}>{item.accountName}</Text>
            <Text style={styles.currency}>{item.currency}</Text>
          </View>
          <Text style={styles.accountNumber}>{item.accountNumber}</Text>
          <Text style={styles.balance}>{fmt(item.availableBalance, item.currency)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  card:         { ...card, padding: 16, marginBottom: 12 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  accountName:  { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  currency:     { fontSize: 13, fontWeight: '600', color: colors.primary, marginLeft: 8 },
  accountNumber:{ fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  balance:      { fontSize: 22, fontWeight: '700', color: colors.primary },
});
