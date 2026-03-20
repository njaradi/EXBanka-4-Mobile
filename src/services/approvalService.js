import apiClient from './apiClient';

export const getApprovals = async () => {
  const { data } = await apiClient.get('/api/mobile/approvals');
  return data;
};

export const getApprovalById = async (id) => {
  const { data } = await apiClient.get(`/api/mobile/approvals/${id}`);
  return data;
};

export const approveRequest = async (id) => {
  const { data } = await apiClient.put(`/api/twofactor/${id}/approve`);
  return data;
};

export const rejectRequest = async (id) => {
  const { data } = await apiClient.put(`/api/twofactor/${id}/reject`);
  return data;
};

export const registerPushToken = async (token) => {
  await apiClient.post('/api/mobile/push-token', { token });
};

export const unregisterPushToken = async () => {
  await apiClient.delete('/api/mobile/push-token');
};

// Public — no auth required. Used by PendingApprovalScreen before login.
export const pollApproval = async (id) => {
  const { data } = await apiClient.get(`/api/approvals/${id}/poll`);
  return data; // { status, access_token?, refresh_token? }
};
