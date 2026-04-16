import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email je obavezan';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email nije ispravan';
    if (!password) e.password = 'Lozinka je obavezna';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.status === 'PENDING') {
        navigation.navigate('PendingApproval', {
          approvalRequestId: result.approvalRequestId,
          actionType: 'LOGIN',
        });
      }
      // SUCCESS handled by AuthContext — AppNavigator switches to MainTabs automatically
    } catch (err) {
      const msg = err.response?.data?.error || 'Pogrešni podaci';
      Alert.alert('Greška pri prijavi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={styles.logo}>
            Anka<Text style={styles.logoBrand}>Banka</Text>
          </Text>
          <Text style={styles.subtitle}>KLIJENTSKI PORTAL</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="vas@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={[styles.label, { marginTop: 20 }]}>LOZINKA</Text>
          <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>PRIJAVI SE</Text>}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgPage },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 36, height: 36,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  logo: { fontSize: 26, fontWeight: '300', color: colors.textPrimary, letterSpacing: 2 },
  logoBrand: { color: colors.primary, fontWeight: '300' },
  subtitle: {
    fontSize: 11, letterSpacing: 3, color: colors.primary,
    marginTop: 6, fontWeight: '500',
  },
  divider: { width: 40, height: 1, backgroundColor: colors.primary, marginTop: 16 },
  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 24,
  },
  label: {
    fontSize: 11, fontWeight: '500', letterSpacing: 2,
    color: colors.textSecondary, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 4,
    padding: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.bgPage,
  },
  inputError: { borderColor: colors.error },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 4,
    backgroundColor: colors.bgPage,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: colors.textPrimary },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 16 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: colors.primary, borderRadius: 4,
    padding: 16, alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 2 },
});
