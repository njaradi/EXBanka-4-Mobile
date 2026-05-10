import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getExchangeHistory } from '../../services/exchangeService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function HistoryItem({ item }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={styles.pairBadge}>
          <Text style={styles.pairText}>{item.fromCurrency} → {item.toCurrency}</Text>
        </View>
        <Text style={styles.itemDate}>{fmtDate(item.timestamp)}</Text>
      </View>

      <View style={styles.amounts}>
        <View style={styles.amtBlock}>
          <Text style={styles.amtLabel}>Plaćeno</Text>
          <Text style={styles.amtFrom}>{fmt(item.fromAmount)} {item.fromCurrency}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.amtBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.amtLabel}>Primljeno</Text>
          <Text style={styles.amtTo}>{fmt(item.toAmount)} {item.toCurrency}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {item.fromCurrency === 'RSD'
            ? `Kurs: 1 ${item.toCurrency} = ${fmt(item.rate, 4)} RSD`
            : `Kurs: 1 ${item.fromCurrency} = ${fmt(item.rate, 4)} ${item.toCurrency}`}
        </Text>
        {item.commission > 0 && (
          <Text style={styles.footerText}>
            Provizija: {fmt(item.commission)} {item.fromCurrency}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ExchangeHistoryScreen({ navigation }) {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getExchangeHistory();
      setHistory(data ?? []);
    } catch {
      setError('Nije moguće učitati istoriju konverzija.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={history}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <TouchableOpacity style={styles.convertBtn} onPress={() => navigation.navigate('ExchangeConvert')}>
          <Text style={styles.convertBtnText}>+ Nova konverzija</Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nemate prethodnih konverzija valuta.</Text>
        </View>
      }
      renderItem={({ item }) => <HistoryItem item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bgPage },
  content:        { padding: 16, paddingBottom: 32, gap: 10 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:      { color: colors.error, fontSize: 14, marginBottom: 12 },
  emptyText:      { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  retryBtn:       { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:      { color: '#fff', fontWeight: '600' },

  convertBtn:     { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 6 },
  convertBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  item:           { ...card, padding: 14 },
  itemHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pairBadge:      { backgroundColor: colors.primaryTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pairText:       { color: colors.primary, fontWeight: '700', fontSize: 13 },
  itemDate:       { fontSize: 12, color: colors.textMuted },

  amounts:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  amtBlock:       { flex: 1 },
  amtLabel:       { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  amtFrom:        { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  amtTo:          { fontSize: 15, fontWeight: '700', color: colors.success },
  arrow:          { fontSize: 18, color: colors.textMuted, marginHorizontal: 8 },

  footer:         { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 },
  footerText:     { fontSize: 12, color: colors.textSecondary },
});
