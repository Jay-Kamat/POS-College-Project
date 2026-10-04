import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/vendors
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const vendors = await db.getVendors(search);
    return res.json({ status: 'success', count: vendors.length, data: vendors });
  } catch (err) {
    next(err);
  }
});

// POST /api/vendors
router.post('/', async (req, res, next) => {
  try {
    const { Name } = req.body;
    if (!Name) {
      return res.status(400).json({ status: 'error', message: 'Vendor Name is required' });
    }
    const created = await db.createVendor(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/vendors/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.updateVendor(req.params.id, req.body);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vendors/:id (Soft Delete)
router.delete('/:id', async (req, res, next) => {
  try {
    await db.deleteVendor(req.params.id);
    return res.json({ status: 'success', message: 'Vendor soft deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
