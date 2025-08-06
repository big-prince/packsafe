#!/usr/bin/env node

/**
 * Pre-start script to initialize database indexes
 * This ensures clean index state before the server starts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { IndexManager } from '../src/utils/indexManager';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function preStartIndexManagement() {
  try {
    logger.info('🔧 Starting pre-start index management...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/packsafe';
    
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB for index management');

    // Initialize IndexManager
    const indexManager = IndexManager.getInstance();
    
    // Reset indexes if requested via environment variable
    if (process.env.RESET_INDEXES === 'true') {
      logger.warn('🗑️  RESET_INDEXES=true - Resetting all indexes');
      await indexManager.resetAllIndexes();
    } else {
      // Normal index initialization
      await indexManager.initializeIndexes();
    }

    // Show index status
    const indexStatus = await indexManager.getIndexStatus();
    logger.info('📊 Current index status:');
    for (const [collection, indexes] of Object.entries(indexStatus)) {
      logger.info(`  ${collection}: ${indexes.length} indexes`);
      indexes.forEach((idx: any) => {
        if (idx.name !== '_id_') {
          logger.info(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
        }
      });
    }

    logger.info('✅ Pre-start index management completed successfully');
    
  } catch (error) {
    logger.error('❌ Pre-start index management failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    logger.info('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  preStartIndexManagement();
}

export { preStartIndexManagement };
