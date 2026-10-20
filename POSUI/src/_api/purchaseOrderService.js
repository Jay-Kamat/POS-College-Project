import apiClient from './apiClient';

const normalizePO = (po) => {
  if (!po) return po;
  let items = po.Items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  return {
    ...po,
    Items: Array.isArray(items) ? items : []
  };
};

export const purchaseOrderService = {
  getPurchaseOrderStats: async () => {
    return await apiClient.get('/api/purchase-orders/stats');
  },

  getPurchaseOrders: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters.excludeStatus) params.append('excludeStatus', filters.excludeStatus);
    if (filters.vendorId && filters.vendorId !== 'All') params.append('vendorId', filters.vendorId);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const data = await apiClient.get(`/api/purchase-orders?${params.toString()}`);
    const list = Array.isArray(data) ? data : (data?.data || []);
    return list.map(normalizePO);
  },

  getPurchaseOrderById: async (id) => {
    const data = await apiClient.get(`/api/purchase-orders/${id}`);
    return normalizePO(data);
  },

  createPurchaseOrder: async (poData) => {
    const created = await apiClient.post('/api/purchase-orders', poData);
    return normalizePO({
      ...poData,
      ...created,
      Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : poData.Items
    });
  },

  updatePurchaseOrderStatus: async (id, status) => {
    const updated = await apiClient.put(`/api/purchase-orders/${id}/status`, { status });
    return normalizePO(updated);
  }
};

export default purchaseOrderService;
