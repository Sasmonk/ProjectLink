import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Project from '../models/Project'
import User from '../models/User'

dotenv.config()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/projectlink'

async function deleteDemoData() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  // Find the demo user
  const user = await User.findOne({ email: 'demo.user@example.com' })
  if (!user) {
    console.log('Demo user not found. Nothing to delete.')
    await mongoose.disconnect()
    return
  }

  // Delete all projects by the demo user
  const projectResult = await Project.deleteMany({ author: user._id })
  console.log(`Deleted ${projectResult.deletedCount} demo projects.`)

  // Delete the demo user
  const userResult = await User.deleteOne({ _id: user._id })
  console.log(`Deleted demo user: ${user.email}`)

  await mongoose.disconnect()
  console.log('Done.')
}

deleteDemoData().catch(err => {
  console.error(err)
  process.exit(1)
}) 