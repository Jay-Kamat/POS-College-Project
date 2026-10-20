import apiClient from './apiClient';

export const productService = {
  getCategories: async () => {
    return await apiClient.get('/api/categories');
  },

  createCategory: async (name) => {
    return await apiClient.post('/api/categories', { name });
  },

  getTaxRates: async () => {
    return await apiClient.get('/api/tax-rates');
  },

  createTaxRate: async (rate) => {
    return await apiClient.post('/api/tax-rates', rate);
  },

  getProducts: async ({ categoryId, searchTerm, search, page = 1, pageSize = 100 } = {}) => {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 'cat_all') params.append('categoryId', categoryId);
    const term = search || searchTerm;
    if (term) params.append('searchTerm', term);
    params.append('page', page);
    params.append('pageSize', pageSize);

    const res = await apiClient.get(`/api/products?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.data || res?.items || []);
  },

  getProductById: async (id) => {
    return await apiClient.get(`/api/products/${id}`);
  },

  getProductByBarcode: async (barcode) => {
    return await apiClient.get(`/api/products/barcode/${encodeURIComponent(barcode)}`);
  },

  getProductStats: async () => {
    const res = await apiClient.get('/api/products/stats');
    return res?.data !== undefined ? res.data : res;
  },

  createProduct: async (product) => {
    return await apiClient.post('/api/products', product);
  },

  updateProduct: async (id, product) => {
    return await apiClient.put(`/api/products/${id}`, product);
  },

  deleteProduct: async (id) => {
    return await apiClient.delete(`/api/products/${id}`);
  },

  getMeasuringUnits: () => [
    { code: 'PCS', name: 'Pieces (Unit Count)' },
    { code: 'PACK', name: 'Standard Pack' },
    { code: 'KG', name: 'Kilograms (Weight)' },
    { code: 'GM', name: 'Grams (Weight)' },
    { code: 'LTR', name: 'Liters (Volume)' },
    { code: 'ML', name: 'Milliliters (Volume)' },
    { code: 'BOX', name: 'Carton / Box' },
    { code: 'BOTTLE', name: 'Bottles' }
  ]
};

export default productService;
