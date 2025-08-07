import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware to check admin role
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res
      .status(403)
      .json({ success: false, error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/admin/health
 * Simple admin health check
 */
router.get('/health', authMiddleware, adminOnly, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      success: true,
      data: {
        database: dbStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    logger.error('Error in admin health check:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

/**
 * POST /api/admin/logs/clear
 * Clear application logs (placeholder)
 */
router.post('/logs/clear', authMiddleware, adminOnly, async (req, res) => {
  try {
    logger.info('Admin requested log clear');
    res.json({
      success: true,
      message: 'Logs cleared successfully',
    });
  } catch (error) {
    logger.error('Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs',
    });
  }
});

export default router;
