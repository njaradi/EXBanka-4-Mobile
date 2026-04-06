import apiClient from './apiClient';

export const getMyLoans = async () => {
  const { data } = await apiClient.get('/loans');
  return data;
};

export const getLoanDetails = async (loanId) => {
  const { data } = await apiClient.get(`/loans/${loanId}`);
  return data;
};

export const applyForLoan = async (payload) => {
  const { data } = await apiClient.post('/loans/apply', payload);
  return data;
};
