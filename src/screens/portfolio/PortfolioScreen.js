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
import { getPortfolio, getProfit } from '../../services/portfolioService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function ProfitText({ value }) {
  const isPos = value >= 0;
  return (
    <Text style={[styles.profitValue, { color: isPos ? colors.success : colors.error }]}>
      {isPos ? '+' : ''}{fmt(value)}
    </Text>
  );
}

function HoldingItem({ item, onSell }) {
  return (
    <View style={[card, styles.item]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.asset_type ?? '—'}</Text>
          </View>
          <Text style={styles.ticker}>{item.ticker || `#${item.listing_id}`}</Text>
        </View>
        <TouchableOpacity style={styles.sellBtn} onPress={onSell} activeOpacity={0.75}>
          <Text style={styles.sellBtnText}>Prodaj</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemStat}>
          <Text style={styles.statLabel}>KOLIČINA</Text>
          <Text style={styles.statValue}>{item.amount}</Text>
        </View>
        <View style={styles.itemStat}>
          <Text style={styles.statLabel}>CENA</Text>
          <Text style={styles.statValue}>{fmt(item.price ?? 0)}</Text>
        </View>
        <View style={styles.itemStat}>
          <Text style={styles.statLabel}>PROFIT</Text>
          <ProfitText value={item.profit ?? 0} />
        </View>
      </View>
    </View>
  );
}

export default function PortfolioScreen({ navigation }) {
  const [holdings,   setHoldings]   = useState([]);
  const [profit,     setProfit]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [entries, totalProfit] = await Promise.all([getPortfolio(), getProfit()]);
      setHoldings(entries);
      setProfit(totalProfit);
    } catch {
      setError('Nije moguće učitati portfolio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSell = (holding) => {
    const listingId = holding.listing_id;
    const ticker    = holding.ticker || String(listingId);
    navigation.navigate('OrderForm', {
      security: { id: listingId, ticker, name: ticker, price: holding.price ?? 0 },
      direction: 'SELL',
      maxAmount: holding.amount,
    });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={holdings}
        keyExtractor={(item) => String(item.id ?? item.listing_id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          profit !== null && holdings.length > 0 ? (
            <View style={[card, styles.profitCard]}>
              <Text style={styles.profitLabel}>UKUPAN PROFIT</Text>
              <ProfitText value={profit} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{error || 'Nemate aktivnih pozicija.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <HoldingItem item={item} onSell={() => handleSell(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list:      { padding: 16, gap: 10, paddingBottom: 24 },

  profitCard:  { padding: 16, marginBottom: 4, alignItems: 'center' },
  profitLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary,
                 textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  profitValue: { fontSize: 24, fontWeight: '700' },

  item:       { padding: 14 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },

  typeBadge:     { backgroundColor: colors.bgPage, borderWidth: 1, borderColor: colors.border,
                   borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },

  ticker: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  sellBtn:     { borderWidth: 1, borderColor: colors.error, borderRadius: 6,
                 paddingHorizontal: 12, paddingVertical: 6 },
  sellBtnText: { fontSize: 13, fontWeight: '600', color: colors.error },

  itemRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  itemStat: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted,
               textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
});
