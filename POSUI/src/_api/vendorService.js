import apiClient from './apiClient';

export const vendorService = {
  getVendorStats: async () => {
    const res = await apiClient.get('/api/vendors/stats');
    return res && res.data ? res.data : res;
  },

  getVendors: async (searchTerm = '', page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);

    const data = await apiClient.get(`/api/vendors?${params.toString()}`);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  getVendorById: async (id) => {
    return await apiClient.get(`/api/vendors/${id}`);
  },

  createVendor: async (vendorData) => {
    return await apiClient.post('/api/vendors', vendorData);
  },

  updateVendor: async (id, vendorData) => {
    return await apiClient.put(`/api/vendors/${id}`, vendorData);
  },

  deleteVendor: async (id) => {
    await apiClient.delete(`/api/vendors/${id}`);
    return true;
  }
};

export default vendorService;
