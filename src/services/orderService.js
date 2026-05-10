import apiClient from './apiClient';

export const createOrder = async ({ assetId, quantity, limitValue, stopValue, isAon, isMargin, accountId, direction }) => {
  const { data } = await apiClient.post('/client/orders', {
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
  const { data } = await apiClient.get(`/client/orders/${orderId}`);
  const o = data.order;
  return {
    orderId:          o.id,
    orderType:        o.order_type,
    status:           o.status,
    approximatePrice: o.price_per_unit,
    quantity:         o.quantity,
    direction:        o.direction,
    isAon:            o.is_aon,
    isMargin:         o.is_margin,
  };
};

export const cancelOrder = async (orderId) => {
  const { data } = await apiClient.delete(`/client/orders/${orderId}`);
  return data;
};

export const cancelOrderPortions = async (orderId) => {
  const { data } = await apiClient.delete(`/client/orders/${orderId}/portions`);
  return data;
};
