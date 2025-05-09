import mongoose from 'mongoose';

async function cleanDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/projectlink');
    console.log('Connected to MongoDB');

    // Drop all collections
    console.log('\nDropping all collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await mongoose.connection.db.collection(collection.name).drop();
    }

    // Create fresh collections
    console.log('\nCreating fresh collections...');
    await mongoose.connection.createCollection('users');
    await mongoose.connection.createCollection('projects');

    // Verify
    console.log('\nVerifying collections...');
    const newCollections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    for (const collection of newCollections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
    }

    console.log('\nDatabase cleaned successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanDatabase(); 