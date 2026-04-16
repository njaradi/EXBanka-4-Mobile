import apiClient from './apiClient';

export const getExchangeRates = async () => {
  const { data } = await apiClient.get('/exchange/rates');
  return data;
};

export const previewConversion = async ({ fromCurrency, toCurrency, amount }) => {
  const { data } = await apiClient.post('/exchange/preview', {
    fromCurrency,
    toCurrency,
    amount,
  });
  return data;
};

export const convertAmount = async ({ fromAccount, toAccount, amount }) => {
  const { data } = await apiClient.post('/exchange/convert', {
    fromAccount,
    toAccount,
    amount,
  });
  return data;
};

export const getExchangeHistory = async () => {
  const { data } = await apiClient.get('/exchange/history');
  return data;
};
