import apiClient from './apiClient';

export const getMyCards = async () => {
  const { data } = await apiClient.get('/api/cards');
  return data;
};

export const getCardById = async (cardId) => {
  const { data } = await apiClient.get(`/api/cards/id/${cardId}`);
  return data;
};

export const blockCard = async (cardId) => {
  await apiClient.put(`/api/cards/${cardId}/block`);
};

export const initiateCardRequest = async (payload) => {
  const { data } = await apiClient.post('/api/cards/request', payload);
  return data; // { requestToken }
};

export const confirmCardRequest = async (requestToken, code) => {
  const { data } = await apiClient.post('/api/cards/request/confirm', { requestToken, code });
  return data; // CardResponse
};
