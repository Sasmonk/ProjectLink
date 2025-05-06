import express from 'express'
import User from '../models/User'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const router = express.Router()

// Auth middleware
function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching user with ID:', req.params.id)
    console.log('Request headers:', req.headers)

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('Invalid user ID format:', req.params.id)
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const user = await User.findById(req.params.id)
      .select('-password') // Exclude password
      .populate({
        path: 'followers',
        select: 'name email avatar institution',
        model: 'User'
      })
      .populate({
        path: 'following',
        select: 'name email avatar institution',
        model: 'User'
      })

    if (!user) {
      console.error('User not found with ID:', req.params.id)
      return res.status(404).json({ message: 'User not found' })
    }

    // Ensure consistent ID field
    const userData = {
      ...user.toObject(),
      id: user._id, // Add id field for frontend consistency
      _id: user._id // Keep _id for backend consistency
    }

    console.log('Found user:', {
      id: userData.id,
      name: userData.name,
      followersCount: userData.followers?.length || 0,
      followingCount: userData.following?.length || 0
    })

    res.json(userData)
  } catch (error: any) {
    console.error('Error in GET /:id:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      message: 'Error fetching user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update current user profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, institution, bio, avatar, skills } = req.body
    const update: any = {}
    if (name !== undefined) update.name = name
    if (institution !== undefined) update.institution = institution
    if (bio !== undefined) update.bio = bio
    if (avatar !== undefined) update.avatar = avatar
    if (skills !== undefined) update.skills = skills
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!user) return res.status(404).json({ message: 'User not found' })
    // Return updated user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      avatar: user.avatar,
      bio: user.bio,
      skills: user.skills,
    }
    res.json(userData)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Follow a user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (req.userId === req.params.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' })
    }

    const userToFollow = await User.findById(req.params.id)
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' })
    }

    const currentUser = await User.findById(req.userId)
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' })
    }

    // Check if already following
    if (userToFollow.followers.includes(req.userId)) {
      return res.status(400).json({ message: 'Already following' })
    }

    // Add to followers and following
    userToFollow.followers.push(req.userId)
    currentUser.following.push(req.params.id)

    await Promise.all([userToFollow.save(), currentUser.save()])

    res.json({ 
      followers: userToFollow.followers.length,
      following: currentUser.following.length
    })
  } catch (error: any) {
    console.error('Error in follow:', error)
    res.status(500).json({ message: error.message })
  }
})

// Unfollow a user
router.post('/:id/unfollow', auth, async (req, res) => {
  try {
    if (req.userId === req.params.id) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' })
    }

    const userToUnfollow = await User.findById(req.params.id)
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' })
    }

    const currentUser = await User.findById(req.userId)
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' })
    }

    // Remove from followers and following
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id: any) => id.toString() !== req.userId
    )
    currentUser.following = currentUser.following.filter(
      (id: any) => id.toString() !== req.params.id
    )

    await Promise.all([userToUnfollow.save(), currentUser.save()])

    res.json({ 
      followers: userToUnfollow.followers.length,
      following: currentUser.following.length
    })
  } catch (error: any) {
    console.error('Error in unfollow:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router 