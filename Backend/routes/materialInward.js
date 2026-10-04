import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/material-inward
router.get('/', async (req, res, next) => {
  try {
    const inwards = await db.getMaterialInward();
    return res.json({ status: 'success', count: inwards.length, data: inwards });
  } catch (err) {
    next(err);
  }
});

// POST /api/material-inward
router.post('/', async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.VendorId || !data.Items || !data.Items.length) {
      return res.status(400).json({ status: 'error', message: 'VendorId and at least one item are required' });
    }
    const created = await db.createMaterialInward(data);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
