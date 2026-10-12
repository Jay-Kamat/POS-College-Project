import { createSlice } from '@reduxjs/toolkit';

const getSavedActiveStore = () => {
  try {
    const saved = localStorage.getItem('pos_active_store');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    id: 'store_mum_01',
    name: 'DailyMart Express (Mumbai)',
    address: 'Plot 12, Commercial Hub, MG Road, Mumbai',
    state: 'Maharashtra',
    gstin: '27AABCU9603R1ZM',
    fssai: '11522001000123',
    phone: '+91 98765 43210'
  };
};

const initialState = {
  user: {
    uid: 'user_admin_01',
    email: 'admin@dailymart.in',
    displayName: 'Jay Sharma (Admin)',
    role: 'Admin', // 'Admin' | 'Store Manager' | 'Cashier' | 'Inventory'
    storeId: 'store_mum_01',
    storeName: 'DailyMart Express (Mumbai)'
  },
  activeStore: getSavedActiveStore(),
  isAuthenticated: true,
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
        if (action.payload === 'Admin') {
          state.user.displayName = 'Jay Sharma (Admin)';
          state.user.email = 'admin@dailymart.in';
        } else if (action.payload === 'Store Manager') {
          state.user.displayName = 'Amit Deshmukh (Store Manager)';
          state.user.email = 'manager.mumbai@dailymart.in';
        } else if (action.payload === 'Cashier') {
          state.user.displayName = 'Pooja Nair (Cashier)';
          state.user.email = 'cashier1@dailymart.in';
        } else if (action.payload === 'Inventory' || action.payload === 'Inventory Manager') {
          state.user.displayName = 'Vikram Singh (Inventory)';
          state.user.email = 'inventory@dailymart.in';
        }
      }
    },
    setActiveStore: (state, action) => {
      state.activeStore = action.payload;
      try {
        localStorage.setItem('pos_active_store', JSON.stringify(action.payload));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pos_store_changed', { detail: action.payload }));
        }
      } catch (e) {}
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});

export const { setUser, setRole, setActiveStore, logout } = authSlice.actions;
export default authSlice.reducer;
