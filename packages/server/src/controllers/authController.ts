import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create new user
    const user = (await User.create({
      name,
      email,
      password,
    })) as typeof User.prototype & {
      _id: string;
      role: string;
      name: string;
      email: string;
    };

    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = (await User.findOne({ email }).select('+password')) as
      | (typeof User.prototype & {
          _id: string;
          role: string;
          name: string;
          email: string;
          password: string;
        })
      | null;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    next(error);
  }
};

/**
 * Generate API key for a user
 */
export const generateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate a secure random API key with prefix for better tracking
    const crypto = require('crypto');
    const randomPart = crypto.randomBytes(24).toString('hex');
    const apiKey = `ps_${randomPart}`;

    // Update user with API key
    user.apiKey = apiKey;
    await user.save();

    // Log the generation for audit purposes
    logger.info(`API key generated for user ${user.email}`);

    return res.status(200).json({
      success: true,
      apiKey,
      message:
        'API key successfully generated. Keep this key secure - it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error generating API key:', error);
    next(error);
  }
};

/**
 * Helper to generate JWT token
 */
const generateToken = (userId: string, role: string): string => {
  const jwtSecret =
    process.env.JWT_SECRET ||
    'your-super-secret-jwt-key-change-this-in-production';

  return jwt.sign({ userId, role }, jwtSecret, { expiresIn: '7d' });
};

/**
 * Reset/regenerate API key
 */
export const resetApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate a secure random API key with prefix for better tracking
    const crypto = require('crypto');
    const randomPart = crypto.randomBytes(24).toString('hex');
    const apiKey = `ps_${randomPart}`; // 'ps' prefix for PackSafe

    // Update user with new API key
    user.apiKey = apiKey;
    await user.save();

    // Log the regeneration for audit purposes
    logger.info(`API key reset for user ${user.email}`);

    return res.status(200).json({
      success: true,
      apiKey,
      message:
        'API key successfully reset. Keep this key secure - it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error resetting API key:', error);
    next(error);
  }
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove API key
    user.apiKey = undefined;
    await user.save();

    // Log the revocation for audit purposes
    logger.info(`API key revoked for user ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'API key successfully revoked.',
    });
  } catch (error) {
    logger.error('Error revoking API key:', error);
    next(error);
  }
};
