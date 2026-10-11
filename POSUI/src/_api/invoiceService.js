import apiClient from './apiClient';

// Invoice Service Layer (Atomic sequence, GST calculation, Soft cancellation)
const INITIAL_INVOICES = [
  {
    Id: 'inv_101',
    DocumentNumber: 'INV-2627-000101',
    Date: new Date(Date.now() - 3600000 * 4).toISOString(),
    CustomerId: 'cust_01',
    CustomerName: 'Jay Sharma',
    MobileNumber: '9876543210',
    StoreId: 'store_mum_01',
    StoreName: 'DailyMart Express',
    Amount: 155.00,
    Subtotal: 145.00,
    Cgst: 4.88,
    Sgst: 4.88,
    Igst: 0.00,
    RoundOff: 0.24,
    ModeOfPayment: 1, // UPI
    IsPaymentReceived: true,
    IsShareReceiptThroughSms: true,
    RecordStatus: 0,
    Items: [
      { ProductId: 'prd_01', ProductName: 'Cow Milk 500ml', Quantity: 2, Rate: 30.00, Cgst: 1.50, Sgst: 1.50, Total: 63.00 },
      { ProductId: 'prd_03', ProductName: 'Cold Coffee 200ml', Quantity: 2, Rate: 45.00, Cgst: 4.05, Sgst: 4.05, Total: 98.10 }
    ]
  },
  {
    Id: 'inv_102',
    DocumentNumber: 'INV-2627-000102',
    Date: new Date(Date.now() - 3600000 * 2).toISOString(),
    CustomerId: 'cust_02',
    CustomerName: 'Priya Patel',
    MobileNumber: '9820011223',
    StoreId: 'store_mum_01',
    StoreName: 'DailyMart Express',
    Amount: 413.00,
    Subtotal: 350.00,
    Cgst: 31.50,
    Sgst: 31.50,
    Igst: 0.00,
    RoundOff: 0.00,
    ModeOfPayment: 0, // Cash
    IsPaymentReceived: true,
    IsShareReceiptThroughSms: false,
    RecordStatus: 0,
    Items: [
      { ProductId: 'prd_05', ProductName: 'Dark Chocolate Cake 500g', Quantity: 1, Rate: 350.00, Cgst: 31.50, Sgst: 31.50, Total: 413.00 }
    ]
  }
];

const getStoredInvoices = () => {
  const local = localStorage.getItem('pos_invoices');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  localStorage.setItem('pos_invoices', JSON.stringify(INITIAL_INVOICES));
  return INITIAL_INVOICES;
};

const saveStoredInvoices = (invoices) => {
  localStorage.setItem('pos_invoices', JSON.stringify(invoices));
};

