import express, { Request, Response } from 'express'
import { User } from '../models/User'
import jwt from 'jsonwebtoken'
import mongoose, { Types } from 'mongoose'
import { IUser } from '../types/express'
import Project from '../models/Project'
import Notification from '../models/Notification'

const router = express.Router()

// Auth middleware
function auth(req: Request, res: Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { user: { id: string } }
    if (!decoded.user || !decoded.user.id || !mongoose.Types.ObjectId.isValid(decoded.user.id)) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    req.userId = decoded.user.id
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// Get notifications for the authenticated user
router.get('/notifications', auth, async (req: Request, res: Response) => {
  try {
    if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
    res.json(notifications)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get user profile
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update user profile
router.put('/profile', auth, async (req: Request, res: Response) => {
  try {
    const { name, institution, avatar, bio, skills } = req.body
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    if (name) user.name = name
    if (institution) user.institution = institution
    if (avatar) user.avatar = avatar
    if (bio) user.bio = bio
    if (skills) user.skills = skills
    
    await user.save()
    res.json(user)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// --- User search endpoint for collaborators ---
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Query parameter is required' })
    }

    const searchQuery = q.trim()
    if (searchQuery.length < 2) {
      return res.json([]) // Return empty array for short queries
    }

    const users = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }).select('name email avatar institution')
    
    res.json(users)
  } catch (error: any) {
    console.error('Search error:', error)
    res.status(500).json({ message: error.message || 'Search failed' })
  }
})

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = await User.findById(req.params.id).select('-password')
    if (!user || !user.email) return res.status(404).json({ message: 'User not found' })
    // Ensure followers and following are always arrays of string IDs
    const userObj = user.toObject()
    userObj.followers = (userObj.followers || []).map((id: any) => id.toString())
    userObj.following = (userObj.following || []).map((id: any) => id.toString())
    res.json(userObj)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Follow user
router.post('/:id/follow', auth, async (req: Request, res: Response) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' })
    }
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    const currentUser = await User.findById(req.userId)
    if (!currentUser) return res.status(404).json({ message: 'Current user not found' })
    
    const targetUserId = new Types.ObjectId(req.params.id)
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ message: 'You are already following this user' })
    }
    
    currentUser.following.push(targetUserId)
    user.followers.push(new Types.ObjectId(req.userId))
    
    await Promise.all([currentUser.save(), user.save()])
    await Notification.create({
      user: user._id,
      type: 'follow',
      message: `${currentUser.name} started following you`,
      read: false
    })
    res.json({ message: 'User followed successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Unfollow user
router.post('/:id/unfollow', auth, async (req: Request, res: Response) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' })
    }
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    const currentUser = await User.findById(req.userId)
    if (!currentUser) return res.status(404).json({ message: 'Current user not found' })
    
    const targetUserId = new Types.ObjectId(req.params.id)
    currentUser.following = currentUser.following.filter(
      (id: Types.ObjectId) => id.toString() !== targetUserId.toString()
    )
    user.followers = user.followers.filter(
      (id: Types.ObjectId) => id.toString() !== req.userId
    )
    
    await Promise.all([currentUser.save(), user.save()])
    res.json({ message: 'User unfollowed successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// --- User bookmarks endpoint ---
router.get('/:id/bookmarks', async (req, res) => {
  try {
    const userId = req.params.id
    if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' })
    const projects = await Project.find({ bookmarks: userId })
      .populate('author', 'name email institution avatar')
    res.json(projects)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router 