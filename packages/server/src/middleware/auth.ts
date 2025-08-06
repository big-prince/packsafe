import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';

interface TokenPayload {
  id: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in headers
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Check for API key in query or headers
    const apiKey = req.query.apiKey || req.headers['x-api-key'];

    if (!token && !apiKey) {
      res.status(401).json({
        success: false,
        message:
          'Authentication required. Please provide a valid token or API key.',
      });
      return;
    }

    // Handle JWT authentication
    if (token) {
      const jwtSecret =
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-this-in-production';
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };
      next();
      return;
    }

    // Handle API key authentication (for VS Code extension)
    if (apiKey) {
      // Validate the API key against registered users
      const user = (await User.findOne({ apiKey })) as mongoose.Document & {
        _id: mongoose.Types.ObjectId;
        role: string;
      };

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid API key. Please check your credentials.',
        });
        return;
      }

      // Set user info based on the user found by API key
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };

      next();
      return;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
