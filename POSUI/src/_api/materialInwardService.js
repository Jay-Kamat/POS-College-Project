import apiClient from './apiClient';

// Material Inward & Barcode Service Layer
const INITIAL_INWARDS = [
  {
    Id: 'inw_01',
    PurchaseOrderId: 'po_01',
    VendorId: 'vnd_01',
    VendorName: 'Fresh Dairy Co-operative Ltd',
    Date: new Date().toISOString(),
    IsPoAvailable: true,
    Items: [
      {
        ProductId: 'prd_01',
        ProductName: 'Cow Milk 500ml',
        OrderedQty: 100,
        ReceivedQty: 100,
        Rate: 26.00,
        ExpiryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        Barcode: '200100101001'
      }
    ],
    RecordStatus: 0
  }
];

const normalizeInward = (inward) => {
  if (!inward) return inward;
  let items = inward.Items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  return {
    ...inward,
    Items: Array.isArray(items) ? items : []
  };
};

const getStoredInwards = () => {
  const local = localStorage.getItem('pos_inwards');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed.map(normalizeInward);
    } catch (e) {}
  }
  localStorage.setItem('pos_inwards', JSON.stringify(INITIAL_INWARDS));
  return INITIAL_INWARDS;
};

const saveStoredInwards = (inwards) => {
  localStorage.setItem('pos_inwards', JSON.stringify(inwards));
};

export const materialInwardService = {
  getInwardStats: async () => {
    try {
      const data = await apiClient.get('/api/material-inward/stats');
      if (data) return data;
    } catch (e) {
      console.warn('Fallback getInwardStats:', e.message);
    }
    const inwards = getStoredInwards().filter(i => i.RecordStatus === 0);
    return {
      TotalInwards: inwards.length,
      TodayInwards: inwards.filter(i => new Date(i.Date).toDateString() === new Date().toDateString()).length,
      ActiveVendors: new Set(inwards.map(i => i.VendorId)).size,
      PoInwards: inwards.filter(i => i.IsPoAvailable).length
    };
  },

  getInwards: async () => {
    try {
      const data = await apiClient.get('/api/material-inward');
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeInward);
        saveStoredInwards(normalized);
        return normalized;
      }
    } catch (e) {
      console.warn('Fallback to local inwards:', e.message);
    }
    return getStoredInwards().filter(i => i.RecordStatus === 0).map(normalizeInward);
  },

  getInwardById: async (id) => {
    try {
      const data = await apiClient.get(`/api/material-inward/${id}`);
      if (data) return normalizeInward(data);
    } catch (e) {
      console.warn('Fallback getInwardById:', e.message);
    }
    const list = getStoredInwards();
    return list.find(i => i.Id === id) || null;
  },

  createInward: async (inwardData) => {
    // Ensure all items have barcodes
    const itemsWithBarcodes = (inwardData.Items || []).map((item, idx) => {
      const generatedBarcode = item.Barcode || `200100${String(Date.now()).slice(-4)}${String(idx + 1).padStart(2, '0')}`;
      return {
        ...item,
        Barcode: generatedBarcode
      };
    });

    const payload = {
      ...inwardData,
      Items: itemsWithBarcodes
    };

    try {
      const created = await apiClient.post('/api/material-inward', payload);
      const normalized = normalizeInward({
        ...payload,
        ...created,
        Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : itemsWithBarcodes
      });
      const list = getStoredInwards();
      list.unshift(normalized);
      saveStoredInwards(list);
      return normalized;
    } catch (e) {
      console.warn('Fallback local createInward:', e.message);
      const newInward = {
        Id: `inw_${Date.now()}`,
        PurchaseOrderId: inwardData.PurchaseOrderId || null,
        VendorId: inwardData.VendorId,
        VendorName: inwardData.VendorName || 'Supplier',
        Date: new Date().toISOString(),
        IsPoAvailable: !!inwardData.IsPoAvailable,
        Items: itemsWithBarcodes,
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString()
      };
      const list = getStoredInwards();
      list.unshift(newInward);
      saveStoredInwards(list);
      return newInward;
    }
  },

  getBarcodesByInward: async (inwardId) => {
    const list = await materialInwardService.getInwards();
    const found = list.find(i => i.Id === inwardId);
    return found ? found.Items : [];
  }
};

export default materialInwardService;
