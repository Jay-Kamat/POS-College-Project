// Vendor Material Returns Service Layer
const INITIAL_RETURN_REASONS = [
  { Id: 'ret_01', Name: 'Expired Goods' },
  { Id: 'ret_02', Name: 'Damaged Packaging / Seal Broken' },
  { Id: 'ret_03', Name: 'Quality Defect / Discoloration' },
  { Id: 'ret_04', Name: 'Excess Delivery Beyond PO' },
  { Id: 'ret_05', Name: 'Short Shelf-Life Delivered' },
];

const INITIAL_RETURNS = [
  {
    Id: 'mrn_01',
    DocumentNumber: 'MRN-2026-00012',
    Date: new Date(Date.now() - 86400000 * 3).toISOString(),
    VendorId: 'vnd_01',
    VendorName: 'Fresh Dairy Co-operative Ltd',
    StoreId: 'store_mum_01',
    MaterialReturnId: 'ret_01',
    ReturnReason: 'Expired Goods',
    TotalReturnAmount: 780.00,
    Status: 'Dispatched to Supplier',
    Items: [
      { ProductId: 'prd_01', ProductName: 'Cow Milk 500ml', BatchBarcode: '200100101001', Quantity: 30, Rate: 26.00, Total: 780.00 }
    ],
    RecordStatus: 0
  },
  {
    Id: 'mrn_02',
    DocumentNumber: 'MRN-2026-00013',
    Date: new Date(Date.now() - 86400000).toISOString(),
    VendorId: 'vnd_02',
    VendorName: 'Golden Crust Bakers LLP',
    StoreId: 'store_mum_01',
    MaterialReturnId: 'ret_02',
    ReturnReason: 'Damaged Packaging / Seal Broken',
    TotalReturnAmount: 480.00,
    Status: 'Credit Note Pending',
    Items: [
      { ProductId: 'prd_02', ProductName: 'Whole Wheat Bread 400g', BatchBarcode: '200100102002', Quantity: 15, Rate: 32.00, Total: 480.00 }
    ],
    RecordStatus: 0
  }
];

const getStoredReturns = () => {
  const local = localStorage.getItem('pos_material_returns');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_material_returns', JSON.stringify(INITIAL_RETURNS));
  return INITIAL_RETURNS;
};

const saveStoredReturns = (returns) => {
  localStorage.setItem('pos_material_returns', JSON.stringify(returns));
};

export const returnService = {
  getReturnReasons: async () => {
    return INITIAL_RETURN_REASONS;
  },

  getReturnNotes: async () => {
    return getStoredReturns().filter(r => r.RecordStatus === 0);
  },

  createReturnNote: async (returnData) => {
    const list = getStoredReturns();
    const newNote = {
      Id: `mrn_${Date.now()}`,
      DocumentNumber: `MRN-2026-${String(list.length + 14).padStart(5, '0')}`,
      ...returnData,
      Date: new Date().toISOString(),
      Status: 'Dispatched to Supplier',
      RecordStatus: 0,
      Created: new Date().toISOString(),
      Updated: new Date().toISOString()
    };
    list.unshift(newNote);
    saveStoredReturns(list);
    return newNote;
  }
};

export default returnService;
