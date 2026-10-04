import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/settings/store-profile
router.get('/store-profile', async (req, res, next) => {
  try {
    const store = await db.getStoreProfile();
    return res.json({ status: 'success', data: store });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/store-profile
router.put('/store-profile', async (req, res, next) => {
  try {
    const updated = await db.updateStoreProfile(req.body);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const store = await db.getStoreProfile();
    const taxRates = await db.getTaxRates();
    return res.json({
      status: 'success',
      data: {
        storeProfile: store,
        taxRates
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
