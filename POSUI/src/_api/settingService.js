import apiClient from './apiClient';

export const settingService = {
  getStores: async () => {
    const data = await apiClient.get('/api/stores');
    if (Array.isArray(data)) {
      localStorage.setItem('pos_stores', JSON.stringify(data));
      return data;
    }
    return [];
  },

  getStoreProfile: async (storeId = null) => {
    const url = storeId ? `/api/settings/store-profile?storeId=${encodeURIComponent(storeId)}` : '/api/settings/store-profile';
    const data = await apiClient.get(url);
    if (data) {
      localStorage.setItem('pos_store_profile', JSON.stringify(data));
      return data;
    }
    return null;
  },

  updateStoreProfile: async (data) => {
    const updated = await apiClient.put('/api/settings/store-profile', data);
    localStorage.setItem('pos_store_profile', JSON.stringify(updated));
    return updated;
  },

  createStore: async (storeData) => {
    const created = await apiClient.post('/api/stores', storeData);
    return created;
  },

  getTaxRates: async () => {
    const data = await apiClient.get('/api/tax-rates');
    return Array.isArray(data) ? data : [];
  },

  addTaxRate: async (taxData) => {
    return await apiClient.post('/api/tax-rates', taxData);
  }
};

export default settingService;
