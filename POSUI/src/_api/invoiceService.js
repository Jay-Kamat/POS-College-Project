import apiClient from './apiClient';

export const invoiceService = {
  getInvoices: async ({ startDate, endDate, search, searchTerm, paymentMode, status, page = 1, pageSize = 50 } = {}) => {
    const queryTerm = search || searchTerm || '';
    const queryStatus = status || 'all';

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (queryTerm) params.append('search', queryTerm);
    if (queryStatus) params.append('status', queryStatus);
    if (paymentMode !== undefined && paymentMode !== '' && paymentMode !== 'all') {
      params.append('paymentMode', paymentMode);
    }
    params.append('page', page);
    params.append('pageSize', pageSize);

    const res = await apiClient.get(`/api/invoices?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.data || res?.items || []);
  },

  getInvoiceStats: async () => {
    const res = await apiClient.get('/api/invoices/stats');
    return res?.data !== undefined ? res.data : res;
  },

  getInvoiceById: async (id) => {
    return await apiClient.get(`/api/invoices/${id}`);
  },

  createInvoice: async (cart, activeStore, idempotencyKey = null) => {
    const key = idempotencyKey || `pos_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const headers = { 'X-Idempotency-Key': key };
    return await apiClient.post('/api/invoices', { cart, activeStore, idempotencyKey: key }, { headers });
  },

  createInvoiceFromCart: async (cart, activeStore, idempotencyKey = null) => {
    const key = idempotencyKey || `pos_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const headers = { 'X-Idempotency-Key': key };
    return await apiClient.post('/api/invoices', { cart, activeStore, idempotencyKey: key }, { headers });
  },

  cancelInvoice: async (id, reason) => {
    return await apiClient.post(`/api/invoices/${id}/cancel`, { reason });
  }
};

export default invoiceService;
