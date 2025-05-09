import mongoose from 'mongoose';

async function checkMongoStatus() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017');
    console.log('Successfully connected to MongoDB!');
    
    // Get database info
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('\nAvailable databases:');
    for (const db of databases) {
      console.log(`- ${db.name}`);
    }
    
  } catch (error) {
    console.error('\nError connecting to MongoDB:', error);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure MongoDB is installed correctly');
    console.log('2. Check if MongoDB service is running');
    console.log('3. Try reinstalling MongoDB');
  } finally {
    await mongoose.disconnect();
  }
}

checkMongoStatus(); 