import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { ScanResult } from '../models/ScanResult';
import { logger } from '../utils/logger';

// Import the AuthenticatedRequest interface
interface TokenPayload {
  id: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Get user statistics
 */
export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get all scan results for this user
    const scanResults = await ScanResult.find({ userId }).sort({
      scanDate: -1,
    });

    // Calculate statistics
    const uniqueProjects = new Set(scanResults.map(scan => scan.projectName));
    const projectsScanned = uniqueProjects.size;

    const totalDependencies = scanResults.reduce(
      (sum, scan) => sum + scan.summary.total,
      0
    );
    const scanCount = scanResults.length;

    // Get active projects (projects scanned in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScans = scanResults.filter(
      scan => scan.scanDate >= thirtyDaysAgo
    );
    const activeProjectNames = new Set(
      recentScans.map(scan => scan.projectName)
    );
    const activeProjects = activeProjectNames.size;

    // Get recent projects with details (limit to 5 most recent)
    const recentProjectsMap = new Map();

    for (const scan of scanResults) {
      if (
        !recentProjectsMap.has(scan.projectName) &&
        recentProjectsMap.size < 5
      ) {
        recentProjectsMap.set(scan.projectName, {
          name: scan.projectName,
          lastScan: scan.scanDate.toISOString(),
          dependencyCount: scan.summary.total,
        });
      }
    }

    const recentProjects = Array.from(recentProjectsMap.values());

    const userStats = {
      projectsScanned,
      totalDependencies,
      scanCount,
      activeProjects,
      recentProjects,
    };

    logger.info(
      `Retrieved stats for user ${userId}: ${JSON.stringify(userStats)}`
    );

    return res.status(200).json({
      success: true,
      data: userStats,
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    next(error);
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user;

    // Check if user is admin
    if (currentUser?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const users = await User.find({}, '-password -apiKeys');

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Users can only access their own data unless they're admin
    if (currentUser?.id !== id && currentUser?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own profile.',
      });
    }

    const user = await User.findById(id, '-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const { name, email } = req.body;

    // Users can only update their own profile unless they're admin
    if (currentUser?.id !== id && currentUser?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile.',
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use by another user',
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date(),
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`User profile updated: ${id}`);

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Users can only delete their own account unless they're admin
    if (currentUser?.id !== id && currentUser?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own account.',
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`User account deleted: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await User.findById(userId, '-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error getting current user:', error);
    next(error);
  }
};
