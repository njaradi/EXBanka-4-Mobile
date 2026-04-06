import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { renameAccount } from '../../services/accountService';
import { colors } from '../../theme';

export default function RenameAccountScreen({ route, navigation }) {
  const { accountId, currentName } = route.params;
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Naziv ne sme biti prazan.');
      return;
    }
    if (trimmed === currentName) {
      navigation.goBack();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await renameAccount(accountId, trimmed);
      Alert.alert('Uspešno', 'Naziv računa je promenjen.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Greška pri promeni naziva. Pokušajte ponovo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Novi naziv računa</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoFocus
        maxLength={100}
        placeholder="Unesite naziv"
        placeholderTextColor={colors.textMuted}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Sačuvaj</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
        <Text style={styles.cancelText}>Otkaži</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, padding: 20, paddingTop: 32 },
  label:     { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  input:     {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    marginBottom: 16,
  },
  error:     { color: colors.error, fontSize: 13, marginBottom: 12 },
  btn:       { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText:   { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText:{ color: colors.textSecondary, fontSize: 14 },
});