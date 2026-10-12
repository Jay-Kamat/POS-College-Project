import apiClient from './apiClient';

// Settings, Store Profile & Tax Rates Service Layer
const INITIAL_TAX_RATES = [
  { Id: 'tax_0', Name: 'GST 0% (Exempt)', IGST: 0.0, CGST: 0.0, SGST: 0.0, RecordStatus: 0 },
  { Id: 'tax_5', Name: 'GST 5% Standard', IGST: 5.0, CGST: 2.5, SGST: 2.5, RecordStatus: 0 },
  { Id: 'tax_12', Name: 'GST 12% Standard', IGST: 12.0, CGST: 6.0, SGST: 6.0, RecordStatus: 0 },
  { Id: 'tax_18', Name: 'GST 18% Standard', IGST: 18.0, CGST: 9.0, SGST: 9.0, RecordStatus: 0 },
  { Id: 'tax_28', Name: 'GST 28% Luxury', IGST: 28.0, CGST: 14.0, SGST: 14.0, RecordStatus: 0 },
];

export const INITIAL_STORES = [
  {
    Id: 'store_mum_01',
    Name: 'DailyMart Express (Mumbai)',
    LongName: 'DailyMart Retail Private Limited - Mumbai Central',
    Address: 'Plot 12, Commercial Hub, MG Road, Mumbai',
    MobileNumber: '+91 98765 43210',
    PhoneNumber: '022-28765432',
    Email: 'mumbai01@dailymart.in',
    FoodLicenseNumber: '11522001000123',
    GstNumber: '27AABCU9603R1ZM',
    Country: 'India',
    State: 'Maharashtra',
    InvoicePrefix: 'INV-MUM',
    ReceiptFooterText: 'Thank you for shopping at DailyMart Mumbai! No exchange after 7 days.',
    PaperSize: '80mm',
    EnableWhatsAppReceipt: true
  },
  {
    Id: 'store_pune_02',
    Name: 'DailyMart Supercenter (Pune)',
    LongName: 'DailyMart Retail Private Limited - Pune West',
    Address: 'High Street Phoenix, Senapati Bapat Road, Pune',
    MobileNumber: '+91 98230 11223',
    PhoneNumber: '020-25678901',
    Email: 'pune02@dailymart.in',
    FoodLicenseNumber: '11522001000124',
    GstNumber: '27AABCU9603R1ZN',
    Country: 'India',
    State: 'Maharashtra',
    InvoicePrefix: 'INV-PUN',
    ReceiptFooterText: 'Thank you for shopping at DailyMart Pune! Save paper, get bills on WhatsApp.',
    PaperSize: '80mm',
    EnableWhatsAppReceipt: true
  },
  {
    Id: 'store_blr_03',
    Name: 'DailyMart Metro (Bangalore)',
    LongName: 'DailyMart Retail Private Limited - Bengaluru Urban',
    Address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru',
    MobileNumber: '+91 97401 55667',
    PhoneNumber: '080-41234567',
    Email: 'bangalore03@dailymart.in',
    FoodLicenseNumber: '11522001000125',
    GstNumber: '29AABCU9603R1ZO',
    Country: 'India',
    State: 'Karnataka',
    InvoicePrefix: 'INV-BLR',
    ReceiptFooterText: 'Thank you for shopping at DailyMart Bangalore! Follow us on Instagram @DailyMartIN',
    PaperSize: '80mm',
    EnableWhatsAppReceipt: true
  }
];

export const INITIAL_STORE_PROFILE = INITIAL_STORES[0];

export const settingService = {
  getStores: async () => {
    try {
      const data = await apiClient.get('/api/stores');
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem('pos_stores', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Fallback stores:', e.message);
    }
    const local = localStorage.getItem('pos_stores');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_STORES;
  },

  getStoreProfile: async (storeId = null) => {
    try {
      const url = storeId ? `/api/settings/store-profile?storeId=${encodeURIComponent(storeId)}` : '/api/settings/store-profile';
      const data = await apiClient.get(url);
      if (data && data.Name) return data;
    } catch (e) {
      console.warn('Fallback store profile:', e.message);
    }

    if (storeId) {
      const stores = await settingService.getStores();
      const found = stores.find(s => s.Id === storeId || s.id === storeId);
      if (found) return found;
    }

    const local = localStorage.getItem('pos_store_profile');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_STORE_PROFILE;
  },

  updateStoreProfile: async (data) => {
    try {
      const updated = await apiClient.put('/api/settings/store-profile', data);
      localStorage.setItem('pos_store_profile', JSON.stringify(updated));
      // Also update in cached stores list
      const stores = await settingService.getStores();
      const idx = stores.findIndex(s => s.Id === updated.Id || s.id === updated.Id);
      if (idx !== -1) {
        stores[idx] = updated;
        localStorage.setItem('pos_stores', JSON.stringify(stores));
      }
      return updated;
    } catch (e) {
      localStorage.setItem('pos_store_profile', JSON.stringify(data));
      const stores = await settingService.getStores();
      const idx = stores.findIndex(s => s.Id === data.Id || s.id === data.Id);
      if (idx !== -1) {
        stores[idx] = { ...stores[idx], ...data };
        localStorage.setItem('pos_stores', JSON.stringify(stores));
      }
      return data;
    }
  },

  createStore: async (storeData) => {
    try {
      const created = await apiClient.post('/api/stores', storeData);
      const stores = await settingService.getStores();
      stores.push(created);
      localStorage.setItem('pos_stores', JSON.stringify(stores));
      return created;
    } catch (e) {
      const stores = await settingService.getStores();
      const newStore = {
        Id: `store_${Date.now()}`,
        ...storeData,
        RecordStatus: 0
      };
      stores.push(newStore);
      localStorage.setItem('pos_stores', JSON.stringify(stores));
      return newStore;
    }
  },

  getTaxRates: async () => {
    try {
      const data = await apiClient.get('/api/tax-rates');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('Fallback tax rates:', e.message);
    }
    const local = localStorage.getItem('pos_tax_rates');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_TAX_RATES;
  },

  addTaxRate: async (taxData) => {
    try {
      return await apiClient.post('/api/tax-rates', taxData);
    } catch (e) {
      const local = await settingService.getTaxRates();
      const newRate = {
        Id: `tax_${Date.now()}`,
        ...taxData,
        RecordStatus: 0
      };
      local.push(newRate);
      localStorage.setItem('pos_tax_rates', JSON.stringify(local));
      return newRate;
    }
  }
};

export default settingService;
