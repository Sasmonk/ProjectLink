import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { auth } from '../middleware/auth'

const router = express.Router()

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, institution } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      institution: institution || '',
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        isAdmin: user.isAdmin
      }
    })
  } catch (error: any) {
    console.error('Error in register:', error)
    res.status(500).json({ message: error.message || 'Error registering user' })
  }
})

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        isAdmin: user.isAdmin
      }
    })
  } catch (error: any) {
    console.error('Error in login:', error)
    res.status(500).json({ message: error.message || 'Error logging in' })
  }
})

// Get current user
router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error: any) {
    console.error('Error in get current user:', error)
    res.status(500).json({ message: error.message || 'Error getting user' })
  }
})

export default router 