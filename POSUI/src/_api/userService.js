import apiClient from './apiClient';

export const userService = {
  getUsers: async (page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);

    const data = await apiClient.get(`/api/users?${params.toString()}`);
    return Array.isArray(data) ? data : (data?.data || []);
  },

  getUserStats: async () => {
    return await apiClient.get('/api/users/stats');
  },

  inviteUser: async (userData) => {
    return await apiClient.post('/api/users', userData);
  },

  updateUser: async (userId, userData) => {
    return await apiClient.put(`/api/users/${userId}`, userData);
  },

  updateUserRole: async (userId, role) => {
    return await apiClient.put(`/api/users/${userId}/role`, { role });
  },

  deleteUser: async (userId) => {
    await apiClient.delete(`/api/users/${userId}`);
    return true;
  },

  getPermissionsMatrix: async () => {
    const data = await apiClient.get('/api/users/permissions-matrix');
    if (Array.isArray(data)) {
      return data.map(row => ({
        module: row.module || row.Module,
        admin: typeof row.admin === 'string' ? JSON.parse(row.admin) : (row.admin || { view: true, create: true, edit: true, delete: true, export: true }),
        storeManager: typeof row.storeManager === 'string' ? JSON.parse(row.storeManager) : (row.storeManager || { view: true, create: true, edit: true, delete: false, export: true }),
        cashier: typeof row.cashier === 'string' ? JSON.parse(row.cashier) : (row.cashier || { view: false, create: false, edit: false, delete: false, export: false }),
        inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory) : (row.inventory || { view: false, create: false, edit: false, delete: false, export: false })
      }));
    }
    return [];
  },

  savePermissionsMatrix: async (matrix) => {
    return await apiClient.post('/api/users/permissions-matrix/bulk', matrix);
  },

  updatePermission: async (moduleIndex, roleKey, actionKey, value) => {
    return await apiClient.put('/api/users/permissions-matrix', { moduleIndex, roleKey, actionKey, value });
  }
};

export default userService;
