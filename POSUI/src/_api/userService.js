// Users & RBAC Matrix Service Layer
const INITIAL_USERS = [
  {
    Id: 'user_01',
    Name: 'Jay Sharma',
    Email: 'admin@dailymart.in',
    Role: 'Admin',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-04, 07:45 PM'
  },
  {
    Id: 'user_02',
    Name: 'Pooja Nair',
    Email: 'cashier1@dailymart.in',
    Role: 'Cashier',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-04, 06:12 PM'
  },
  {
    Id: 'user_03',
    Name: 'Vikram Singh',
    Email: 'inventory@dailymart.in',
    Role: 'Inventory Manager',
    Store: 'DailyMart Express (Mumbai)',
    Status: 'Active',
    LastLogin: '2026-10-04, 05:30 PM'
  }
];

const INITIAL_PERMISSIONS_MATRIX = [
  { module: 'Dashboard', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'POS Billing Terminal', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Invoices & Receipts', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: false, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Product Catalog', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: true, export: true } },
  { module: 'Vendors Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Purchase Orders', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Material Inward & Barcoding', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Vendor Material Returns', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
  { module: 'Customer Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'Reports & Analytics', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: false, edit: false, delete: false, export: true } },
  { module: 'Settings & Tax Slabs', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
  { module: 'User Management & Roles', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
];

export const userService = {
  getUsers: async () => {
    const local = localStorage.getItem('pos_users');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_USERS;
  },

  inviteUser: async (userData) => {
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
  },

  getPermissionsMatrix: async () => {
    const local = localStorage.getItem('pos_permissions_matrix');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_PERMISSIONS_MATRIX;
  },

  savePermissionsMatrix: async (matrix) => {
    localStorage.setItem('pos_permissions_matrix', JSON.stringify(matrix));
    return matrix;
  }
};

export default userService;
