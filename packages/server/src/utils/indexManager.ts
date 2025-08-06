import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class IndexManager {
  private static instance: IndexManager;
  private initialized = false;

  private constructor() {}

  public static getInstance(): IndexManager {
    if (!IndexManager.instance) {
      IndexManager.instance = new IndexManager();
    }
    return IndexManager.instance;
  }

  /**
   * Clean and rebuild all indexes for better performance and consistency
   */
  public async initializeIndexes(): Promise<void> {
    if (this.initialized) {
      logger.info('Indexes already initialized');
      return;
    }

    try {
      logger.info('Starting index management...');
      
      // Wait for MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        logger.info('Waiting for MongoDB connection...');
        await new Promise((resolve) => {
          mongoose.connection.once('connected', resolve);
        });
      }

      // Ensure db is available
      if (!mongoose.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        await this.cleanCollectionIndexes(collection.name);
      }

      // Rebuild essential indexes
      await this.rebuildEssentialIndexes();
      
      this.initialized = true;
      logger.info('Index management completed successfully');
    } catch (error) {
      logger.error('Error during index initialization:', error);
      throw error;
    }
  }

  /**
   * Clean duplicate and problematic indexes from a collection
   */
  private async cleanCollectionIndexes(collectionName: string): Promise<void> {
    try {
      if (!mongoose.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      const collection = mongoose.connection.db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      logger.info(`Checking indexes for collection: ${collectionName}`);
      
      // Track duplicate indexes
      const indexKeys = new Map<string, string[]>();
      
      for (const index of indexes) {
        // Skip the default _id index
        if (index.name === '_id_') continue;
        
        const keyString = JSON.stringify(index.key);
        
        if (indexKeys.has(keyString)) {
          indexKeys.get(keyString)!.push(index.name);
        } else {
          indexKeys.set(keyString, [index.name]);
        }
      }
      
      // Remove duplicate indexes (keep the first one)
      for (const [keyString, indexNames] of indexKeys) {
        if (indexNames.length > 1) {
          logger.warn(`Found duplicate indexes for ${keyString}: ${indexNames.join(', ')}`);
          
          // Drop all but the first index
          for (let i = 1; i < indexNames.length; i++) {
            try {
              await collection.dropIndex(indexNames[i]);
              logger.info(`Dropped duplicate index: ${indexNames[i]}`);
            } catch (error) {
              logger.warn(`Could not drop index ${indexNames[i]}:`, error);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error cleaning indexes for collection ${collectionName}:`, error);
    }
  }

  /**
   * Rebuild essential indexes that we need for performance
   */
  private async rebuildEssentialIndexes(): Promise<void> {
    try {
      logger.info('Rebuilding essential indexes...');

      if (!mongoose.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      // Users collection indexes
      const usersCollection = mongoose.connection.db.collection('users');
      
      // Ensure unique email index
      await this.ensureIndex(usersCollection, 'users_email_unique', 
        { email: 1 }, { unique: true, background: true });
      
      // Ensure API key index (sparse because not all users have API keys)
      await this.ensureIndex(usersCollection, 'users_apikey_sparse', 
        { apiKey: 1 }, { unique: true, sparse: true, background: true });

      // WhatsApp number index (sparse)
      await this.ensureIndex(usersCollection, 'users_whatsapp_sparse', 
        { whatsappNumber: 1 }, { unique: true, sparse: true, background: true });

      // Scans collection indexes (if exists)
      try {
        const scansCollection = mongoose.connection.db.collection('scans');
        
        // Index for user scans
        await this.ensureIndex(scansCollection, 'scans_user_created', 
          { userId: 1, createdAt: -1 }, { background: true });
        
        // Index for project scans
        await this.ensureIndex(scansCollection, 'scans_project_created', 
          { projectId: 1, createdAt: -1 }, { background: true });
      } catch (error) {
        logger.info('Scans collection not found, skipping scan indexes');
      }

      logger.info('Essential indexes rebuilt successfully');
    } catch (error) {
      logger.error('Error rebuilding essential indexes:', error);
      throw error;
    }
  }

  /**
   * Ensure an index exists with the given name and specification
   */
  private async ensureIndex(
    collection: any, 
    indexName: string, 
    keys: object, 
    options: object = {}
  ): Promise<void> {
    try {
      // Check if index already exists
      const indexes = await collection.listIndexes().toArray();
      const existingIndex = indexes.find((idx: any) => idx.name === indexName);
      
      if (existingIndex) {
        // Check if the index definition matches
        if (JSON.stringify(existingIndex.key) === JSON.stringify(keys)) {
          logger.info(`Index ${indexName} already exists and matches specification`);
          return;
        } else {
          // Drop and recreate if different
          logger.info(`Recreating index ${indexName} due to specification change`);
          await collection.dropIndex(indexName);
        }
      }
      
      // Create the index
      await collection.createIndex(keys, { ...options, name: indexName });
      logger.info(`Created index: ${indexName}`);
    } catch (error) {
      logger.error(`Error ensuring index ${indexName}:`, error);
    }
  }

  /**
   * Drop all indexes except _id for a fresh start (use with caution)
   */
  public async resetAllIndexes(): Promise<void> {
    try {
      logger.warn('Resetting all indexes - this will drop all custom indexes');
      
      if (!mongoose.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const coll = mongoose.connection.db.collection(collection.name);
        const indexes = await coll.listIndexes().toArray();
        
        for (const index of indexes) {
          if (index.name !== '_id_') {
            try {
              await coll.dropIndex(index.name);
              logger.info(`Dropped index ${index.name} from ${collection.name}`);
            } catch (error) {
              logger.warn(`Could not drop index ${index.name}:`, error);
            }
          }
        }
      }
      
      // Rebuild essential indexes
      await this.rebuildEssentialIndexes();
      
      logger.info('Index reset completed');
    } catch (error) {
      logger.error('Error resetting indexes:', error);
      throw error;
    }
  }

  /**
   * Get index status for all collections
   */
  public async getIndexStatus(): Promise<Record<string, any[]>> {
    const status: Record<string, any[]> = {};
    
    try {
      if (!mongoose.connection.db) {
        throw new Error('MongoDB database connection not available');
      }

      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const coll = mongoose.connection.db.collection(collection.name);
        const indexes = await coll.listIndexes().toArray();
        status[collection.name] = indexes;
      }
    } catch (error) {
      logger.error('Error getting index status:', error);
    }
    
    return status;
  }
}

export default IndexManager;
