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
import { getMyCards } from '../../services/cardService';
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

function maskCardNumber(cn) {
  if (!cn) return '•••• •••• •••• ••••';
  const first4 = cn.substring(0, 4);
  const last4  = cn.slice(-4);
  return `${first4} **** **** ${last4}`;
}

function CardItem({ item, onPress }) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNumber}>{maskCardNumber(item.cardNumber)}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {STATUS_LABELS[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardName}>{item.cardName}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.accountNumber} numberOfLines={1}>{item.accountNumber}</Text>
        <Text style={styles.expiry}>Važi do: {item.expiryDate}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CardsScreen({ navigation }) {
  const [cards, setCards]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyCards();
      setCards(data ?? []);
    } catch {
      setError('Nije moguće učitati kartice.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{error || 'Nemate kartica.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CardItem
            item={item}
            onPress={() => navigation.navigate('CardDetail', { cardId: item.id })}
          />
        )}
      />
      <TouchableOpacity
        style={styles.requestBtn}
        onPress={() => navigation.navigate('CardRequest')}
      >
        <Text style={styles.requestBtnText}>Zatraži novu karticu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bgPage },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:  { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list:       { padding: 16, paddingBottom: 8 },

  card:       { ...card, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNumber: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, letterSpacing: 1 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  badgeText:  { fontSize: 11, fontWeight: '600' },
  cardName:   { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountNumber: { fontSize: 12, color: colors.textMuted, flex: 1, marginRight: 8 },
  expiry:     { fontSize: 12, color: colors.textMuted },

  requestBtn:     { margin: 16, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  requestBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
