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
  getCustomers: async (search = '') => {
    const list = getStoredCustomers().filter(c => c.RecordStatus === 0);
    if (!search) return list;
    const lower = search.toLowerCase();
    return list.filter(c => 
      c.Name.toLowerCase().includes(lower) || 
      c.MobileNumber.includes(search)
    );
  },

  getCustomerByMobile: async (mobile) => {
    const list = getStoredCustomers();
    return list.find(c => c.MobileNumber === mobile && c.RecordStatus === 0) || null;
  },

  createCustomer: async (customerData) => {
    const list = getStoredCustomers();
    const newCustomer = {
      Id: `cust_${Date.now()}`,
      Name: customerData.Name,
      MobileNumber: customerData.MobileNumber,
      GstNumber: customerData.GstNumber || '',
      State: customerData.State || 'Maharashtra',
      Country: 'India',
      TotalVisits: 1,
      TotalSpend: 0,
      RecordStatus: 0,
      Created: new Date().toISOString(),
      Updated: new Date().toISOString()
    };
    list.unshift(newCustomer);
    saveStoredCustomers(list);
    return newCustomer;
  }
};

export default customerService;