export const invoiceService = {
  getInvoices: async ({ startDate, endDate, search, searchTerm, paymentMode, status } = {}) => {
    const queryTerm = search || searchTerm || '';
    const queryStatus = status || 'all';

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (queryTerm) params.append('search', queryTerm);
      if (queryStatus) params.append('status', queryStatus);
      if (paymentMode !== undefined && paymentMode !== '' && paymentMode !== 'all') {
        params.append('paymentMode', paymentMode);
      }
      const data = await apiClient.get(`/api/invoices?${params.toString()}`);
      if (Array.isArray(data)) {
        saveStoredInvoices(data);
        return data;
      }
    } catch (e) {
      console.warn('Fallback to local invoices:', e.message);
    }

    let list = getStoredInvoices();
    if (queryStatus === 'active') {
      list = list.filter(inv => (inv.RecordStatus === 0 || inv.record_status === 0));
    } else if (queryStatus === 'cancelled') {
      list = list.filter(inv => (inv.RecordStatus === 1 || inv.record_status === 1));
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      list = list.filter(inv => new Date(inv.Date || inv.date).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000;
      list = list.filter(inv => new Date(inv.Date || inv.date).getTime() <= end);
    }
    if (paymentMode !== undefined && paymentMode !== '' && paymentMode !== 'all') {
      list = list.filter(inv => String(inv.ModeOfPayment ?? inv.mode_of_payment) === String(paymentMode));
    }
    if (queryTerm) {
      const term = queryTerm.toLowerCase();
      list = list.filter(inv => {
        const docNum = (inv.DocumentNumber || inv.document_number || '').toLowerCase();
        const cName = (inv.CustomerName || inv.customer_name || '').toLowerCase();
        const mobile = (inv.MobileNumber || inv.mobile_number || '');
        return docNum.includes(term) || cName.includes(term) || mobile.includes(term);
      });
    }
    return list;
  },

  getInvoiceStats: async () => {
    try {
      const data = await apiClient.get('/api/invoices/stats');
      if (data && typeof data === 'object') {
        return data;
      }
    } catch (e) {
      console.warn('Fallback calculating local invoice stats:', e.message);
    }

    const list = getStoredInvoices();
    const active = list.filter(i => (i.RecordStatus === 0 || i.record_status === 0));
    const cancelled = list.filter(i => (i.RecordStatus === 1 || i.record_status === 1));

    return {
      TotalInvoices: list.length,
      ActiveInvoices: active.length,
      CancelledInvoices: cancelled.length,
      TotalSales: active.reduce((sum, i) => sum + (Number(i.Amount || i.amount) || 0), 0),
      CashSales: active.filter(i => (i.ModeOfPayment === 0 || i.mode_of_payment === 0)).reduce((sum, i) => sum + (Number(i.Amount || i.amount) || 0), 0),
      UpiSales: active.filter(i => (i.ModeOfPayment === 1 || i.mode_of_payment === 1)).reduce((sum, i) => sum + (Number(i.Amount || i.amount) || 0), 0),
      CardSales: active.filter(i => (i.ModeOfPayment === 2 || i.mode_of_payment === 2)).reduce((sum, i) => sum + (Number(i.Amount || i.amount) || 0), 0),
      TotalTax: active.reduce((sum, i) => sum + (Number(i.Cgst || i.cgst || 0) + Number(i.Sgst || i.sgst || 0) + Number(i.Igst || i.igst || 0)), 0)
    };
  },

  getInvoiceById: async (id) => {
    try {
      return await apiClient.get(`/api/invoices/${id}`);
    } catch (e) {
      const list = getStoredInvoices();
      return list.find(inv => inv.Id === id || inv.id === id) || null;
    }
  },

  createInvoiceFromCart: async (cart, activeStore) => {
    try {
      const created = await apiClient.post('/api/invoices', { cart, activeStore });
      const list = getStoredInvoices();
      list.unshift(created);
      saveStoredInvoices(list);
      return created;
    } catch (e) {
      console.warn('Fallback create local invoice:', e.message);
      const list = getStoredInvoices();
      const sequence = 101 + list.length;
      const documentNumber = `INV-2627-${String(sequence).padStart(6, '0')}`;

      const newInvoice = {
        Id: `inv_${Date.now()}`,
        DocumentNumber: documentNumber,
        Date: new Date().toISOString(),
        CustomerId: cart.customer.id || null,
        CustomerName: cart.customer.name || 'Walk-in Customer',
        MobileNumber: cart.customer.mobileNumber || '',
        StoreId: activeStore?.id || 'store_mum_01',
        StoreName: activeStore?.name || 'DailyMart Express',
        Subtotal: cart.subtotal,
        Cgst: cart.cgst,
        Sgst: cart.sgst,
        Igst: cart.igst || 0,
        RoundOff: cart.roundOff,
        Amount: cart.grandTotal,
        ModeOfPayment: cart.paymentMode,
        IsPaymentReceived: cart.isPaymentReceived,
        IsShareReceiptThroughSms: cart.sendWhatsApp,
        RecordStatus: 0,
        Created: new Date().toISOString(),
        Updated: new Date().toISOString(),
        CreatedId: 'user_admin_01',
        UpdatedId: 'user_admin_01',
        Items: cart.items.map(item => {
          const r = parseFloat(item.rate !== undefined ? item.rate : (item.cost || 0));
          const q = parseFloat(item.quantity !== undefined ? item.quantity : 1);
          return {
            ProductId: item.id,
            ProductName: item.name,
            Quantity: q,
            Unit: String(item.unit || item.Unit || 'PCS').toUpperCase(),
            Rate: r,
            Total: parseFloat((r * q).toFixed(2))
          };
        })
      };

      list.unshift(newInvoice);
      saveStoredInvoices(list);

      // In offline fallback, also decrement local storage products
      try {
        const stored = JSON.parse(localStorage.getItem('pos_products') || '[]');
        cart.items.forEach(ci => {
          const p = stored.find(sp => String(sp.Id) === String(ci.id) || String(sp.ProductNumber) === String(ci.productNumber));
          if (p) {
            p.StockQuantity = Math.max(0, parseFloat(((p.StockQuantity || 0) - ci.quantity).toFixed(3)));
          }
        });
        localStorage.setItem('pos_products', JSON.stringify(stored));
      } catch (err) {}

      return newInvoice;
    }
  },

  cancelInvoice: async (id, reason) => {
    try {
      await apiClient.post(`/api/invoices/${id}/cancel`, { reason });
    } catch (e) {
      console.warn('Fallback cancel local invoice:', e.message);
    }
    const list = getStoredInvoices();
    const item = list.find(inv => inv.Id === id || inv.id === id);
    if (item) {
      item.RecordStatus = 1;
      item.CancellationReason = reason;
      item.Updated = new Date().toISOString();
      saveStoredInvoices(list);
      return true;
    }
    return false;
  }
};

export default invoiceService;
