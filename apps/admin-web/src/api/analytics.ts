import { api } from '../lib/axios';

export const getKpis = async () => {
  const response: any = await api.get('/admin/analytics/kpis');
  return response.data;
};

export const getTimeSeriesData = async () => {
  const response: any = await api.get('/admin/analytics/time-series');
  return response.data;
};

export const getRecentTransactions = async (page = 1, limit = 10) => {
  const response: any = await api.get('/admin/analytics/transactions', { params: { page, limit } });
  return response.data;
};

