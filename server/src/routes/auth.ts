import express from 'express'
import jwt from 'jsonwebtoken'
import User, { IUser } from '../models/User'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
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
      institution,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    })

    await user.save()

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      avatar: user.avatar,
    }

    res.status(201).json({ token, user: userData })
  } catch (error: any) {
    console.error('Registration error:', error)
    res.status(500).json({ message: error.message || 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      avatar: user.avatar,
    }

    res.json({ token, user: userData })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ message: error.message || 'Login failed' })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string }
    const user = await User.findById(decoded.userId)
      .select('-password')
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
      return res.status(404).json({ message: 'User not found' })
    }

    // Return user data with consistent ID field
    const userData = {
      ...user.toObject(),
      id: user._id, // Add id field for frontend consistency
      _id: user._id // Keep _id for backend consistency
    }

    res.json(userData)
  } catch (error: any) {
    console.error('Get user error:', error)
    res.status(401).json({ message: 'Invalid token' })
  }
})

export default router 