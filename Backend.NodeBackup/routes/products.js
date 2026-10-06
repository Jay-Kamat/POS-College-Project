import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/products/barcode/:barcode (Lookup by barcode or QR code)
router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const raw = decodeURIComponent(req.params.barcode || '').trim();
    if (!raw) {
      return res.status(400).json({ status: 'error', message: 'Barcode is required' });
    }

    const matched = await db.getProductByBarcode(raw);
    if (!matched) {
      return res.status(404).json({ status: 'error', message: `No product found for code "${raw}"` });
    }

    return res.json({ status: 'success', data: matched });
  } catch (err) {
    next(err);
  }
});

// GET /api/products (filter by category, search)
router.get('/', async (req, res, next) => {
  try {
    const { categoryId, searchTerm } = req.query;
    const list = await db.getProducts({ categoryId, searchTerm });
    return res.json({ status: 'success', count: list.length, data: list });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await db.getProductById(req.params.id);
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    return res.json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.Name || data.Cost === undefined) {
      return res.status(400).json({ status: 'error', message: 'Product Name and Cost are required' });
    }

    const created = await db.createProduct(data);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id (Soft Delete)
router.delete('/:id', async (req, res, next) => {
  try {
    await db.softDeleteProduct(req.params.id);
    return res.json({ status: 'success', message: 'Product soft deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
