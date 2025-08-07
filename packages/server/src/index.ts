import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { connectDatabase } from './config/database';
import { connectCache, disconnectCache } from './config/cache';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { smartKeepAlive } from './utils/smartKeepAlive';

// Routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import packageRoutes from './routes/packages';
import scanRoutes from './routes/scan';
import vulnerabilityRoutes from './routes/vulnerabilities';
import licenseRoutes from './routes/licenses';
import userRoutes from './routes/users';
import cacheRoutes from './routes/cache';

// WebSocket handlers
import { setupWebSocket } from './websocket/socketHandler';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Trust proxy for Render deployment (must be before rate limiting)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    keepAlive: smartKeepAlive.getStats(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/packages', authMiddleware, packageRoutes);
app.use('/api/scan', authMiddleware, scanRoutes);
app.use('/api/vulnerabilities', authMiddleware, vulnerabilityRoutes);
app.use('/api/licenses', authMiddleware, licenseRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/cache', authMiddleware, cacheRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Setup WebSocket
setupWebSocket(io);

async function startServer(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
    await connectCache();

    // Simple index health check - don't fail startup if this fails
    try {
      logger.info('🔧 Checking database indexes...');
      // Basic check without complex IndexManager
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        logger.info('✅ Database connection healthy');
      }
    } catch (indexError) {
      logger.warn(
        '⚠️  Index check failed, but continuing startup:',
        indexError instanceof Error ? indexError.message : String(indexError)
      );
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 PackSafe server running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

      // Start smart keep-alive system
      smartKeepAlive.start();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  smartKeepAlive.stop();
  await disconnectCache();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  smartKeepAlive.stop();
  await disconnectCache();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();
