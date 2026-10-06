import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  heldBuckets: []
};

export const heldBucketsSlice = createSlice({
  name: 'heldBuckets',
  initialState,
  reducers: {
    addHeldBucket: (state, action) => {
      // Prevent duplicates by ID
      state.heldBuckets = state.heldBuckets.filter(b => b.id !== action.payload.id);
      state.heldBuckets.push(action.payload);
    },
    removeHeldBucket: (state, action) => {
      state.heldBuckets = state.heldBuckets.filter(b => b.id !== action.payload);
    },
    clearAllHeldBuckets: (state) => {
      state.heldBuckets = [];
    }
  }
});

export const { addHeldBucket, removeHeldBucket, clearAllHeldBuckets } = heldBucketsSlice.actions;
export default heldBucketsSlice.reducer;
