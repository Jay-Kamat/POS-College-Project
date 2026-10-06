import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/buckets
router.get('/', async (req, res, next) => {
  try {
    const buckets = await db.getBuckets();
    return res.json({ status: 'success', count: buckets.length, data: buckets });
  } catch (err) {
    next(err);
  }
});

// POST /api/buckets (Hold bucket)
router.post('/', async (req, res, next) => {
  try {
    const created = await db.saveBucket(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/buckets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.deleteBucket(req.params.id);
    return res.json({ status: 'success', message: 'Bucket released / removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
