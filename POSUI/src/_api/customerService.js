import apiClient from './apiClient';

// Customer Directory Service Layer
const INITIAL_CUSTOMERS = [
  {
    Id: 'cust_01',
    Name: 'Jay Sharma',
    MobileNumber: '9876543210',
    GstNumber: '',
    State: 'Maharashtra',
    Country: 'India',
    TotalVisits: 14,
    TotalSpend: 4250.00,
    RecordStatus: 0
  },
  {
    Id: 'cust_02',
    Name: 'Priya Patel',
    MobileNumber: '9820011223',
    GstNumber: '27AABCZ1234P1ZR',
    State: 'Maharashtra',
    Country: 'India',
    TotalVisits: 6,
    TotalSpend: 8900.00,
    RecordStatus: 0
  },
  {
    Id: 'cust_03',
    Name: 'Rahul Verma',
    MobileNumber: '9819988776',
    GstNumber: '',
    State: 'Gujarat',
    Country: 'India',
    TotalVisits: 2,
    TotalSpend: 620.00,
    RecordStatus: 0
  }
];

const getStoredCustomers = () => {
  const local = localStorage.getItem('pos_customers');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_customers', JSON.stringify(INITIAL_CUSTOMERS));
  return INITIAL_CUSTOMERS;
};

const saveStoredCustomers = (customers) => {
  localStorage.setItem('pos_customers', JSON.stringify(customers));
};

export const customerService = {
  getCustomers: async (searchTerm = '') => {
    try {
      const data = await apiClient.get(`/api/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      if (Array.isArray(data)) {
        saveStoredCustomers(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local customers:', e.message);
    }

    let list = getStoredCustomers().filter(c => c.RecordStatus === 0);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.Name.toLowerCase().includes(term) || 
        c.MobileNumber.includes(term) ||
        (c.GstNumber && c.GstNumber.toLowerCase().includes(term))
      );
    }
    return list;
  },

  getCustomerByMobile: async (mobile) => {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    try {
      return await apiClient.get(`/api/customers/by-mobile/${cleanMobile}`);
    } catch (e) {
      const list = getStoredCustomers();
      return list.find(c => c.MobileNumber === cleanMobile && c.RecordStatus === 0) || null;
    }
  },

  createCustomer: async (customerData) => {
    try {
      const created = await apiClient.post('/api/customers', customerData);
      const list = getStoredCustomers();
      list.unshift(created);
      saveStoredCustomers(list);
      return created;
    } catch (e) {
      const list = getStoredCustomers();
      const newCustomer = {
        Id: `cust_${Date.now()}`,
        ...customerData,
        TotalVisits: 1,
        TotalSpend: 0.00,
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString()
      };
      list.unshift(newCustomer);
      saveStoredCustomers(list);
      return newCustomer;
    }
  },

  updateCustomer: async (id, customerData) => {
    try {
      const updated = await apiClient.put(`/api/customers/${id}`, customerData);
      const list = getStoredCustomers();
      const index = list.findIndex(c => c.Id === id);
      if (index !== -1) {
        list[index] = updated;
        saveStoredCustomers(list);
      }
      return updated;
    } catch (e) {
      const list = getStoredCustomers();
      const index = list.findIndex(c => c.Id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...customerData, Updated: new Date().toISOString() };
        saveStoredCustomers(list);
        return list[index];
      }
      throw new Error('Customer not found');
    }
  },

  deleteCustomer: async (id) => {
    try {
      await apiClient.delete(`/api/customers/${id}`);
    } catch (e) {}
    const list = getStoredCustomers();
    const item = list.find(c => c.Id === id);
    if (item) {
      item.RecordStatus = 1;
      saveStoredCustomers(list);
      return true;
    }
    return false;
  }
};

export default customerService;
