import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/material-returns/reasons
router.get('/reasons', async (req, res, next) => {
  try {
    const reasons = await db.getReturnReasons();
    return res.json({ status: 'success', data: reasons });
  } catch (err) {
    next(err);
  }
});

// GET /api/material-returns
router.get('/', async (req, res, next) => {
  try {
    const returns = await db.getMaterialReturns();
    return res.json({ status: 'success', count: returns.length, data: returns });
  } catch (err) {
    next(err);
  }
});

// POST /api/material-returns
router.post('/', async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.VendorId || !data.Items || !data.Items.length) {
      return res.status(400).json({ status: 'error', message: 'VendorId and at least one item are required' });
    }
    const created = await db.createMaterialReturn(data);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
