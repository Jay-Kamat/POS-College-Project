import apiClient from './apiClient';

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

const normalizeReturn = (ret) => {
  if (!ret) return ret;
  let items = ret.Items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  return {
    ...ret,
    TotalReturnAmount: parseFloat(ret.TotalReturnAmount || ret.TotalAmount || 0),
    Items: Array.isArray(items) ? items : []
  };
};

const getStoredReturns = () => {
  const local = localStorage.getItem('pos_material_returns');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed.map(normalizeReturn);
    } catch (e) {}
  }
  localStorage.setItem('pos_material_returns', JSON.stringify(INITIAL_RETURNS));
  return INITIAL_RETURNS;
};

const saveStoredReturns = (returns) => {
  localStorage.setItem('pos_material_returns', JSON.stringify(returns));
};

export const returnService = {
  getReturnReasons: async () => {
    try {
      const data = await apiClient.get('/api/material-returns/reasons');
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('Fallback return reasons:', e.message);
    }
    return INITIAL_RETURN_REASONS;
  },

  getReturnStats: async () => {
    try {
      const res = await apiClient.get('/api/material-returns/stats');
      if (res && res.data) return res.data;
      if (res && res.TotalReturns !== undefined) return res;
    } catch (e) {
      console.warn('Fallback getReturnStats:', e.message);
    }
    const returns = getStoredReturns().filter(r => r.RecordStatus === 0);
    return {
      TotalReturns: returns.length,
      TotalReturnValue: returns.reduce((sum, r) => sum + (parseFloat(r.TotalReturnAmount) || 0), 0),
      PendingCreditNotes: returns.filter(r => r.Status === 'Credit Note Pending').length,
      ExpiredReturns: returns.filter(r => (r.ReturnReason || '').toLowerCase().includes('expired')).length
    };
  },

  getReturns: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.reasonId && filters.reasonId !== 'All') params.append('reasonId', filters.reasonId);
      if (filters.vendorId && filters.vendorId !== 'All') params.append('vendorId', filters.vendorId);
      if (filters.search) params.append('search', filters.search);
      const data = await apiClient.get(`/api/material-returns?${params.toString()}`);
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeReturn);
        saveStoredReturns(normalized);
        return normalized;
      }
    } catch (e) {
      console.warn('Fallback returns:', e.message);
    }
    let list = getStoredReturns().filter(r => r.RecordStatus === 0);
    if (filters.reasonId && filters.reasonId !== 'All') {
      list = list.filter(r => r.MaterialReturnId === filters.reasonId);
    }
    if (filters.vendorId && filters.vendorId !== 'All') {
      list = list.filter(r => r.VendorId === filters.vendorId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(r =>
        (r.DocumentNumber && r.DocumentNumber.toLowerCase().includes(q)) ||
        (r.VendorName && r.VendorName.toLowerCase().includes(q)) ||
        (r.ReturnReason && r.ReturnReason.toLowerCase().includes(q))
      );
    }
    return list;
  },

  // Alias for backward compatibility
  getReturnNotes: async (filters) => {
    return returnService.getReturns(filters);
  },

  getReturnById: async (id) => {
    try {
      const data = await apiClient.get(`/api/material-returns/${id}`);
      if (data) return normalizeReturn(data);
    } catch (e) {
      console.warn('Fallback getReturnById:', e.message);
    }
    const list = getStoredReturns();
    return list.find(r => r.Id === id || r.DocumentNumber === id) || null;
  },

  createReturn: async (returnData) => {
    try {
      const created = await apiClient.post('/api/material-returns', returnData);
      const normalized = normalizeReturn({
        ...returnData,
        ...created,
        Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : returnData.Items
      });
      const list = getStoredReturns();
      list.unshift(normalized);
      saveStoredReturns(list);
      return normalized;
    } catch (e) {
      console.warn('Fallback createReturn local:', e.message);
      const list = getStoredReturns();
      const reasons = INITIAL_RETURN_REASONS;
      const reasonObj = reasons.find(r => r.Id === returnData.MaterialReturnId);
      const docNum = `MRN-2026-${String(list.length + 14).padStart(5, '0')}`;

      const newReturn = {
        Id: `mrn_${Date.now()}`,
        DocumentNumber: docNum,
        Date: new Date().toISOString(),
        ...returnData,
        ReturnReason: reasonObj ? reasonObj.Name : (returnData.ReturnReason || 'Expired Goods'),
        Status: 'Credit Note Pending',
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString()
      };

      list.unshift(newReturn);
      saveStoredReturns(list);
      return newReturn;
    }
  },

  // Alias for backward compatibility
  createReturnNote: async (returnData) => {
    return returnService.createReturn(returnData);
  },

  updateReturnStatus: async (id, status) => {
    try {
      const updated = await apiClient.put(`/api/material-returns/${id}/status`, { status });
      const normalized = normalizeReturn(updated);
      const list = getStoredReturns();
      const idx = list.findIndex(r => r.Id === id || r.DocumentNumber === id);
      if (idx !== -1) {
        list[idx] = normalized;
        saveStoredReturns(list);
      }
      return normalized;
    } catch (e) {
      console.warn('Fallback local updateReturnStatus:', e.message);
      const list = getStoredReturns();
      const idx = list.findIndex(r => r.Id === id || r.DocumentNumber === id);
      if (idx !== -1) {
        list[idx].Status = status;
        list[idx].Updated = new Date().toISOString();
        saveStoredReturns(list);
        return list[idx];
      }
      throw new Error('Return note not found');
    }
  }
};

export default returnService;
