import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { getApprovals } from '../../services/approvalService';
import { colors, status as statusColors, card } from '../../theme';

const POLL_INTERVAL = 5000;

const getActionLabel = (item) => {
  switch (item.type) {
    case 'LOGIN': return 'Pokušaj prijave';
    case 'PAYMENT': return item.payload?.toAccount
      ? `Plaćanje ka ${item.payload.toAccount}`
      : 'Plaćanje';
    case 'TRANSFER': return 'Transfer između računa';
    case 'LIMIT_CHANGE': return 'Promena limita računa';
    case 'CARD_REQUEST': return 'Zahtev za karticu';
    default: return item.type;
  }
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function ApprovalsScreen({ navigation }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const intervalRef = useRef(null);

  const fetchApprovals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getApprovals();
      setApprovals(data);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    intervalRef.current = setInterval(() => fetchApprovals(true), POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchApprovals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovals();
  };

  const displayed = showAll
    ? approvals
    : approvals.filter((a) => a.status === 'PENDING');

  const renderItem = ({ item }) => {
    const color = statusColors[item.status] ?? colors.textMuted;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ApprovalDetail', { approvalId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>{getActionLabel(item)}</Text>
          <View style={[styles.badge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>PRIKAŽI SVE ZAHTEVE</Text>
        <Switch
          value={showAll}
          onValueChange={setShowAll}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.bgSurface}
        />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={displayed.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nema aktivnih zahteva</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgSurface, padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterLabel: { fontSize: 11, letterSpacing: 2, color: colors.textSecondary, fontWeight: '500' },
  list: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  card: {
    ...card,
    padding: 16, marginBottom: 8,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, flex: 1, marginRight: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardDate: { fontSize: 12, color: colors.textMuted },
});
