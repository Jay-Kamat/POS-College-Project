import { createSlice } from '@reduxjs/toolkit';

const initialCustomer = {
  name: 'Walk-in Customer',
  mobileNumber: '',
  state: 'Maharashtra',
  gstin: ''
};

const initialState = {
  bucketId: 'bkt_temp_01',
  bucketNumber: 'BKT-01',
  customer: { ...initialCustomer },
  items: [],
  subtotal: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  roundOff: 0,
  grandTotal: 0,
  paymentMode: 0, // 0 = Cash, 1 = UPI
  amountReceived: 0,
  changeDue: 0,
  isPaymentReceived: false
};

const recalculateTotals = (state, storeState = 'Maharashtra') => {
  let sub = 0;
  let cgstSum = 0;
  let sgstSum = 0;
  let igstSum = 0;

  const isIntraState = !state.customer.state || state.customer.state === storeState;

  state.items.forEach(item => {
    const lineBase = item.rate * item.quantity;
    sub += lineBase;

    const taxPercent = item.taxPercent || 0;
    if (isIntraState) {
      const halfRate = taxPercent / 2;
      const cg = parseFloat(((lineBase * halfRate) / 100).toFixed(2));
      const sg = parseFloat(((lineBase * halfRate) / 100).toFixed(2));
      item.cgst = cg;
      item.sgst = sg;
      item.igst = 0;
      cgstSum += cg;
      sgstSum += sg;
    } else {
      const ig = parseFloat(((lineBase * taxPercent) / 100).toFixed(2));
      item.cgst = 0;
      item.sgst = 0;
      item.igst = ig;
      igstSum += ig;
    }
    item.amount = parseFloat((lineBase + item.cgst + item.sgst + item.igst).toFixed(2));
  });

  const gross = sub + cgstSum + sgstSum + igstSum;
  const rounded = Math.round(gross);
  const diff = parseFloat((rounded - gross).toFixed(2));

  state.subtotal = parseFloat(sub.toFixed(2));
  state.cgst = parseFloat(cgstSum.toFixed(2));
  state.sgst = parseFloat(sgstSum.toFixed(2));
  state.igst = parseFloat(igstSum.toFixed(2));
  state.roundOff = diff;
  state.grandTotal = rounded;

  if (state.paymentMode === 0 && state.amountReceived > 0) {
    state.changeDue = Math.max(0, parseFloat((state.amountReceived - state.grandTotal).toFixed(2)));
  } else {
    state.changeDue = 0;
  }
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const product = action.payload;
      if (!product) return;

      // Extract product ID supporting both PascalCase and camelCase from backend
      const productId = String(product.Id || product.id || product.ProductNumber || product.productNumber || '');
      if (!productId) return;

      const unit = String(product.Unit || product.unit || 'PCS').toUpperCase();

      // Determine stock quantity available (supporting decimals for weighed items like KG/LTR)
      let availableStock = 999999;
      if (product.StockQuantity !== undefined && product.StockQuantity !== null) {
        availableStock = parseFloat(product.StockQuantity);
      } else if (product.stockQuantity !== undefined && product.stockQuantity !== null) {
        availableStock = parseFloat(product.stockQuantity);
      }

      // If item is completely out of stock, reject adding to cart
      if (availableStock <= 0) {
        return;
      }

      const productNum = String(product.ProductNumber || product.productNumber || '');
      const existing = state.items.find(i => String(i.id) === productId || (productNum && String(i.productNumber) === productNum));
      if (existing) {
        const itemMaxStock = existing.stockQuantity !== undefined ? parseFloat(existing.stockQuantity) : availableStock;
        const requestedAdd = product.quantity !== undefined ? parseFloat(product.quantity) : 1;
        // Do not exceed available stock in cart!
        if (existing.quantity >= itemMaxStock) {
          return;
        }
        existing.quantity = Math.min(parseFloat((existing.quantity + requestedAdd).toFixed(3)), itemMaxStock);
      } else {
        const cost = product.Cost !== undefined
          ? parseFloat(product.Cost)
          : (product.cost !== undefined ? parseFloat(product.cost) : (product.rate || 0));

        const tax = product.TaxPercent !== undefined
          ? parseFloat(product.TaxPercent)
          : (product.taxPercent !== undefined ? parseFloat(product.taxPercent) : 5);

        const initialQty = Math.min(product.quantity !== undefined ? parseFloat(product.quantity) : 1, availableStock);
        if (initialQty <= 0) return;

        state.items.push({
          id: productId,
          productNumber: String(product.ProductNumber || product.productNumber || productId),
          name: product.Name || product.name || 'Product',
          rate: cost,
          quantity: parseFloat(initialQty.toFixed(3)),
          unit: unit,
          stockQuantity: availableStock,
          taxPercent: tax,
          expiryDate: product.ExpiryDate || product.expiryDate || null,
          cgst: 0,
          sgst: 0,
          igst: 0,
          amount: 0
        });
      }
      recalculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(i => String(i.id) === String(id));
      if (item) {
        const parsed = parseFloat(Number(quantity).toFixed(3));
        if (parsed <= 0) {
          state.items = state.items.filter(i => String(i.id) !== String(id));
        } else {
          const maxStock = item.stockQuantity !== undefined ? parseFloat(item.stockQuantity) : 999999;
          item.quantity = Math.min(parsed, maxStock);
        }
      }
      recalculateTotals(state);
    },
    setQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(i => String(i.id) === String(id));
      if (item) {
        const parsed = parseFloat(Number(quantity).toFixed(3));
        if (parsed <= 0) {
          state.items = state.items.filter(i => String(i.id) !== String(id));
        } else {
          const maxStock = item.stockQuantity !== undefined ? parseFloat(item.stockQuantity) : 999999;
          item.quantity = Math.min(parsed, maxStock);
        }
      }
      recalculateTotals(state);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => String(i.id) !== String(action.payload));
      recalculateTotals(state);
    },
    setCustomer: (state, action) => {
      state.customer = { ...state.customer, ...action.payload };
      recalculateTotals(state);
    },
    resetCustomer: (state) => {
      state.customer = { ...initialCustomer };
      recalculateTotals(state);
    },
    setPaymentMode: (state, action) => {
      state.paymentMode = action.payload;
      if (state.paymentMode === 1) {
        state.isPaymentReceived = true; // UPI default marked received or ready
      }
      recalculateTotals(state);
    },
    setCashReceived: (state, action) => {
      state.amountReceived = action.payload;
      if (state.amountReceived >= state.grandTotal) {
        state.changeDue = parseFloat((state.amountReceived - state.grandTotal).toFixed(2));
        state.isPaymentReceived = true;
      } else {
        state.changeDue = 0;
        state.isPaymentReceived = false;
      }
    },
    setIsPaymentReceived: (state, action) => {
      state.isPaymentReceived = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
      state.customer = { ...initialCustomer };
      state.amountReceived = 0;
      state.changeDue = 0;
      state.isPaymentReceived = false;
      recalculateTotals(state);
    },
    loadBucket: (state, action) => {
      const loaded = action.payload || {};
      state.bucketId = loaded.bucketId || state.bucketId || 'bkt_temp_01';
      state.bucketNumber = loaded.bucketNumber || 'BKT-01';
      state.customer = loaded.customer ? { ...loaded.customer } : { ...initialCustomer };
      state.items = Array.isArray(loaded.items)
        ? loaded.items.map(item => ({
            ...item,
            id: String(item.id || item.Id || item.ProductNumber || ''),
            productNumber: String(item.productNumber || item.ProductNumber || item.id || ''),
            name: item.name || item.Name || 'Product',
            rate: parseFloat(item.rate !== undefined ? item.rate : (item.Cost || 0)),
            quantity: parseFloat(item.quantity !== undefined ? item.quantity : 1),
            unit: String(item.unit || item.Unit || 'PCS').toUpperCase(),
            taxPercent: parseFloat(item.taxPercent !== undefined ? item.taxPercent : (item.TaxPercent || 0)),
            stockQuantity: item.stockQuantity !== undefined ? parseFloat(item.stockQuantity) : (item.StockQuantity !== undefined ? parseFloat(item.StockQuantity) : 999999),
            cgst: 0,
            sgst: 0,
            igst: 0,
            amount: 0
          }))
        : [];
      state.paymentMode = loaded.paymentMode !== undefined ? loaded.paymentMode : 0;
      state.amountReceived = loaded.amountReceived || 0;
      state.changeDue = loaded.changeDue || 0;
      state.isPaymentReceived = !!loaded.isPaymentReceived;
      recalculateTotals(state);
    }
  }
});

export const {
  addItem,
  updateQuantity,
  setQuantity,
  removeItem,
  setCustomer,
  resetCustomer,
  setPaymentMode,
  setCashReceived,
  setIsPaymentReceived,
  clearCart,
  loadBucket
} = cartSlice.actions;

export default cartSlice.reducer;
