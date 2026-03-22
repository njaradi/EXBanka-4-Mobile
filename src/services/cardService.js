import apiClient from './apiClient';

export const getMyCards = async () => {
  const { data } = await apiClient.get('/cards');
  return data;
};

export const getCardById = async (cardId) => {
  const { data } = await apiClient.get(`/cards/id/${cardId}`);
  return data;
};

export const blockCard = async (cardNumber) => {
  await apiClient.put(`/cards/${cardNumber}/block`);
};

export const initiateCardRequest = async (payload) => {
  const { data } = await apiClient.post('/cards/request', payload);
  return data; // { requestToken }
};

export const confirmCardRequest = async (requestToken, code) => {
  const { data } = await apiClient.post('/cards/request/confirm', { requestToken, code });
  return data; // CardResponse
};
