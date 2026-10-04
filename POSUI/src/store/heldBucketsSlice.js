import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  heldBuckets: [
    {
      id: 'bkt_held_01',
      bucketNumber: 'BKT-01',
      customerName: 'Jay Sharma',
      itemsCount: 2,
      total: 155,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]
};

export const heldBucketsSlice = createSlice({
  name: 'heldBuckets',
  initialState,
  reducers: {
    addHeldBucket: (state, action) => {
      state.heldBuckets.push(action.payload);
    },
    removeHeldBucket: (state, action) => {
      state.heldBuckets = state.heldBuckets.filter(b => b.id !== action.payload);
    }
  }
});

export const { addHeldBucket, removeHeldBucket } = heldBucketsSlice.actions;
export default heldBucketsSlice.reducer;
