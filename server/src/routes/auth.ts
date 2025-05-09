import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'

const router = express.Router()

// Auth middleware
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { user: { id: string, isAdmin: boolean } }
    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ message: 'Invalid token' })
    }
    req.user = decoded.user
    next()
  } catch (err) {
    console.error('Token verification error:', err)
    res.status(401).json({ message: 'Invalid token' })
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, institution } = req.body

    // Check if user already exists
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      institution: institution || '',
    })

    // Hash password
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    // Save user
    await user.save()

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
      },
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err
        res.json({ token })
      }
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })
    if (user.banned) return res.status(403).json({ message: 'Account has been banned' })

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' })

    const token = jwt.sign(
      { user: { id: user._id, isAdmin: user.isAdmin } },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        avatar: user.avatar,
        isAdmin: user.isAdmin
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router 