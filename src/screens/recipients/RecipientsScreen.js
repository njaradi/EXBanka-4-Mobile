import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getRecipients, deleteRecipient } from '../../services/paymentService';
import { card, colors } from '../../theme';

function RecipientItem({ item, onEdit, onDelete, onSelect }) {
  return (
    <TouchableOpacity style={[card, styles.item]} onPress={onSelect} activeOpacity={0.7}>
      <View style={styles.itemMain}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{item.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemAccount}>{item.accountNumber}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editBtnText}>Izmeni</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>Obriši</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipientsScreen({ navigation }) {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getRecipients();
      setRecipients(data ?? []);
    } catch {
      setError('Greška pri učitavanju primaoca.');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = (item) => {
    Alert.alert(
      'Brisanje primaoca',
      `Da li ste sigurni da želite da obrišete primaoca "${item.name}"?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecipient(item.id);
              setRecipients(prev => prev.filter(r => r.id !== item.id));
              Alert.alert('Uspešno', 'Primalac obrisan.');
            } catch {
              Alert.alert('Greška', 'Brisanje nije uspelo. Pokušajte ponovo.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddRecipient', {})}
        >
          <Text style={styles.addBtnText}>+ Dodaj primaoca</Text>
        </TouchableOpacity>
      </View>

      {recipients.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nema sačuvanih primaoca.</Text>
        </View>
      ) : (
        <FlatList
          data={recipients}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <RecipientItem
              item={item}
              onSelect={() => navigation.navigate('NewPayment', {
                recipientName: item.name,
                recipientAccount: item.accountNumber,
              })}
              onEdit={() => navigation.navigate('EditRecipient', { recipient: item })}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
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
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  addBtn:     { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  list: { padding: 16, gap: 8, paddingBottom: 40 },

  item:     { padding: 12 },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconText:    { fontSize: 16, fontWeight: '700', color: colors.primary },
  itemInfo:    { flex: 1, minWidth: 0 },
  itemName:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  itemAccount: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },

  editBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.primary },
  editBtnText:  { fontSize: 12, color: colors.primary, fontWeight: '600' },
  deleteBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.error },
  deleteBtnText:{ fontSize: 12, color: colors.error, fontWeight: '600' },
});
