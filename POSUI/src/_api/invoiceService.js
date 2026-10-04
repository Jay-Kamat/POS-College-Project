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
  getInvoices: async ({ searchTerm = '', status = 'all' } = {}) => {
    let list = getStoredInvoices();
    if (status === 'active') {
      list = list.filter(i => i.RecordStatus === 0);
    } else if (status === 'cancelled') {
      list = list.filter(i => i.RecordStatus === 1);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(i => 
        i.DocumentNumber.toLowerCase().includes(lower) ||
        (i.CustomerName && i.CustomerName.toLowerCase().includes(lower)) ||
        (i.MobileNumber && i.MobileNumber.includes(searchTerm))
      );
    }
    return list;
  },

  getInvoiceById: async (id) => {
    const list = getStoredInvoices();
    return list.find(i => i.Id === id) || null;
  },

  createInvoiceFromCart: async (cartState, storeInfo) => {
    const list = getStoredInvoices();
    
    // Generate sequential DocumentNumber: INV-2627-000XXX
    const nextSeq = list.length + 103;
    const documentNumber = `INV-2627-${String(nextSeq).padStart(6, '0')}`;

    const newInvoice = {
      Id: `inv_${Date.now()}`,
      DocumentNumber: documentNumber,
      Date: new Date().toISOString(),
      CustomerId: cartState.customer.id || null,
      CustomerName: cartState.customer.name || 'Walk-in Customer',
      MobileNumber: cartState.customer.mobileNumber || '',
      CustomerGst: cartState.customer.gstin || '',
      CustomerState: cartState.customer.state || storeInfo.state,
      StoreId: storeInfo.id,
      StoreName: storeInfo.name,
      StoreAddress: storeInfo.address,
      StoreGst: storeInfo.gstin,
      StoreFssai: storeInfo.fssai,
      StorePhone: storeInfo.phone,
      Amount: cartState.grandTotal,
      Subtotal: cartState.subtotal,
      Cgst: cartState.cgst,
      Sgst: cartState.sgst,
      Igst: cartState.igst,
      RoundOff: cartState.roundOff,
      ModeOfPayment: cartState.paymentMode, // 0 = Cash, 1 = UPI
      IsPaymentReceived: cartState.isPaymentReceived,
      IsShareReceiptThroughSms: !!cartState.customer.mobileNumber,
      RecordStatus: 0,
      Items: cartState.items.map(i => ({
        ProductId: i.id,
        ProductName: i.name,
        Quantity: i.quantity,
        Rate: i.rate,
        Cgst: i.cgst,
        Sgst: i.sgst,
        Igst: i.igst,
        Total: i.amount
      })),
      Created: new Date().toISOString(),
      Updated: new Date().toISOString()
    };

    list.unshift(newInvoice);
    saveStoredInvoices(list);
    return newInvoice;
  },

  cancelInvoice: async (id, reason) => {
    const list = getStoredInvoices();
    const invoice = list.find(i => i.Id === id);
    if (!invoice) throw new Error('Invoice not found');

    // Soft cancellation
    invoice.RecordStatus = 1;
    invoice.CancellationReason = reason;
    invoice.CancelledAt = new Date().toISOString();
    invoice.Updated = new Date().toISOString();

    saveStoredInvoices(list);
    return invoice;
  }
};

export default invoiceService;
