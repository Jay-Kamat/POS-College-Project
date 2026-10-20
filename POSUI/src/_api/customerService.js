import apiClient from './apiClient';

export const customerService = {
  getCustomers: async (searchTerm = '', page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);

    const data = await apiClient.get(`/api/customers?${params.toString()}`);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  getCustomerByMobile: async (mobile) => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    try {
      return await apiClient.get(`/api/customers/by-mobile/${cleanMobile}`);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  },

  createCustomer: async (customerData) => {
    return await apiClient.post('/api/customers', customerData);
  },

  updateCustomer: async (id, customerData) => {
    return await apiClient.put(`/api/customers/${id}`, customerData);
  },

  getCustomerStats: async () => {
    return await apiClient.get('/api/customers/stats');
  },

  getCustomerById: async (id) => {
    return await apiClient.get(`/api/customers/${id}`);
  },

  getCustomerInvoices: async (id) => {
    const data = await apiClient.get(`/api/customers/${id}/invoices`);
    return Array.isArray(data) ? data : [];
  },

  deleteCustomer: async (id) => {
    await apiClient.delete(`/api/customers/${id}`);
    return true;
  }
};

export default customerService;
