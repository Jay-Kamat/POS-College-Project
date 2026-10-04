import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  bucketId: 'bkt_temp_01',
  bucketNumber: 'BKT-01',
  customer: {
    name: 'Jay Sharma',
    mobileNumber: '9876543210',
    state: 'Maharashtra',
    gstin: ''
  },
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
      const existing = state.items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += (product.quantity || 1);
      } else {
        state.items.push({
          id: product.id,
          productNumber: product.productNumber || product.ProductNumber,
          name: product.name || product.Name,
          rate: product.cost || product.Cost || 50,
          quantity: product.quantity || 1,
          taxPercent: product.taxPercent || 5,
          expiryDate: product.expiryDate || product.ExpiryDate || null,
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
      const item = state.items.find(i => i.id === id);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(i => i.id !== id);
        } else {
          item.quantity = quantity;
        }
      }
      recalculateTotals(state);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.id !== action.payload);
      recalculateTotals(state);
    },
    setCustomer: (state, action) => {
      state.customer = { ...state.customer, ...action.payload };
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
      state.amountReceived = 0;
      state.changeDue = 0;
      state.isPaymentReceived = false;
      recalculateTotals(state);
    },
    loadBucket: (state, action) => {
      return { ...state, ...action.payload };
    }
  }
});

export const {
  addItem,
  updateQuantity,
  removeItem,
  setCustomer,
  setPaymentMode,
  setCashReceived,
  setIsPaymentReceived,
  clearCart,
  loadBucket
} = cartSlice.actions;

export default cartSlice.reducer;
