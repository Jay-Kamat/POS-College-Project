import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await db.getUsers();
    return res.json({ status: 'success', count: users.length, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/permissions-matrix
router.get('/permissions-matrix', async (req, res, next) => {
  try {
    const matrix = await db.getPermissionsMatrix();
    return res.json({ status: 'success', data: matrix });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/permissions-matrix
router.put('/permissions-matrix', async (req, res, next) => {
  try {
    const { moduleIndex, roleKey, actionKey, value } = req.body;
    const matrix = await db.updatePermission(moduleIndex, roleKey, actionKey, value);
    return res.json({ status: 'success', data: matrix });
  } catch (err) {
    next(err);
  }
});

// POST /api/users (Invite user)
router.post('/', async (req, res, next) => {
  try {
    const { Name, Email, Role, Store } = req.body;
    if (!Name || !Email) {
      return res.status(400).json({ status: 'error', message: 'Name and Email are required' });
    }
    const created = await db.createUser(req.body);
    return res.status(201).json({ status: 'success', data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const updated = await db.updateUserRole(req.params.id, role);
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id (Soft Delete)
router.delete('/:id', async (req, res, next) => {
  try {
    await db.deleteUser(req.params.id);
    return res.json({ status: 'success', message: 'User soft deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
