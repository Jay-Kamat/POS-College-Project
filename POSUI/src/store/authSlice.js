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

const getSavedUser = () => {
  try {
    const saved = localStorage.getItem('pos_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
};

const getSavedToken = () => {
  try {
    return localStorage.getItem('pos_token') || null;
  } catch (e) {
    return null;
  }
};

const getSavedPermissions = () => {
  try {
    const saved = localStorage.getItem('pos_permissions');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

const savedUser = getSavedUser();
const savedToken = getSavedToken();

const initialState = {
  user: savedUser,
  token: savedToken,
  permissions: getSavedPermissions(),
  activeStore: getSavedActiveStore(),
  isAuthenticated: Boolean(savedToken && savedUser),
  isLoading: false,
  error: null
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.permissions = action.payload.permissions || [];
      state.isAuthenticated = true;
      state.error = null;

      try {
        localStorage.setItem('pos_token', action.payload.token);
        if (action.payload.refreshToken) {
          localStorage.setItem('pos_refresh_token', action.payload.refreshToken);
        }
        localStorage.setItem('pos_user', JSON.stringify(action.payload.user));
        localStorage.setItem('pos_permissions', JSON.stringify(action.payload.permissions || []));
      } catch (e) {}
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      try {
        if (action.payload) {
          localStorage.setItem('pos_user', JSON.stringify(action.payload));
        } else {
          localStorage.removeItem('pos_user');
        }
      } catch (e) {}
    },
    setRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
        try {
          localStorage.setItem('pos_user', JSON.stringify(state.user));
        } catch (e) {}
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
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.error = null;
      try {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_refresh_token');
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_permissions');
      } catch (e) {}
    }
  }
});

export const { setAuth, setUser, setRole, setActiveStore, logout } = authSlice.actions;
export default authSlice.reducer;
