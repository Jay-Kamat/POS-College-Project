import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: {
    uid: 'user_admin_01',
    email: 'admin@dailymart.in',
    displayName: 'Jay Sharma (Admin)',
    role: 'Admin', // 'Admin' | 'Cashier' | 'Inventory Manager'
  },
  activeStore: {
    id: 'store_mum_01',
    name: 'DailyMart Express',
    address: 'Plot 12, MG Road, Mumbai',
    state: 'Maharashtra',
    gstin: '27AABCU9603R1ZM',
    fssai: '11522001000123',
    phone: '+91 98765 43210'
  },
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
      }
    },
    setActiveStore: (state, action) => {
      state.activeStore = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    }
  }
});

export const { setUser, setRole, setActiveStore, logout } = authSlice.actions;
export default authSlice.reducer;
