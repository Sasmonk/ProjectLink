// import mongoose from 'mongoose'
// import dotenv from 'dotenv'
// import Project from '../models/Project'
// import User from '../models/User'

// dotenv.config()

// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/projectlink'

// async function seed() {
//   await mongoose.connect(MONGO_URI)
//   console.log('Connected to MongoDB')

//   // Create a test user if not exists
//   let user = await User.findOne({ email: 'demo.user@example.com' })
//   if (!user) {
//     user = await User.create({
//       name: 'Demo User',
//       email: 'demo.user@example.com',
//       password: 'password123', // Not used for login, just for reference
//       institution: 'Demo University',
//       avatar: 'https://ui-avatars.com/api/?name=Demo+User',
//     })
//     console.log('Created demo user')
//   }

//   // Demo projects
//   const demoProjects = [ ... ]

//   await Project.deleteMany({ author: user._id })
//   await Project.insertMany(demoProjects)
//   console.log('Inserted demo projects!')

//   await mongoose.disconnect()
//   console.log('Done.')
// }

// seed().catch(err => {
//   console.error(err)
//   process.exit(1)
// })

// Demo data seeding is currently disabled for testing purposes. 