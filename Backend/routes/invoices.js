import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/invoices
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, search, paymentMode } = req.query;
    const invoices = await db.getInvoices({ startDate, endDate, search, paymentMode });
    return res.json({ status: 'success', count: invoices.length, data: invoices });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const found = await db.getInvoiceById(req.params.id);
    if (!found) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }
    return res.json({ status: 'success', data: found });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices (Create Finalized Invoice)
router.post('/', async (req, res, next) => {
  try {
    const { cart, activeStore } = req.body;
    if (!cart || !cart.items || !cart.items.length) {
      return res.status(400).json({ status: 'error', message: 'Cannot generate invoice for an empty cart' });
    }

    const created = await db.createInvoice(cart, activeStore);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices/:id/cancel (Soft cancellation)
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelled = await db.cancelInvoice(req.params.id, reason);
    if (!cancelled) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }
    return res.json({ status: 'success', message: 'Invoice soft cancelled successfully', data: cancelled });
  } catch (err) {
    next(err);
  }
});

export default router;
