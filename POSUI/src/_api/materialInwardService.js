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

// Helper to generate unique serial barcode & QR payload for every individual unit/packet
export function generateUnitBarcodesForItem(item, inwardId = '', itemIdx = 0) {
  const baseBarcode = item.Barcode || item.ProductNumber || `200100${String(Date.now()).slice(-4)}${String(itemIdx + 1).padStart(2, '0')}`;
  const qty = Math.max(1, Math.round(Number(item.ReceivedQty || item.Quantity || 1)));
  const padLen = qty >= 100 ? 3 : 2;
  const unitBarcodes = [];

  for (let i = 1; i <= qty; i++) {
    const serialSuffix = String(i).padStart(padLen, '0');
    const unitSerial = `${baseBarcode}-${serialSuffix}`;
    const qrPayload = JSON.stringify({
      barcode: baseBarcode,
      serial: unitSerial,
      id: item.ProductId,
      name: item.ProductName,
      unit: `${i}/${qty}`,
      exp: item.ExpiryDate || '',
      mrp: Number((Number(item.Rate || item.Cost || 0) * 1.3).toFixed(2)),
      inw: inwardId || `inw_${Date.now()}`
    });

    unitBarcodes.push({
      UnitIndex: i,
      TotalUnits: qty,
      Serial: unitSerial,
      Barcode: baseBarcode,
      QrPayload: qrPayload,
      ProductName: item.ProductName,
      ProductId: item.ProductId,
      ExpiryDate: item.ExpiryDate || '',
      Rate: Number(item.Rate || item.Cost || 0),
      Mrp: Number((Number(item.Rate || item.Cost || 0) * 1.3).toFixed(2)),
      Unit: item.Unit || 'PCS',
      InwardId: inwardId
    });
  }

  return {
    ...item,
    Barcode: baseBarcode,
    UnitBarcodes: unitBarcodes
  };
}

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
  const itemsArr = Array.isArray(items) ? items : [];

  const normalizedItems = itemsArr.map((item, idx) => {
    if (Array.isArray(item.UnitBarcodes) && item.UnitBarcodes.length > 0) {
      return item;
    }
    return generateUnitBarcodesForItem(item, inward.Id, idx);
  });

  return {
    ...inward,
    Items: normalizedItems
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
    const tempInwardId = `inw_${Date.now()}`;
    // Ensure all items have base barcodes AND unit-level barcodes
    const itemsWithUnits = (inwardData.Items || []).map((item, idx) =>
      generateUnitBarcodesForItem(item, tempInwardId, idx)
    );

    const payload = {
      ...inwardData,
      Items: itemsWithUnits
    };

    try {
      const created = await apiClient.post('/api/material-inward', payload);
      const normalized = normalizeInward({
        ...payload,
        ...created,
        Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : itemsWithUnits
      });
      const list = getStoredInwards();
      list.unshift(normalized);
      saveStoredInwards(list);

      // Sync local storage PO status to Received
      if (inwardData.PurchaseOrderId) {
        try {
          const localPos = localStorage.getItem('pos_purchase_orders');
          if (localPos) {
            const parsed = JSON.parse(localPos);
            const idx = parsed.findIndex(p => p.Id === inwardData.PurchaseOrderId || p.DocumentNumber === inwardData.PurchaseOrderId);
            if (idx !== -1) {
              parsed[idx].Status = 'Received';
              parsed[idx].Updated = new Date().toISOString();
              localStorage.setItem('pos_purchase_orders', JSON.stringify(parsed));
            }
          }
        } catch (e) {}
      }

      return normalized;
    } catch (e) {
      if (e.message && e.message.includes('Only \'Sent\' purchase orders')) {
        throw e;
      }
      console.warn('Fallback local createInward:', e.message);

      // Validate PO status in local storage
      if (inwardData.PurchaseOrderId) {
        try {
          const localPos = localStorage.getItem('pos_purchase_orders');
          if (localPos) {
            const parsed = JSON.parse(localPos);
            const foundPo = parsed.find(p => p.Id === inwardData.PurchaseOrderId || p.DocumentNumber === inwardData.PurchaseOrderId);
            if (foundPo && (foundPo.Status || '').toLowerCase() !== 'sent') {
              throw new Error(`Cannot inward Purchase Order with status '${foundPo.Status}'. Only 'Sent' purchase orders can be received.`);
            }
          }
        } catch (valErr) {
          if (valErr.message.includes('Only \'Sent\' purchase orders')) throw valErr;
        }
      }

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

      // Also update local storage PO status in fallback mode
      if (inwardData.PurchaseOrderId) {
        try {
          const localPos = localStorage.getItem('pos_purchase_orders');
          if (localPos) {
            const parsed = JSON.parse(localPos);
            const idx = parsed.findIndex(p => p.Id === inwardData.PurchaseOrderId || p.DocumentNumber === inwardData.PurchaseOrderId);
            if (idx !== -1) {
              parsed[idx].Status = 'Received';
              parsed[idx].Updated = new Date().toISOString();
              localStorage.setItem('pos_purchase_orders', JSON.stringify(parsed));
            }
          }
        } catch (e) {}
      }

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
