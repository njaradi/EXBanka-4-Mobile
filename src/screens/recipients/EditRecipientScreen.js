import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { updateRecipient } from '../../services/paymentService';
import { colors } from '../../theme';

export default function EditRecipientScreen({ navigation, route }) {
  const { recipient } = route.params;

  const [name, setName]               = useState(recipient.name ?? '');
  const [accountNumber, setAccountNumber] = useState(recipient.accountNumber ?? '');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Unesite naziv primaoca.'); return; }
    if (!accountNumber.trim()) { setError('Unesite broj računa.'); return; }

    setLoading(true);
    setError(null);
    try {
      await updateRecipient(recipient.id, {
        name: name.trim(),
        accountNumber: accountNumber.trim(),
      });
      Alert.alert('Uspešno', 'Primalac je ažuriran.', [
        { text: 'U redu', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e?.response?.data?.error || 'Greška. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Naziv primaoca</Text>
        <TextInput
          style={styles.input}
          placeholder="npr. Petar Petrović"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Broj računa primaoca</Text>
        <TextInput
          style={styles.input}
          placeholder="265-XXXXXXXXXXXXXXXXX-XX"
          placeholderTextColor={colors.textMuted}
          value={accountNumber}
          onChangeText={setAccountNumber}
          autoCapitalize="none"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sačuvaj izmene</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.cancelText}>Otkaži</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 40 },

  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgSurface, marginBottom: 12,
  },
  error:      { color: colors.error, fontSize: 13, marginBottom: 12 },
  btn:        { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText:    { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
});
