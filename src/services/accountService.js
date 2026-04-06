import apiClient from './apiClient';

export const getMyAccounts = async () => {
  const { data } = await apiClient.get('/api/accounts/my');
  return data; // [{ accountId, accountName, accountNumber, availableBalance, currency }]
};

export const getAccount = async (accountId) => {
  const { data } = await apiClient.get(`/api/accounts/${accountId}`);
  return data;
};

export const renameAccount = async (accountId, newAccountName) => {
  const { data } = await apiClient.put(`/api/accounts/${accountId}/name`, { newAccountName });
  return data;
};
