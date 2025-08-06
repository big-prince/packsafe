import { Router } from 'express';
import { CacheService } from '../config/cache';

const router = Router();
const cacheService = new CacheService();

// GET /api/cache/stats - Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cache/flush - Clear all cache
router.post('/flush', async (req, res) => {
  try {
    await cacheService.flushAll();
    res.json({
      success: true,
      message: 'Cache flushed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to flush cache',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/cache/:key - Delete specific cache key
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await cacheService.del(key);

    if (deleted) {
      res.json({
        success: true,
        message: `Cache key "${key}" deleted successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Cache key "${key}" not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete cache key',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
