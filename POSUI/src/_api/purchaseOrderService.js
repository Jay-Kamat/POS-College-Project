import apiClient from './apiClient';

// Purchase Orders Service Layer
const INITIAL_POS = [
  {
    Id: 'po_01',
    DocumentNumber: 'PO-2026-00045',
    VendorId: 'vnd_01',
    VendorName: 'Fresh Dairy Co-operative Ltd',
    StoreId: 'store_mum_01',
    Date: new Date(Date.now() - 86400000 * 2).toISOString(),
    Status: 'Received',
    TotalAmount: 2600.00,
    Items: [
      { ProductId: 'prd_01', ProductName: 'Cow Milk 500ml', Quantity: 100, Rate: 26.00, DeliveryDate: '2026-10-04' }
    ],
    RecordStatus: 0
  },
  {
    Id: 'po_02',
    DocumentNumber: 'PO-2026-00046',
    VendorId: 'vnd_02',
    VendorName: 'Golden Crust Bakers LLP',
    StoreId: 'store_mum_01',
    Date: new Date(Date.now() - 86400000).toISOString(),
    Status: 'Partially Received',
    TotalAmount: 1800.00,
    Items: [
      { ProductId: 'prd_02', ProductName: 'Whole Wheat Bread 400g', Quantity: 50, Rate: 32.00, DeliveryDate: '2026-10-05' }
    ],
    RecordStatus: 0
  },
  {
    Id: 'po_03',
    DocumentNumber: 'PO-2026-00047',
    VendorId: 'vnd_03',
    VendorName: 'Royal Agro Commodities Pvt Ltd',
    StoreId: 'store_mum_01',
    Date: new Date().toISOString(),
    Status: 'Sent',
    TotalAmount: 9500.00,
    Items: [
      { ProductId: 'prd_04', ProductName: 'Royal Basmati Rice 1kg', Quantity: 100, Rate: 95.00, DeliveryDate: '2026-10-08' }
    ],
    RecordStatus: 0
  }
];

const getStoredPOs = () => {
  const local = localStorage.getItem('pos_purchase_orders');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_purchase_orders', JSON.stringify(INITIAL_POS));
  return INITIAL_POS;
};

const saveStoredPOs = (pos) => {
  localStorage.setItem('pos_purchase_orders', JSON.stringify(pos));
};

export const purchaseOrderService = {
  getPurchaseOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.vendorId) params.append('vendorId', filters.vendorId);
      const data = await apiClient.get(`/api/purchase-orders?${params.toString()}`);
      if (Array.isArray(data)) {
        saveStoredPOs(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local POs:', e.message);
    }

    let list = getStoredPOs().filter(p => p.RecordStatus === 0);
    if (filters.status && filters.status !== 'All') {
      list = list.filter(p => p.Status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.vendorId) {
      list = list.filter(p => p.VendorId === filters.vendorId);
    }
    return list;
  },

  createPurchaseOrder: async (poData) => {
    try {
      const created = await apiClient.post('/api/purchase-orders', poData);
      const list = getStoredPOs();
      list.unshift(created);
      saveStoredPOs(list);
      return created;
    } catch (e) {
      const list = getStoredPOs();
      const docNum = `PO-2026-${String(list.length + 46).padStart(5, '0')}`;
      const newPO = {
        Id: `po_${Date.now()}`,
        DocumentNumber: docNum,
        ...poData,
        Date: new Date().toISOString(),
        Status: 'Sent',
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString()
      };
      list.unshift(newPO);
      saveStoredPOs(list);
      return newPO;
    }
  },

  updatePurchaseOrderStatus: async (id, status) => {
    try {
      const updated = await apiClient.put(`/api/purchase-orders/${id}/status`, { status });
      const list = getStoredPOs();
      const index = list.findIndex(p => p.Id === id);
      if (index !== -1) {
        list[index] = updated;
        saveStoredPOs(list);
      }
      return updated;
    } catch (e) {
      const list = getStoredPOs();
      const index = list.findIndex(p => p.Id === id);
      if (index !== -1) {
        list[index].Status = status;
        list[index].Updated = new Date().toISOString();
        saveStoredPOs(list);
        return list[index];
      }
      throw new Error('Purchase order not found');
    }
  }
};

export default purchaseOrderService;
