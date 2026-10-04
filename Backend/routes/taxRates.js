import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/tax-rates
router.get('/', async (req, res, next) => {
  try {
    const taxRates = await db.getTaxRates();
    return res.json({ status: 'success', data: taxRates });
  } catch (err) {
    next(err);
  }
});

// POST /api/tax-rates
router.post('/', async (req, res, next) => {
  try {
    const { Name, IGST, CGST, SGST } = req.body;
    if (!Name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    const created = await db.createTaxRate(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
