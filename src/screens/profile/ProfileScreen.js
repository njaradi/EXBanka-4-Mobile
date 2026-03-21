import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getMe } from '../../services/authService';
import { card, colors } from '../../theme';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    getMe()
      .then(setProfile)
      .catch(() => setError('Greška pri učitavanju profila.'))
      .finally(() => setLoading(false));
  }, []));

  const handleLogout = () => {
    Alert.alert(
      'Odjava',
      'Da li ste sigurni da se želite odjaviti?',
      [
        { text: 'Otkaži', style: 'cancel' },
        { text: 'Odjavi se', style: 'destructive', onPress: () => logout() },
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

  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.first_name?.[0] ?? ''}{profile?.last_name?.[0] ?? ''}
          </Text>
        </View>
        <Text style={styles.heroName}>{fullName}</Text>
        <Text style={styles.heroUsername}>@{profile?.username}</Text>
      </View>

      <View style={[card, styles.infoCard]}>
        <Row label="E-mail"        value={profile?.email} />
        <Row label="Broj telefona" value={profile?.phone_number} />
        <Row label="Adresa"        value={profile?.address} />
        <Row label="Datum rođenja" value={profile?.date_of_birth} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, textAlign: 'center' },

  hero: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText:   { color: '#fff', fontSize: 26, fontWeight: '700' },
  heroName:     { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  heroUsername: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  infoCard: { padding: 4, marginBottom: 24 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },

  logoutBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14, borderRadius: 8, alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
