import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/projectlink');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'sashanks732@gmail.com' });
    if (existingAdmin) {
      if (existingAdmin.isAdmin) {
        console.log('This email is already an admin user!');
      } else {
        // Update to make them admin
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('Existing user has been upgraded to admin!');
      }
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      const adminUser = new User({
        name: 'Admin',
        email: 'sashanks732@gmail.com',
        password: hashedPassword,
        institution: 'ProjectLink',
        isAdmin: true
      });

      await adminUser.save();
      console.log('\nAdmin user created successfully!');
      console.log('Email: sashanks732@gmail.com');
      console.log('Password: admin123');
    }

    // Verify
    const adminUser = await User.findOne({ email: 'sashanks732@gmail.com' });
    console.log('\nVerifying admin user:');
    console.log('- Name:', adminUser?.name);
    console.log('- Email:', adminUser?.email);
    console.log('- Is Admin:', adminUser?.isAdmin);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createAdmin(); 