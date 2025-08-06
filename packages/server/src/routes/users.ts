import { Router } from 'express';
import {
  getUserStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
} from '../controllers/userController';

const router = Router();

// All routes already have auth middleware applied at app level

// GET /api/users/me - Get current user profile
router.get('/me', getCurrentUser);

// GET /api/users/stats - Get user statistics
router.get('/stats', getUserStats);

// GET /api/users - Get all users (admin only)
router.get('/', getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUserById);

// PUT /api/users/:id - Update user profile
router.put('/:id', updateUser);

// DELETE /api/users/:id - Delete user account
router.delete('/:id', deleteUser);

export default router;
