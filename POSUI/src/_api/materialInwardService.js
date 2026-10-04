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

const getStoredInwards = () => {
  const local = localStorage.getItem('pos_inwards');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_inwards', JSON.stringify(INITIAL_INWARDS));
  return INITIAL_INWARDS;
};

const saveStoredInwards = (inwards) => {
  localStorage.setItem('pos_inwards', JSON.stringify(inwards));
};

export const materialInwardService = {
  getInwards: async () => {
    try {
      const data = await apiClient.get('/api/material-inward');
      if (Array.isArray(data)) {
        saveStoredInwards(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local inwards:', e.message);
    }
    return getStoredInwards().filter(i => i.RecordStatus === 0);
  },

  createInward: async (inwardData) => {
    try {
      const created = await apiClient.post('/api/material-inward', inwardData);
      const list = getStoredInwards();
      list.unshift(created);
      saveStoredInwards(list);
      return created;
    } catch (e) {
      const list = getStoredInwards();
      const itemsWithBarcodes = inwardData.Items.map((item, idx) => {
        const generatedBarcode = item.Barcode || `200100${String(Date.now()).slice(-4)}${String(idx + 1).padStart(2, '0')}`;
        return {
          ...item,
          Barcode: generatedBarcode
        };
      });

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
