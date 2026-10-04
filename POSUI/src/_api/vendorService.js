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
  getVendors: async () => {
    return getStoredVendors().filter(v => v.RecordStatus === 0);
  },

  createVendor: async (vendorData) => {
    const list = getStoredVendors();
    const newVendor = {
      Id: `vnd_${Date.now()}`,
      VendorCode: `VND-${Math.floor(100 + Math.random() * 900)}`,
      ...vendorData,
      RecordStatus: 0,
      Created: new Date().toISOString(),
      Updated: new Date().toISOString()
    };
    list.unshift(newVendor);
    saveStoredVendors(list);
    return newVendor;
  }
};

export default vendorService;
