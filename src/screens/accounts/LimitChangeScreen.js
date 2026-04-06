import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createApproval } from '../../services/approvalService';
import { card, colors } from '../../theme';

function fmt(value) {
  if (value == null) return 'Nije postavljeno';
  return Number(value).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LimitChangeScreen({ route, navigation }) {
  const { accountId, accountNumber, dailyLimit, monthlyLimit, currency } = route.params;

  const [daily, setDaily] = useState(dailyLimit != null ? String(dailyLimit) : '');
  const [monthly, setMonthly] = useState(monthlyLimit != null ? String(monthlyLimit) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = async () => {
    const dailyVal = daily.trim() ? parseFloat(daily.replace(',', '.')) : null;
    const monthlyVal = monthly.trim() ? parseFloat(monthly.replace(',', '.')) : null;

    if (dailyVal !== null && (isNaN(dailyVal) || dailyVal < 0)) {
      setError('Dnevni limit mora biti pozitivan broj.');
      return;
    }
    if (monthlyVal !== null && (isNaN(monthlyVal) || monthlyVal < 0)) {
      setError('Mesečni limit mora biti pozitivan broj.');
      return;
    }
    if (dailyVal === null && monthlyVal === null) {
      setError('Unesite bar jedan limit.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const approval = await createApproval('LIMIT_CHANGE', {
        accountId,
        accountNumber,
        oldDailyLimit:   dailyLimit ?? 0,
        oldMonthlyLimit: monthlyLimit ?? 0,
        dailyLimit:      dailyVal,
        monthlyLimit:    monthlyVal,
      });
      navigation.replace('PendingApproval', {
        approvalRequestId: approval.id,
        actionType: 'LIMIT_CHANGE',
      });
    } catch (e) {
      setError(e?.response?.data?.error || 'Greška. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[card, styles.infoCard]}>
          <Text style={styles.infoLabel}>Račun</Text>
          <Text style={styles.infoValue}>{accountNumber}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Trenutni dnevni limit</Text>
              <Text style={styles.infoValue}>{fmt(dailyLimit)} {currency}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Trenutni mesečni limit</Text>
              <Text style={styles.infoValue}>{fmt(monthlyLimit)} {currency}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Novi dnevni limit ({currency})</Text>
        <TextInput
          style={styles.input}
          value={daily}
          onChangeText={setDaily}
          keyboardType="decimal-pad"
          placeholder={`Trenutno: ${fmt(dailyLimit)}`}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Novi mesečni limit ({currency})</Text>
        <TextInput
          style={styles.input}
          value={monthly}
          onChangeText={setMonthly}
          keyboardType="decimal-pad"
          placeholder={`Trenutno: ${fmt(monthlyLimit)}`}
          placeholderTextColor={colors.textMuted}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.hint}>
          Promena limita zahteva odobrenje. Nakon klika na "Nastavi" bićete obavešteni putem aplikacije.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={handleContinue} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Nastavi</Text>}
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

  infoCard:  { padding: 16, marginBottom: 24 },
  infoRow:   { flexDirection: 'row', gap: 16, marginTop: 12 },
  infoCol:   { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  label:  { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  input:  {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, fontSize: 16, color: colors.textPrimary,
    backgroundColor: colors.bgSurface, marginBottom: 16,
  },
  error:  { color: colors.error, fontSize: 13, marginBottom: 12 },
  hint:   { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 24 },

  btn:       { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnText:   { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText:{ color: colors.textSecondary, fontSize: 14 },
});