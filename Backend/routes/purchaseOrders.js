import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/purchase-orders
router.get('/', async (req, res, next) => {
  try {
    const { status, vendorId } = req.query;
    const pos = await db.getPurchaseOrders({ status, vendorId });
    return res.json({ status: 'success', count: pos.length, data: pos });
  } catch (err) {
    next(err);
  }
});

// POST /api/purchase-orders
router.post('/', async (req, res, next) => {
  try {
    const { VendorId, Items } = req.body;
    if (!VendorId || !Items || !Items.length) {
      return res.status(400).json({ status: 'error', message: 'VendorId and at least one item are required' });
    }
    const created = await db.createPurchaseOrder(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/purchase-orders/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await db.updatePurchaseOrderStatus(req.params.id, status);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
