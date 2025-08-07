const mongoose = require('mongoose');

// Simple index manager that fixes duplicate index issues
async function fixIndexes() {
  try {
    console.log('🔧 Starting index cleanup...');

    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI =
        process.env.MONGODB_URI || 'mongodb://localhost:27017/packsafe';
      await mongoose.connect(MONGODB_URI);
      console.log('📁 Connected to MongoDB for index management');
    }

    const collections = ['users', 'projects', 'packages', 'vulnerabilities'];

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes();

        console.log(`📋 ${collectionName} current indexes:`, indexes.length);

        // Drop problematic duplicate indexes
        for (const index of indexes) {
          // Skip the default _id index
          if (index.name === '_id_') continue;

          // Check for duplicate apiKey indexes
          if (index.name.includes('apiKey') && index.name !== 'apiKey_1') {
            try {
              await collection.dropIndex(index.name);
              console.log(
                `🗑️  Dropped duplicate index: ${index.name} from ${collectionName}`
              );
            } catch (err) {
              console.log(
                `⚠️  Could not drop index ${index.name}:`,
                err.message
              );
            }
          }
        }
      } catch (err) {
        // Collection might not exist yet, that's ok
        console.log(`ℹ️  Collection ${collectionName} not found, skipping...`);
      }
    }

    console.log('✅ Index cleanup completed');
  } catch (error) {
    console.error('❌ Error during index cleanup:', error.message);
  } finally {
    // Don't close connection if it was already open
    if (process.env.NODE_ENV !== 'production') {
      await mongoose.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  fixIndexes()
    .then(() => {
      console.log('🎉 Index management complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Index management failed:', err);
      process.exit(1);
    });
}

module.exports = { fixIndexes };
