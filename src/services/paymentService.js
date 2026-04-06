import apiClient from './apiClient';

export const getPayments = async (params = {}) => {
  const { data } = await apiClient.get('/api/payments', {
    params: { limit: 20, ...params },
  });
  return data;
};

export const getPaymentById = async (paymentId) => {
  const { data } = await apiClient.get(`/api/payments/${paymentId}`);
  return data;
};

export const getRecipients = async () => {
  const { data } = await apiClient.get('/api/recipients');
  return data;
};

export const createPayment = async (payload) => {
  const { data } = await apiClient.post('/api/payments/create', payload);
  return data;
};

export const createTransfer = async (payload) => {
  const { data } = await apiClient.post('/api/transfers', payload);
  return data;
};

export const createRecipient = async (payload) => {
  const { data } = await apiClient.post('/api/recipients', payload);
  return data;
};

export const updateRecipient = async (id, payload) => {
  const { data } = await apiClient.put(`/api/recipients/${id}`, payload);
  return data;
};

export const deleteRecipient = async (id) => {
  const { data } = await apiClient.delete(`/api/recipients/${id}`);
  return data;
};

export const getTransfers = async () => {
  const { data } = await apiClient.get('/api/transfers');
  return data;
};
