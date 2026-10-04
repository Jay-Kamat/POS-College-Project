import apiClient from './apiClient';

// Vendors Service Layer
const INITIAL_VENDORS = [
  {
    Id: 'vnd_01',
    VendorCode: 'VND-101',
    Name: 'Fresh Dairy Co-operative Ltd',
    Address: 'Sector 4, MIDC Industrial Area',
    City: 'Pune',
    Pin: '411001',
    Email: 'orders@freshdairy.com',
    MobileNumber: '+91 98220 12345',
    Note: 'Net 15 days payment terms',
    RecordStatus: 0
  },
  {
    Id: 'vnd_02',
    VendorCode: 'VND-102',
    Name: 'Golden Crust Bakers LLP',
    Address: 'Plot 88, Andheri West',
    City: 'Mumbai',
    Pin: '400053',
    Email: 'dispatch@goldencrust.in',
    MobileNumber: '+91 98210 98765',
    Note: 'Daily morning delivery by 7 AM',
    RecordStatus: 0
  },
  {
    Id: 'vnd_03',
    VendorCode: 'VND-103',
    Name: 'Royal Agro Commodities Pvt Ltd',
    Address: 'Grain Market Yard',
    City: 'Nagpur',
    Pin: '440008',
    Email: 'sales@royalagro.com',
    MobileNumber: '+91 98230 45678',
    Note: 'Bulk staples supplier',
    RecordStatus: 0
  }
];

const getStoredVendors = () => {
  const local = localStorage.getItem('pos_vendors');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_vendors', JSON.stringify(INITIAL_VENDORS));
  return INITIAL_VENDORS;
};

const saveStoredVendors = (vendors) => {
  localStorage.setItem('pos_vendors', JSON.stringify(vendors));
};

export const vendorService = {
  getVendors: async (searchTerm = '') => {
    try {
      const data = await apiClient.get(`/api/vendors${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      if (Array.isArray(data)) {
        saveStoredVendors(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local vendors:', e.message);
    }

    let list = getStoredVendors().filter(v => v.RecordStatus === 0);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(v => 
        v.Name.toLowerCase().includes(term) || 
        v.VendorCode.toLowerCase().includes(term) ||
        v.City.toLowerCase().includes(term)
      );
    }
    return list;
  },

  createVendor: async (vendorData) => {
    try {
      const created = await apiClient.post('/api/vendors', vendorData);
      const list = getStoredVendors();
      list.unshift(created);
      saveStoredVendors(list);
      return created;
    } catch (e) {
      const list = getStoredVendors();
      const newVendor = {
        Id: `vnd_${Date.now()}`,
        VendorCode: vendorData.VendorCode || `VND-${100 + list.length + 1}`,
        ...vendorData,
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString()
      };
      list.unshift(newVendor);
      saveStoredVendors(list);
      return newVendor;
    }
  },

  updateVendor: async (id, vendorData) => {
    try {
      const updated = await apiClient.put(`/api/vendors/${id}`, vendorData);
      const list = getStoredVendors();
      const index = list.findIndex(v => v.Id === id);
      if (index !== -1) {
        list[index] = updated;
        saveStoredVendors(list);
      }
      return updated;
    } catch (e) {
      const list = getStoredVendors();
      const index = list.findIndex(v => v.Id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...vendorData, Updated: new Date().toISOString() };
        saveStoredVendors(list);
        return list[index];
      }
      throw new Error('Vendor not found');
    }
  },

  deleteVendor: async (id) => {
    try {
      await apiClient.delete(`/api/vendors/${id}`);
    } catch (e) {}
    const list = getStoredVendors();
    const item = list.find(v => v.Id === id);
    if (item) {
      item.RecordStatus = 1;
      saveStoredVendors(list);
      return true;
    }
    return false;
  }
};

export default vendorService;
