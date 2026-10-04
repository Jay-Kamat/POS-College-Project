import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import heldBucketsReducer from './heldBucketsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    heldBuckets: heldBucketsReducer,
  },
});

export default store;
