import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { blockCard, getCardById } from '../../services/cardService';
import { card, colors } from '../../theme';

const STATUS_COLORS = {
  ACTIVE:      colors.success,
  BLOCKED:     colors.warning,
  DEACTIVATED: colors.textMuted,
};
const STATUS_LABELS = {
  ACTIVE:      'Aktivna',
  BLOCKED:     'Blokirana',
  DEACTIVATED: 'Deaktivirana',
};

const BRAND_LABELS = {
  VISA:             'Visa',
  MASTERCARD:       'Mastercard',
  DINACARD:         'DinaCard',
  AMERICAN_EXPRESS: 'American Express',
};

function maskCardNumber(cn) {
  if (!cn) return '•••• •••• •••• ••••';
  const first4 = cn.substring(0, 4);
  const last4  = cn.slice(-4);
  // Full number: format with spaces every 4 digits
  if (!cn.includes('*')) {
    return cn.replace(/(.{4})/g, '$1 ').trim();
  }
  return `${first4} **** **** ${last4}`;
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

export default function CardDetailScreen({ route }) {
  const { cardId } = route.params;
  const [cardData, setCardData]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocking, setBlocking]     = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getCardById(cardId);
      setCardData(data);
    } catch {
      setError('Nije moguće učitati detalje kartice.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cardId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleBlock = () => {
    Alert.alert(
      'Blokiranje kartice',
      `Da li ste sigurni da želite da blokirate karticu\n${maskCardNumber(cardData.cardNumber)}?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Blokiraj',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true);
            try {
              await blockCard(cardData.id);
              Alert.alert(
                'Kartica blokirana',
                'Kartica je uspešno blokirana. Za deblokadu kontaktirajte banku.',
                [{ text: 'U redu', onPress: () => load() }],
              );
            } catch (e) {
              const msg = e.response?.data?.error ?? 'Greška pri blokiranju kartice.';
              Alert.alert('Greška', msg);
            } finally {
              setBlocking(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !cardData) {
    return <View style={styles.center}><Text style={styles.errorText}>{error || 'Kartica nije pronađena.'}</Text></View>;
  }

  const statusColor = STATUS_COLORS[cardData.status] ?? colors.textMuted;
  const statusLabel = STATUS_LABELS[cardData.status] ?? cardData.status;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroNumber}>{maskCardNumber(cardData.cardNumber)}</Text>
        <Text style={styles.heroBrand}>{BRAND_LABELS[cardData.cardName] ?? cardData.cardName}</Text>
        <View style={[styles.heroBadge, { backgroundColor: statusColor + '30', borderColor: statusColor }]}>
          <Text style={[styles.heroBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={[card, styles.section]}>
        <Row label="Naziv kartice"   value={BRAND_LABELS[cardData.cardName] ?? cardData.cardName} />
        <Row label="Vrsta kartice"   value={cardData.cardType} />
        <Row label="Broj računa"     value={cardData.accountNumber} />
        <Row label="Datum kreiranja" value={cardData.createdAt?.substring(0, 10)} />
        <Row label="Važi do"         value={cardData.expiryDate} />
        <Row label="Limit"           value={cardData.cardLimit > 0 ? `${Number(cardData.cardLimit).toLocaleString('sr-RS')} RSD` : 'Bez limita'} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {cardData.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={handleBlock}
            disabled={blocking}
          >
            <Text style={styles.btnText}>{blocking ? 'Blokiranje...' : 'Blokiraj karticu'}</Text>
          </TouchableOpacity>
        )}
        {cardData.status === 'BLOCKED' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Za deblokadu kontaktirajte banku.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },

  hero:          { backgroundColor: colors.primary, padding: 24, paddingTop: 32, alignItems: 'center' },
  heroNumber:    { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 2, marginBottom: 6 },
  heroBrand:     { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  heroBadge:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1 },
  heroBadgeText: { fontSize: 13, fontWeight: '700' },

  section: { margin: 16, borderRadius: 8 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
             paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:{ fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:{ fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1 },

  actions:  { paddingHorizontal: 16, gap: 10 },
  btn:      { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnDanger:{ backgroundColor: colors.error },
  btnText:  { color: '#fff', fontWeight: '600', fontSize: 15 },

  infoBox:  { backgroundColor: colors.warning + '18', borderWidth: 1, borderColor: colors.warning,
              borderRadius: 8, padding: 14 },
  infoText: { color: colors.warning, fontSize: 13, textAlign: 'center', fontWeight: '500' },
});
