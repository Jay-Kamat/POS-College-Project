import apiClient from './apiClient';

const INITIAL_RETURN_REASONS = [
  { Id: 'ret_01', Name: 'Expired Goods' },
  { Id: 'ret_02', Name: 'Damaged Packaging / Seal Broken' },
  { Id: 'ret_03', Name: 'Quality Defect / Discoloration' },
  { Id: 'ret_04', Name: 'Excess Delivery Beyond PO' },
  { Id: 'ret_05', Name: 'Short Shelf-Life Delivered' },
];

const normalizeReturn = (ret) => {
  if (!ret) return ret;
  let items = ret.Items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  return {
    ...ret,
    TotalReturnAmount: parseFloat(ret.TotalReturnAmount || ret.TotalAmount || 0),
    Items: Array.isArray(items) ? items : []
  };
};

export const returnService = {
  getReturnReasons: async () => {
    try {
      const data = await apiClient.get('/api/material-returns/reasons');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('Fallback return reasons:', e.message);
    }
    return INITIAL_RETURN_REASONS;
  },

  getReturnStats: async () => {
    const res = await apiClient.get('/api/material-returns/stats');
    return res && res.data ? res.data : res;
  },

  getReturns: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.reasonId && filters.reasonId !== 'All') params.append('reasonId', filters.reasonId);
    if (filters.vendorId && filters.vendorId !== 'All') params.append('vendorId', filters.vendorId);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const data = await apiClient.get(`/api/material-returns?${params.toString()}`);
    const list = Array.isArray(data) ? data : (data?.data || []);
    return list.map(normalizeReturn);
  },

  getReturnNotes: async (filters) => {
    return returnService.getReturns(filters);
  },

  getReturnById: async (id) => {
    const data = await apiClient.get(`/api/material-returns/${id}`);
    return normalizeReturn(data);
  },

  createReturn: async (returnData) => {
    const created = await apiClient.post('/api/material-returns', returnData);
    return normalizeReturn({
      ...returnData,
      ...created,
      Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : returnData.Items
    });
  },

  createReturnNote: async (returnData) => {
    return returnService.createReturn(returnData);
  },

  updateReturnStatus: async (id, status) => {
    const updated = await apiClient.put(`/api/material-returns/${id}/status`, { status });
    return normalizeReturn(updated);
  }
};

export default returnService;
