import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/stores
router.get('/', async (req, res, next) => {
  try {
    const store = await db.getStoreProfile();
    return res.json({ status: 'success', data: store, all: store ? [store] : [] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/stores/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.updateStoreProfile({ ...req.body, Id: req.params.id });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
