import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSecurityById } from '../../services/securitiesService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

function PriceHistoryRow({ item }) {
  const change = Number(item.change ?? 0);
  const color  = change > 0 ? colors.success : change < 0 ? colors.error : colors.textMuted;
  return (
    <View style={styles.histRow}>
      <Text style={styles.histDate}>{fmtDate(item.date)}</Text>
      <Text style={styles.histPrice}>{fmt(item.price)}</Text>
      <Text style={[styles.histChange, { color }]}>{change > 0 ? '+' : ''}{fmt(change, 2)}</Text>
      <Text style={styles.histVol}>{Number(item.volume ?? 0).toLocaleString('sr-RS')}</Text>
    </View>
  );
}

function StockDetail({ detail }) {
  if (!detail) return null;
  return (
    <>
      <InfoRow label="Broj akcija"     value={detail.outstandingShares ? Number(detail.outstandingShares).toLocaleString('sr-RS') : null} />
      <InfoRow label="Prinos dividende" value={detail.dividendYield != null ? `${fmt(detail.dividendYield, 2)}%` : null} />
      <InfoRow label="Tržišna kap."    value={detail.marketCap ? fmt(detail.marketCap, 0) : null} />
    </>
  );
}

function FuturesDetail({ detail }) {
  if (!detail) return null;
  return (
    <>
      <InfoRow label="Veličina ugovora" value={detail.contractSize ? fmt(detail.contractSize) : null} />
      <InfoRow label="Jedinica"          value={detail.contractUnit} />
      <InfoRow label="Datum poravnanja"  value={fmtDate(detail.settlementDate)} />
    </>
  );
}

export default function SecurityDetailScreen({ route, navigation }) {
  const { id, ticker } = route.params;
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSecurityById(id);
      setData(res);
    } catch {
      setError('Nije moguće učitati detalje hartije.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { summary, priceHistory, detail } = data;
  const change = Number(summary.changePercent ?? 0);
  const changeColor = change > 0 ? colors.success : change < 0 ? colors.error : colors.textMuted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={[card, styles.headerCard]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.ticker}>{summary.ticker}</Text>
            <Text style={styles.secName}>{summary.name}</Text>
            <Text style={styles.exchange}>{summary.exchangeAcronym}</Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>{fmt(summary.price)}</Text>
            <Text style={[styles.changePct, { color: changeColor }]}>
              {change > 0 ? '+' : ''}{fmt(Math.abs(change), 2)}%
            </Text>
          </View>
        </View>

        <View style={styles.bidAskRow}>
          <View style={styles.bidAskItem}>
            <Text style={styles.bidAskLabel}>Bid</Text>
            <Text style={styles.bidAskValue}>{fmt(summary.bid)}</Text>
          </View>
          <View style={styles.bidAskItem}>
            <Text style={styles.bidAskLabel}>Ask</Text>
            <Text style={styles.bidAskValue}>{fmt(summary.ask)}</Text>
          </View>
          <View style={styles.bidAskItem}>
            <Text style={styles.bidAskLabel}>Volumen</Text>
            <Text style={styles.bidAskValue}>{Number(summary.volume ?? 0).toLocaleString('sr-RS')}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={[card, styles.section]}>
        <Text style={styles.sectionTitle}>Detalji</Text>
        {summary.type === 'STOCK'              && <StockDetail detail={detail} />}
        {summary.type === 'FUTURES_CONTRACT'   && <FuturesDetail detail={detail} />}
        <InfoRow label="Nominalna vrednost"   value={summary.nominalValue ? fmt(summary.nominalValue) : null} />
        <InfoRow label="Inicijalna margina"   value={summary.initialMarginCost ? fmt(summary.initialMarginCost) : null} />
        <InfoRow label="Margina održavanja"   value={summary.maintenanceMargin ? fmt(summary.maintenanceMargin) : null} />
      </View>

      {/* Price history */}
      {priceHistory && priceHistory.length > 0 && (
        <View style={[card, styles.section]}>
          <Text style={styles.sectionTitle}>Istorija cena</Text>
          <View style={styles.histHeader}>
            <Text style={[styles.histLabel, { flex: 1.4 }]}>Datum</Text>
            <Text style={[styles.histLabel, { flex: 1, textAlign: 'right' }]}>Cena</Text>
            <Text style={[styles.histLabel, { flex: 0.9, textAlign: 'right' }]}>Promena</Text>
            <Text style={[styles.histLabel, { flex: 1.2, textAlign: 'right' }]}>Volumen</Text>
          </View>
          {priceHistory.slice(0, 30).map((ph, i) => (
            <PriceHistoryRow key={i} item={ph} />
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.buyBtn]}
          onPress={() => navigation.navigate('OrderForm', { security: summary, direction: 'BUY' })}
        >
          <Text style={styles.actionBtnText}>Kupi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.sellBtn]}
          onPress={() => navigation.navigate('OrderForm', { security: summary, direction: 'SELL' })}
        >
          <Text style={styles.actionBtnText}>Prodaj</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bgPage },
  content:      { padding: 12, gap: 12, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:    { color: colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  retryBtn:     { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText:    { color: '#fff', fontWeight: '600' },

  headerCard:   { padding: 16 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  ticker:       { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  secName:      { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  exchange:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  priceBlock:   { alignItems: 'flex-end' },
  price:        { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  changePct:    { fontSize: 14, fontWeight: '600', marginTop: 2 },

  bidAskRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  bidAskItem:   { flex: 1, alignItems: 'center' },
  bidAskLabel:  { fontSize: 11, color: colors.textMuted },
  bidAskValue:  { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 2 },

  section:      { padding: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel:    { fontSize: 13, color: colors.textSecondary },
  infoValue:    { fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  histHeader:   { flexDirection: 'row', marginBottom: 4 },
  histLabel:    { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  histRow:      { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  histDate:     { flex: 1.4, fontSize: 12, color: colors.textSecondary },
  histPrice:    { flex: 1, fontSize: 12, color: colors.textPrimary, fontWeight: '500', textAlign: 'right' },
  histChange:   { flex: 0.9, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  histVol:      { flex: 1.2, fontSize: 12, color: colors.textMuted, textAlign: 'right' },

  actionRow:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn:    { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  buyBtn:       { backgroundColor: colors.success },
  sellBtn:      { backgroundColor: colors.error },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
