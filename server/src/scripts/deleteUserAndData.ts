// Usage: npx ts-node src/scripts/deleteUserAndData.ts <userEmail or userId>
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User'
import Project from '../models/Project'

dotenv.config({ path: '../.env' })

const MONGO_URI = process.env.MONGO_URI || ''

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: npx ts-node src/scripts/deleteUserAndData.ts <userEmail or userId>')
    process.exit(1)
  }
  await mongoose.connect(MONGO_URI)
  let user
  if (arg.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(arg)
  } else {
    user = await User.findOne({ email: arg })
  }
  if (!user) {
    console.error('User not found')
    process.exit(1)
  }
  const userId = user._id
  console.log(`Deleting user: ${user.email} (${userId})`)
  // Delete all projects by user
  const deletedProjects = await Project.deleteMany({ author: userId })
  // Remove user's comments and likes from all projects
  const updatedProjects = await Project.updateMany(
    {},
    {
      $pull: {
        comments: { user: userId },
        likes: userId,
      },
    }
  )
  // Delete user
  await User.findByIdAndDelete(userId)
  console.log(`Deleted user, ${deletedProjects.deletedCount} projects, cleaned up comments/likes in ${updatedProjects.modifiedCount} projects.`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}) 