// Settings, Store Profile & Tax Rates Service Layer
const INITIAL_TAX_RATES = [
  { Id: 'tax_0', Name: 'GST 0% (Exempt)', IGST: 0.0, CGST: 0.0, SGST: 0.0, RecordStatus: 0 },
  { Id: 'tax_5', Name: 'GST 5% Standard', IGST: 5.0, CGST: 2.5, SGST: 2.5, RecordStatus: 0 },
  { Id: 'tax_12', Name: 'GST 12% Standard', IGST: 12.0, CGST: 6.0, SGST: 6.0, RecordStatus: 0 },
  { Id: 'tax_18', Name: 'GST 18% Standard', IGST: 18.0, CGST: 9.0, SGST: 9.0, RecordStatus: 0 },
  { Id: 'tax_28', Name: 'GST 28% Luxury', IGST: 28.0, CGST: 14.0, SGST: 14.0, RecordStatus: 0 },
];

const INITIAL_STORE_PROFILE = {
  Id: 'store_mum_01',
  Name: 'DailyMart Express',
  LongName: 'DailyMart Retail Private Limited',
  Address: 'Plot 12, Commercial Hub, MG Road, Mumbai',
  MobileNumber: '+91 98765 43210',
  PhoneNumber: '022-28765432',
  Email: 'mumbai01@dailymart.in',
  FoodLicenseNumber: '11522001000123',
  GstNumber: '27AABCU9603R1ZM',
  Country: 'India',
  State: 'Maharashtra',
  InvoicePrefix: 'INV',
  ReceiptFooterText: 'Thank you for shopping with us! No exchange after 7 days.',
  PaperSize: '80mm',
  EnableWhatsAppReceipt: true
};

export const settingService = {
  getStoreProfile: async () => {
    const local = localStorage.getItem('pos_store_profile');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_STORE_PROFILE;
  },

  updateStoreProfile: async (data) => {
    localStorage.setItem('pos_store_profile', JSON.stringify(data));
    return data;
  },

  getTaxRates: async () => {
    const local = localStorage.getItem('pos_tax_rates');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return INITIAL_TAX_RATES;
  },

  addTaxRate: async (taxData) => {
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
};

export default settingService;
