import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { pollApproval, rejectRequest } from '../../services/approvalService';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

const ACTION_LABELS = {
  LOGIN: 'Pokušaj prijave',
  PAYMENT: 'Plaćanje',
  TRANSFER: 'Transfer između računa',
  LIMIT_CHANGE: 'Promena limita računa',
  CARD_REQUEST: 'Zahtev za karticu',
};

const POLL_INTERVAL = 5000;
const TIMEOUT_MS = 5 * 60 * 1000;

export default function PendingApprovalScreen({ navigation, route }) {
  const { approvalRequestId, actionType } = route.params;
  const { loginWithTokens } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    startPolling();
    timeoutRef.current = setTimeout(handleExpire, TIMEOUT_MS);
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const startPolling = () => {
    intervalRef.current = setInterval(async () => {
      try {
        const result = await pollApproval(approvalRequestId);
        if (result.status === 'APPROVED') {
          handleApproved(result);
        } else if (result.status === 'REJECTED') {
          handleRejected();
        } else if (result.status === 'EXPIRED') {
          handleExpire();
        }
      } catch {
        // network error — keep polling
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
  };

  const handleApproved = async (result) => {
    stopPolling();
    if (actionType === 'LOGIN' && result?.access_token) {
      await loginWithTokens(result.access_token, result.refresh_token);
    } else {
      navigation.goBack();
    }
  };

  const handleRejected = () => {
    stopPolling();
    Alert.alert('Odbijeno', 'Akcija je odbijena.', [
      { text: 'U redu', onPress: () => navigation.goBack() },
    ]);
  };

  const handleExpire = () => {
    stopPolling();
    Alert.alert('Isteklo', 'Vreme za potvrdu je isteklo. Pokušajte ponovo.', [
      { text: 'U redu', onPress: () => navigation.goBack() },
    ]);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await rejectRequest(approvalRequestId);
    } catch {
      // proceed regardless
    } finally {
      stopPolling();
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoLetter}>A</Text>
      </View>
      <Text style={styles.logo}>Anka<Text style={styles.logoBrand}>Banka</Text></Text>

      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

      <Text style={styles.title}>Čeka se odobrenje</Text>
      <View style={styles.divider} />
      <Text style={styles.subtitle}>Potvrdite akciju na mobilnom uređaju</Text>

      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>TIP AKCIJE</Text>
        <Text style={styles.actionValue}>{ACTION_LABELS[actionType] ?? actionType}</Text>
      </View>

      <Text style={styles.hint}>
        Otvorite mobilnu aplikaciju i odobrite ili odbijte zahtev.{'\n'}
        Zahtev ističe za 5 minuta.
      </Text>

      <TouchableOpacity
        style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
        onPress={handleCancel}
        disabled={cancelling}
      >
        {cancelling
          ? <ActivityIndicator color={colors.error} />
          : <Text style={styles.cancelText}>OTKAŽI</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgSurface,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  logoBox: {
    width: 32, height: 32, borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  logoLetter: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  logo: { fontSize: 20, fontWeight: '300', color: colors.textPrimary, letterSpacing: 2, marginBottom: 32 },
  logoBrand: { color: colors.primary },
  spinner: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '300', color: colors.textPrimary, letterSpacing: 1, marginBottom: 12 },
  divider: { width: 32, height: 1, backgroundColor: colors.primary, marginBottom: 12 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  actionBox: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 4,
    padding: 16, width: '100%', marginBottom: 24, backgroundColor: colors.bgPage,
  },
  actionLabel: { fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginBottom: 6, fontWeight: '500' },
  actionValue: { fontSize: 15, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  cancelBtn: {
    borderWidth: 1, borderColor: colors.error, borderRadius: 4,
    paddingVertical: 12, paddingHorizontal: 40,
  },
  btnDisabled: { opacity: 0.5 },
  cancelText: { color: colors.error, fontWeight: '600', fontSize: 12, letterSpacing: 2 },
});
