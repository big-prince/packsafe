mport express from 'express';
import { authMiddleware } from '../middleware/auth';
import { IndexManager } from '../utils/indexManager';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware to check admin role
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/admin/indexes/status
 * Get current index status for all collections
 */
router.get('/indexes/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const indexManager = IndexManager.getInstance();
    const status = await indexManager.getIndexStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting index status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get index status'
    });
  }
});

/**
 * POST /api/admin/indexes/initialize
 * Initialize/clean indexes
 */
router.post('/indexes/initialize', authMiddleware, adminOnly, async (req, res) => {
  try {
    const indexManager = IndexManager.getInstance();
    await indexManager.initializeIndexes();
    
    logger.info('Indexes initialized via admin endpoint');
    res.json({
      success: true,
      message: 'Indexes initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing indexes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize indexes'
    });
  }
});

/**
 * POST /api/admin/indexes/reset
 * Reset all indexes (dangerous operation)
 */
router.post('/indexes/reset', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_ALL_INDEXES') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": "RESET_ALL_INDEXES" }'
      });
    }

    const indexManager = IndexManager.getInstance();
    await indexManager.resetAllIndexes();
    
    logger.warn('All indexes reset via admin endpoint');
    res.json({
      success: true,
      message: 'All indexes reset and rebuilt successfully'
    });
  } catch (error) {
    logger.error('Error resetting indexes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset indexes'
    });
  }
});

export default router;
