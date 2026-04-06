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
import { getExchangeRates } from '../../services/exchangeService';
import { card, colors } from '../../theme';

const CURRENCY_NAMES = {
  EUR: 'Euro',
  CHF: 'Švajcarski franak',
  USD: 'Američki dolar',
  GBP: 'Britanska funta',
  JPY: 'Japanski jen',
  CAD: 'Kanadski dolar',
  AUD: 'Australijski dolar',
};

function fmtRate(value) {
  return Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function RateItem({ item }) {
  return (
    <View style={styles.row}>
      <View style={styles.codeBox}>
        <Text style={styles.code}>{item.currencyCode}</Text>
      </View>
      <View style={styles.nameBox}>
        <Text style={styles.name}>{CURRENCY_NAMES[item.currencyCode] ?? item.currencyCode}</Text>
      </View>
      <View style={styles.rateBox}>
        <Text style={styles.rate}>{fmtRate(item.sellingRate)}</Text>
        <Text style={styles.rateLabel}>RSD</Text>
      </View>
    </View>
  );
}

export default function ExchangeRatesScreen({ navigation }) {
  const [rates, setRates]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getExchangeRates();
      setRates(data);
      setUpdatedAt(new Date());
    } catch (e) {
      setError('Nije moguće učitati kurseve.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Prikazuje se prodajni kurs banke</Text>
        {updatedAt && (
          <Text style={styles.updatedText}>
            Ažurirano: {updatedAt.toLocaleTimeString('sr-RS')}
          </Text>
        )}
      </View>

      <View style={styles.header}>
        <Text style={[styles.headerCell, { flex: 0.7 }]}>Valuta</Text>
        <Text style={[styles.headerCell, { flex: 1.6 }]}>Naziv</Text>
        <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Prodajni kurs</Text>
      </View>

      <FlatList
        data={rates}
        keyExtractor={(item) => item.currencyCode}
        renderItem={({ item }) => <RateItem item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity
        style={styles.calcBtn}
        onPress={() => navigation.navigate('ExchangeCalculator')}
      >
        <Text style={styles.calcBtnText}>Otvori kalkulator</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPage,
  },
  infoBox: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  updatedText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 12,
    gap: 8,
  },
  row: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeBox: {
    flex: 0.7,
  },
  code: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  nameBox: {
    flex: 1.6,
  },
  name: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rateBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rateLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  calcBtn: {
    margin: 16,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  calcBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
