import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const customers = await db.getCustomers(search);
    return res.json({ status: 'success', count: customers.length, data: customers });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/by-mobile/:mobile
router.get('/by-mobile/:mobile', async (req, res, next) => {
  try {
    const found = await db.getCustomerByMobile(req.params.mobile);
    if (!found) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }
    return res.json({ status: 'success', data: found });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const { Name, MobileNumber } = req.body;
    if (!Name || !MobileNumber) {
      return res.status(400).json({ status: 'error', message: 'Name and MobileNumber are required' });
    }
    const created = await db.createCustomer(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.updateCustomer(req.params.id, req.body);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id (Soft Delete)
router.delete('/:id', async (req, res, next) => {
  try {
    await db.deleteCustomer(req.params.id);
    return res.json({ status: 'success', message: 'Customer soft deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
