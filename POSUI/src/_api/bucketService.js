import apiClient from './apiClient';

export const bucketService = {
  getBuckets: async () => {
    try {
      const data = await apiClient.get('/api/buckets');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('Fallback getting local buckets:', e.message);
      try {
        return JSON.parse(localStorage.getItem('pos_held_buckets') || '[]');
      } catch (err) {
        return [];
      }
    }
  },

  saveBucket: async (bucket) => {
    try {
      const saved = await apiClient.post('/api/buckets', bucket);
      return saved;
    } catch (e) {
      console.warn('Fallback saving local bucket:', e.message);
      return bucket;
    }
  },

  deleteBucket: async (id) => {
    try {
      await apiClient.delete(`/api/buckets/${id}`);
      return true;
    } catch (e) {
      console.warn('Fallback deleting local bucket:', e.message);
      return false;
    }
  }
};

export default bucketService;
