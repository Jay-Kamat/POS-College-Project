import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const cats = await db.getCategories();
    return res.json({ status: 'success', data: cats });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const { Name } = req.body;
    if (!Name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    const created = await db.createCategory(Name);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
