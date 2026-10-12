import apiClient from './apiClient';

// Users & RBAC Matrix Service Layer (Admin -> Store Manager -> Cashier -> Inventory)
const INITIAL_USERS = [
  {
    Id: 'user_01',
    Name: 'Jay Sharma',
    Email: 'admin@dailymart.in',
    Role: 'Admin',
    Store: 'All Outlets (Super Admin)',
    Status: 'Active',
    LastLogin: '2026-10-12, 02:45 PM'
  },
  {
    Id: 'user_02',
    Name: 'Amit Deshmukh',
    Email: 'manager.mumbai@dailymart.in',
    Role: 'Store Manager',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-12, 01:15 PM'
  },
  {
    Id: 'user_03',
    Name: 'Pooja Nair',
    Email: 'cashier1@dailymart.in',
    Role: 'Cashier',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-12, 12:40 PM'
  },
  {
    Id: 'user_04',
    Name: 'Vikram Singh',
    Email: 'inventory@dailymart.in',
    Role: 'Inventory',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-12, 11:20 AM'
  }
];

const INITIAL_PERMISSIONS_MATRIX = [
  { module: 'Dashboard', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'POS Billing Terminal', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Invoices & Receipts', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: true, create: true, edit: false, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Product Catalog', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: true, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: true, export: true } },
  { module: 'Vendors Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Purchase Orders', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Material Inward & Barcoding', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Vendor Material Returns', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Customer Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Reports & Analytics', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: false, edit: false, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: false, edit: false, delete: false, export: true } },
  { module: 'Store Profile & Settings', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: false, edit: true, delete: false, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'User Management & Roles', admin: { view: true, create: true, edit: true, delete: true, export: true }, storeManager: { view: true, create: true, edit: true, delete: false, export: false }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
];

export const userService = {
  getUsers: async () => {
    try {
      const data = await apiClient.get('/api/users');
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('pos_users', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Fallback users:', e.message);
    }
    const local = localStorage.getItem('pos_users');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_USERS;
  },

  getUserStats: async () => {
    try {
      const data = await apiClient.get('/api/users/stats');
      if (data && typeof data === 'object') return data;
    } catch (e) {
      console.warn('Fallback user stats:', e.message);
    }
    const users = await userService.getUsers();
    return {
      totalUsers: users.length,
      admins: users.filter(u => u.Role?.toLowerCase() === 'admin').length,
      storeManagers: users.filter(u => u.Role?.toLowerCase().includes('manager')).length,
      cashiers: users.filter(u => u.Role?.toLowerCase() === 'cashier').length,
      inventory: users.filter(u => u.Role?.toLowerCase().includes('inventory')).length
    };
  },

  inviteUser: async (userData) => {
    try {
      const created = await apiClient.post('/api/users', userData);
      const list = await userService.getUsers();
      list.push(created);
      localStorage.setItem('pos_users', JSON.stringify(list));
      return created;
    } catch (e) {
      const list = await userService.getUsers();
      const newUser = {
        Id: `user_${Date.now()}`,
        ...userData,
        Status: 'Active',
        LastLogin: 'Never'
      };
      list.push(newUser);
      localStorage.setItem('pos_users', JSON.stringify(list));
      return newUser;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const updated = await apiClient.put(`/api/users/${userId}`, userData);
      const list = await userService.getUsers();
      const idx = list.findIndex(u => u.Id === userId);
      if (idx !== -1) {
        list[idx] = updated;
        localStorage.setItem('pos_users', JSON.stringify(list));
      }
      return updated;
    } catch (e) {
      const list = await userService.getUsers();
      const idx = list.findIndex(u => u.Id === userId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...userData };
        localStorage.setItem('pos_users', JSON.stringify(list));
        return list[idx];
      }
      throw new Error('User not found');
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const updated = await apiClient.put(`/api/users/${userId}/role`, { role });
      const list = await userService.getUsers();
      const idx = list.findIndex(u => u.Id === userId);
      if (idx !== -1) {
        list[idx] = updated;
        localStorage.setItem('pos_users', JSON.stringify(list));
      }
      return updated;
    } catch (e) {
      const list = await userService.getUsers();
      const idx = list.findIndex(u => u.Id === userId);
      if (idx !== -1) {
        list[idx].Role = role;
        localStorage.setItem('pos_users', JSON.stringify(list));
        return list[idx];
      }
      throw new Error('User not found');
    }
  },

  deleteUser: async (userId) => {
    try {
      await apiClient.delete(`/api/users/${userId}`);
    } catch (e) {}
    const list = await userService.getUsers();
    const updated = list.filter(u => u.Id !== userId);
    localStorage.setItem('pos_users', JSON.stringify(updated));
    return true;
  },

  getPermissionsMatrix: async () => {
    try {
      const data = await apiClient.get('/api/users/permissions-matrix');
      if (Array.isArray(data) && data.length > 0) {
        const parsed = data.map(row => ({
          module: row.module || row.Module,
          admin: typeof row.admin === 'string' ? JSON.parse(row.admin) : (row.admin || { view: true, create: true, edit: true, delete: true, export: true }),
          cashier: typeof row.cashier === 'string' ? JSON.parse(row.cashier) : (row.cashier || { view: false, create: false, edit: false, delete: false, export: false }),
          inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory) : (row.inventory || { view: false, create: false, edit: false, delete: false, export: false })
        }));
        localStorage.setItem('pos_permissions_matrix', JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) {
      console.warn('Fallback permissions matrix:', e.message);
    }
    const local = localStorage.getItem('pos_permissions_matrix');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_PERMISSIONS_MATRIX;
  },

  savePermissionsMatrix: async (matrix) => {
    try {
      await apiClient.post('/api/users/permissions-matrix/bulk', matrix);
    } catch (e) {
      console.warn('Fallback saving permissions matrix:', e.message);
    }
    localStorage.setItem('pos_permissions_matrix', JSON.stringify(matrix));
    return true;
  },

  updatePermission: async (moduleIndex, roleKey, actionKey, value) => {
    try {
      await apiClient.put('/api/users/permissions-matrix', { moduleIndex, roleKey, actionKey, value });
    } catch (e) {}
    const matrix = await userService.getPermissionsMatrix();
    if (matrix[moduleIndex] && matrix[moduleIndex][roleKey]) {
      matrix[moduleIndex][roleKey][actionKey] = value;
      localStorage.setItem('pos_permissions_matrix', JSON.stringify(matrix));
    }
    return matrix;
  }
};

export default userService;
