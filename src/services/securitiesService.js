import apiClient from './apiClient';

export const getSecurities = async ({ type, page = 0, pageSize = 20, ticker, name, exchange, sortBy, sortOrder } = {}) => {
  const params = { page, pageSize };
  if (type)     params.type     = type;
  if (ticker)   params.ticker   = ticker;
  if (name)     params.name     = name;
  if (exchange) params.exchange = exchange;
  if (sortBy)   params.sortBy   = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  const { data } = await apiClient.get('/securities', { params });
  return data; // { listings, totalPages, totalElements }
};

export const getSecurityById = async (id) => {
  const { data } = await apiClient.get(`/securities/${id}`);
  return data; // { summary, priceHistory, detail }
};
