import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getOrderById, cancelOrder } from '../../services/orderService';
import { card, colors } from '../../theme';

function fmt(value, decimals = 2) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const STATUS_LABELS = {
  PENDING:    'Na čekanju',
  APPROVED:   'Odobren',
  REJECTED:   'Odbijen',
  PROCESSING: 'U obradi',
  DONE:       'Izvršen',
  CANCELLED:  'Otkazan',
};

const STATUS_COLORS = {
  PENDING:    colors.warning,
  APPROVED:   colors.success,
  REJECTED:   colors.error,
  PROCESSING: colors.primary,
  DONE:       colors.success,
  CANCELLED:  colors.expired,
};

function InfoRow({ label, value, valueStyle }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value ?? '—'}</Text>
    </View>
  );
}

export default function OrderResultScreen({ route, navigation }) {
  const { order: initialOrder, ticker } = route.params;

  const [order, setOrder]     = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    if (!order?.orderId) return;
    setLoading(true);
    try {
      const updated = await getOrderById(order.orderId);
      setOrder((prev) => ({ ...prev, ...updated }));
    } catch {
      // ignore — keep showing cached data
    } finally {
      setLoading(false);
    }
  }, [order?.orderId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCancel = () => {
    Alert.alert(
      'Otkazivanje naloga',
      'Da li ste sigurni da želite da otkažete ovaj nalog?',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Otkaži nalog',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrder(order.orderId);
              Alert.alert('Nalog otkazan', 'Nalog je uspešno otkazan.', [
                { text: 'U redu', onPress: () => navigation.popToTop() },
              ]);
            } catch (e) {
              const msg = e?.response?.data?.error || 'Otkazivanje nije uspelo.';
              Alert.alert('Greška', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const status      = order.status ?? 'PENDING';
  const statusLabel = STATUS_LABELS[status] ?? status;
  const statusColor = STATUS_COLORS[status] ?? colors.textMuted;
  const canCancel   = status === 'PENDING' || status === 'APPROVED' || status === 'PROCESSING';

  return (
    <View style={styles.container}>
      {/* Success header */}
      <View style={styles.successBanner}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Nalog poslat</Text>
        <Text style={styles.successSub}>{ticker} · #{order.orderId}</Text>
      </View>

      <View style={[card, styles.detailCard]}>
        <InfoRow label="ID naloga"      value={String(order.orderId)} />
        <InfoRow label="Tiker"          value={ticker} />
        <InfoRow label="Tip naloga"     value={order.orderType} />
        <InfoRow
          label="Status"
          value={statusLabel}
          valueStyle={{ color: statusColor, fontWeight: '700' }}
        />
        {order.approximatePrice != null && (
          <InfoRow label="Okvirna cena"  value={fmt(order.approximatePrice)} />
        )}
        {order.quantity != null && (
          <InfoRow label="Količina"      value={String(order.quantity)} />
        )}
      </View>

      {loading && (
        <View style={styles.refreshRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.refreshText}>Osvežavam status...</Text>
        </View>
      )}

      <View style={styles.btnGroup}>
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color={colors.error} />
              : <Text style={styles.cancelBtnText}>Otkaži nalog</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.doneBtnText}>Nazad na hartije</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bgPage, padding: 16 },

  successBanner:  { alignItems: 'center', paddingVertical: 24 },
  successIcon:    { fontSize: 36, color: colors.success, fontWeight: '700' },
  successTitle:   { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  successSub:     { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  detailCard:     { padding: 14, gap: 0 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
                    borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel:      { fontSize: 13, color: colors.textSecondary },
  infoValue:      { fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  refreshRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  refreshText:    { fontSize: 13, color: colors.textMuted },

  btnGroup:       { gap: 12, marginTop: 20 },
  cancelBtn:      { borderWidth: 1, borderColor: colors.error, borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelBtnText:  { color: colors.error, fontWeight: '600', fontSize: 14 },
  doneBtn:        { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  doneBtnText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDisabled:    { opacity: 0.4 },
});
