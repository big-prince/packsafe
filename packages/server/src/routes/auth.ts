import { Router } from 'express';
import {
  register,
  login,
  generateApiKey,
  resetApiKey,
  revokeApiKey,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes - require authentication
router.post('/api-key', authMiddleware, generateApiKey);
router.post('/api-key/reset', authMiddleware, resetApiKey);
router.post('/api-key/revoke', authMiddleware, revokeApiKey);

export default router;
