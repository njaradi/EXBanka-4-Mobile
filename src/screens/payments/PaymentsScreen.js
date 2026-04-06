import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyAccounts } from '../../services/accountService';
import { getPayments } from '../../services/paymentService';
import { card, colors } from '../../theme';

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  COMPLETED: colors.success,
  PENDING:   colors.warning,
  FAILED:    colors.error,
};

const STATUS_LABELS = {
  COMPLETED: 'Realizovano',
  PENDING:   'U obradi',
  FAILED:    'Odbijeno',
};

const STATUS_OPTIONS = ['', 'COMPLETED', 'PENDING', 'FAILED'];
const TYPE_OPTIONS   = ['', 'outgoing', 'incoming'];

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('sr-RS');
}

function fmtAmt(amount) {
  return Number(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PaymentItem({ item, myNumbers, onPress }) {
  const isIncoming = myNumbers.has(item.toAccount) && !myNumbers.has(item.fromAccount);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
  const party = isIncoming
    ? (item.senderName || item.fromAccount)
    : (item.recipientName || item.toAccount || '—');

  return (
    <TouchableOpacity style={[card, styles.item]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemMain}>
        <View style={[styles.dirIcon, { backgroundColor: isIncoming ? '#dcfce7' : '#fef3c7' }]}>
          <Text style={styles.dirArrow}>{isIncoming ? '←' : '→'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{party}</Text>
          <Text style={styles.itemDate}>{fmtDate(item.timestamp)}</Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.itemAmount, { color: isIncoming ? colors.success : colors.error }]}>
            {isIncoming ? '+' : '-'}{fmtAmt(item.finalAmount)}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PaymentsScreen({ navigation }) {
  const [payments, setPayments]     = useState([]);
  const [myNumbers, setMyNumbers]   = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [error, setError]           = useState(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [amtMin, setAmtMin]       = useState('');
  const [amtMax, setAmtMax]       = useState('');
  const [status, setStatus]       = useState('');
  const [type, setType]           = useState('');

  // Keep a ref to the current active filters for use in onEndReached
  const activeFilters = useRef({ dateFrom, dateTo, amtMin, amtMax, status, type });

  const fetchPage = useCallback(async (filters, offset) => {
    const data = await getPayments({
      date_from:  filters.dateFrom  || undefined,
      date_to:    filters.dateTo    || undefined,
      amount_min: filters.amtMin    || undefined,
      amount_max: filters.amtMax    || undefined,
      status:     filters.status    || undefined,
      offset,
    });
    return data ?? [];
  }, []);

  const load = useCallback(async (filters) => {
    try {
      setError(null);
      const [page, accs] = await Promise.all([
        fetchPage(filters, 0),
        getMyAccounts(),
      ]);
      const nums = new Set((accs ?? []).map(a => a.accountNumber));
      setMyNumbers(nums);
      let result = page;
      if (filters.type === 'outgoing') result = result.filter(p => nums.has(p.fromAccount));
      if (filters.type === 'incoming') result = result.filter(p => nums.has(p.toAccount) && !nums.has(p.fromAccount));
      setPayments(result);
      setHasMore(page.length === PAGE_SIZE);
      activeFilters.current = filters;
    } catch {
      setError('Greška pri učitavanju plaćanja.');
    }
  }, [fetchPage]);

  const applyFilters = useCallback(() => {
    const filters = { dateFrom, dateTo, amtMin, amtMax, status, type };
    setLoading(true);
    load(filters).finally(() => setLoading(false));
  }, [load, dateFrom, dateTo, amtMin, amtMax, status, type]);

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setAmtMin(''); setAmtMax(''); setStatus(''); setType('');
    const filters = { dateFrom: '', dateTo: '', amtMin: '', amtMax: '', status: '', type: '' };
    setLoading(true);
    load(filters).finally(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => {
    const filters = { dateFrom, dateTo, amtMin, amtMax, status, type };
    setLoading(true);
    load(filters).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const filters = activeFilters.current;
    await load(filters);
    setRefreshing(false);
  }, [load]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const filters = activeFilters.current;
      const nextOffset = payments.length;
      const page = await fetchPage(filters, nextOffset);

      // Apply client-side type filter to new page
      let filtered = page;
      if (filters.type === 'outgoing') filtered = filtered.filter(p => myNumbers.has(p.fromAccount));
      if (filters.type === 'incoming') filtered = filtered.filter(p => myNumbers.has(p.toAccount) && !myNumbers.has(p.fromAccount));

      setPayments(prev => [...prev, ...filtered]);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, payments.length, fetchPage, myNumbers]);

  const hasFilters = dateFrom || dateTo || amtMin || amtMax || status || type;

  const ListFooter = loadingMore
    ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} />
    : null;

  return (
    <View style={styles.container}>
      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('NewPayment', {})}>
          <Text style={styles.actionBtnText}>+ Plaćanje</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('NewTransfer', {})}>
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>+ Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('Transfers')}>
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>Istorija</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('Recipients')}>
          <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>Primaoci</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterToggle, hasFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Text style={[styles.filterToggleText, hasFilters && styles.filterToggleTextActive]}>
            {showFilters ? '▲' : '▼'}{hasFilters ? ' •' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Datum od</Text>
              <TextInput style={styles.filterInput} value={dateFrom} onChangeText={setDateFrom}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Datum do</Text>
              <TextInput style={styles.filterInput} value={dateTo} onChangeText={setDateTo}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Iznos min</Text>
              <TextInput style={styles.filterInput} value={amtMin} onChangeText={setAmtMin}
                placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Iznos max</Text>
              <TextInput style={styles.filterInput} value={amtMax} onChangeText={setAmtMax}
                placeholder="∞" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
            </View>
          </View>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map(s => (
              <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}>
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {s === '' ? 'Svi' : STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Tip</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map(t => (
              <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {t === '' ? 'Svi' : t === 'outgoing' ? '→ Odlazna' : '← Dolazna'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterApply} onPress={applyFilters}>
              <Text style={styles.filterApplyText}>Primeni</Text>
            </TouchableOpacity>
            {hasFilters && (
              <TouchableOpacity style={styles.filterReset} onPress={resetFilters}>
                <Text style={styles.filterResetText}>Resetuj</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nema plaćanja za prikaz.</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PaymentItem
              item={item}
              myNumbers={myNumbers}
              onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  actionBar: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  actionBtn:            { flex: 1, backgroundColor: colors.primary, paddingVertical: 9, borderRadius: 6, alignItems: 'center' },
  actionBtnOutline:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  actionBtnText:        { color: '#fff', fontWeight: '600', fontSize: 12 },
  actionBtnOutlineText: { color: colors.primary },
  filterToggle:         { paddingHorizontal: 8, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  filterToggleActive:   { borderColor: colors.primary },
  filterToggleText:     { fontSize: 12, color: colors.textMuted },
  filterToggleTextActive:{ color: colors.primary },

  filterPanel: { backgroundColor: colors.bgSurface, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  filterField: { flex: 1 },
  filterLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: colors.textPrimary,
    backgroundColor: colors.bgPage,
  },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip:     { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipActive:     { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  chipText:       { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  filterActions:  { flexDirection: 'row', gap: 8 },
  filterApply:    { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  filterApplyText:{ color: '#fff', fontWeight: '600', fontSize: 13 },
  filterReset:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  filterResetText:{ fontSize: 13, color: colors.textSecondary },

  list: { padding: 16, gap: 8, paddingBottom: 40 },

  item:     { padding: 12 },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dirIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dirArrow: { fontSize: 16, fontWeight: '700' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  itemDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemRight:{ alignItems: 'flex-end', flexShrink: 0 },
  itemAmount:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  badge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
