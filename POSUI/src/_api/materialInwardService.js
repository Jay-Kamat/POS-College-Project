import apiClient from './apiClient';

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

export const materialInwardService = {
  getInwardStats: async () => {
    return await apiClient.get('/api/material-inward/stats');
  },

  getInwards: async (page = 1, pageSize = 50) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (pageSize) params.append('pageSize', pageSize);

    const data = await apiClient.get(`/api/material-inward?${params.toString()}`);
    const list = Array.isArray(data) ? data : (data?.data || []);
    return list.map(normalizeInward);
  },

  getInwardById: async (id) => {
    const data = await apiClient.get(`/api/material-inward/${id}`);
    return normalizeInward(data);
  },

  createInward: async (inwardData) => {
    const tempInwardId = `inw_${Date.now()}`;
    const itemsWithUnits = (inwardData.Items || []).map((item, idx) =>
      generateUnitBarcodesForItem(item, tempInwardId, idx)
    );

    const payload = {
      ...inwardData,
      Items: itemsWithUnits
    };

    const created = await apiClient.post('/api/material-inward', payload);
    return normalizeInward({
      ...payload,
      ...created,
      Items: created.Items ? (typeof created.Items === 'string' ? JSON.parse(created.Items) : created.Items) : itemsWithUnits
    });
  },

  getBarcodesByInward: async (inwardId) => {
    const found = await materialInwardService.getInwardById(inwardId);
    return found ? found.Items : [];
  }
};

export default materialInwardService;
