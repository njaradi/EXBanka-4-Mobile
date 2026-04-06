import apiClient from './apiClient';
import * as SecureStore from 'expo-secure-store';

export const login = async (email, password) => {
  const { data } = await apiClient.post('/client/login', { email, password, source: 'mobile' });
  return data; // { access_token, refresh_token }
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

export const getMe = async () => {
  const { data } = await apiClient.get('/client/me');
  return data;
};
