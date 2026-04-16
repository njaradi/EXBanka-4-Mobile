import apiClient from './apiClient';

export const createOrder = async ({ assetId, quantity, limitValue, stopValue, isAon, isMargin, accountId, direction }) => {
  const { data } = await apiClient.post('/orders', {
    assetId,
    quantity,
    limitValue,
    stopValue,
    isAon,
    isMargin,
    accountId,
    direction,
  });
  return data; // { orderId, orderType, status, approximatePrice }
};

export const getOrderById = async (orderId) => {
  const { data } = await apiClient.get(`/orders/${orderId}`);
  return data;
};

export const cancelOrder = async (orderId) => {
  const { data } = await apiClient.delete(`/orders/${orderId}`);
  return data;
};

export const cancelOrderPortions = async (orderId) => {
  const { data } = await apiClient.delete(`/orders/${orderId}/portions`);
  return data;
};
