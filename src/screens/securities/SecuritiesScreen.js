import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSecurities } from '../../services/securitiesService';
import { card, colors } from '../../theme';

const TABS = [
  { label: 'Akcije',   type: 'STOCK' },
  { label: 'Fjučersi', type: 'FUTURES_CONTRACT' },
];

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function SecurityRow({ item, onPress }) {
  const change = Number(item.changePercent);
  const changeColor = change > 0 ? colors.success : change < 0 ? colors.error : colors.textMuted;
  const changeSign  = change > 0 ? '+' : '';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowLeft}>
        <Text style={styles.ticker}>{item.ticker}</Text>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.exchange}>{item.exchangeAcronym}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.price}>{fmt(item.price, 2)}</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {changeSign}{fmt(Math.abs(change), 2)}%
        </Text>
        <Text style={styles.volume}>Vol: {Number(item.volume).toLocaleString('sr-RS')}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SecuritiesScreen({ navigation }) {
  const [activeTab, setActiveTab]   = useState(0);
  const [search, setSearch]         = useState('');
  const [listings, setListings]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError]           = useState(null);

  const debounceRef = useRef(null);
  const currentType = TABS[activeTab].type;

  const load = useCallback(async (opts = {}) => {
    const isRefresh = opts.refresh ?? false;
    const nextPage  = opts.page    ?? 0;
    if (isRefresh) setRefreshing(true);
    else if (nextPage === 0) setLoading(true);
    setError(null);
    try {
      const res = await getSecurities({
        type:     currentType,
        page:     nextPage,
        pageSize: 20,
        ticker:   search.trim() || undefined,
      });
      const incoming = res.listings ?? [];
      setTotalPages(res.totalPages ?? 1);
      setListings(nextPage === 0 ? incoming : (prev) => [...prev, ...incoming]);
      setPage(nextPage);
    } catch {
      setError('Nije moguće učitati hartije.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentType, search]);

  // Reset when tab changes
  useEffect(() => {
    setListings([]);
    setPage(0);
    load({ page: 0 });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setListings([]);
      setPage(0);
      load({ page: 0 });
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (page + 1 < totalPages && !loading && !refreshing) {
      load({ page: page + 1 });
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab.type}
            style={[styles.tab, i === activeTab && styles.tabActive]}
            onPress={() => { if (i !== activeTab) setActiveTab(i); }}
          >
            <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pretraži po tikeru..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {loading && listings.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load({ page: 0 })}>
            <Text style={styles.retryText}>Pokušaj ponovo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SecurityRow
              item={item}
              onPress={() => navigation.navigate('SecurityDetail', { id: item.id, ticker: item.ticker })}
            />
          )}
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true, page: 0 })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nema rezultata.</Text>
            </View>
          }
          ListFooterComponent={
            page + 1 < totalPages
              ? <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
              : null
          }
          contentContainerStyle={listings.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bgPage },
  tabs:           { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  tab:            { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:        { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabTextActive:  { color: colors.primary, fontWeight: '700' },
  searchBox:      { padding: 12, backgroundColor: colors.bgSurface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput:    { ...card, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyContainer: { flex: 1 },
  errorText:      { color: colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  emptyText:      { color: colors.textMuted, fontSize: 14 },
  retryBtn:       { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:      { color: '#fff', fontWeight: '600' },

  row:            { ...card, marginHorizontal: 12, marginTop: 10, paddingHorizontal: 14, paddingVertical: 12,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLeft:        { flex: 1, marginRight: 12 },
  ticker:         { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  name:           { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  exchange:       { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rowRight:       { alignItems: 'flex-end' },
  price:          { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  change:         { fontSize: 13, fontWeight: '600', marginTop: 2 },
  volume:         { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
