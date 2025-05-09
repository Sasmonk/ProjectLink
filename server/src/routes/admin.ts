import express from 'express'
import { User } from '../models/User'
import Project from '../models/Project'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'

const router = express.Router()

// Admin middleware
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { user: { id: string, isAdmin: boolean } }
    const userId = decoded.user && decoded.user.id
    if (!userId) return res.status(401).json({ message: 'Invalid token' })
    
    // Check if user is admin directly from token
    if (!decoded.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized as admin' })
    }
    
    req.userId = userId
    next()
  } catch (err) {
    console.error('Token verification error:', err)
    res.status(401).json({ message: 'Invalid token' })
  }
}

// Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [users, projects] = await Promise.all([
      User.find(),
      Project.find().populate('author', 'name email')
    ])

    const totalUsers = Array.isArray(users) ? users.length : 0
    const totalProjects = Array.isArray(projects) ? projects.length : 0
    const totalLikes = Array.isArray(projects)
      ? projects.reduce((acc, proj) => acc + (Array.isArray(proj.likes) ? proj.likes.length : 0), 0)
      : 0
    const totalComments = Array.isArray(projects)
      ? projects.reduce((acc, proj) => acc + (Array.isArray(proj.comments) ? proj.comments.length : 0), 0)
      : 0
    // Patch: handle missing/null authors and emails
    const activeUsers = Array.isArray(projects)
      ? new Set(
          projects
            .map(p => {
              if (p && p.author && typeof p.author === 'object' && 'email' in p.author) {
                return (p.author as { email?: string }).email || null;
              }
              return null;
            })
            .filter(Boolean)
        ).size
      : 0

    res.json({
      totalUsers,
      totalProjects,
      totalLikes,
      totalComments,
      activeUsers,
    })
  } catch (error: any) {
    console.error('Error in /api/admin/stats:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
})

// Delete user and all their data
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }
    const userId = new Types.ObjectId(req.params.id)
    
    // Delete all user's projects
    await Project.deleteMany({ author: userId })
    
    // Remove user's likes from other projects
    await Project.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    )
    
    // Remove user's comments from other projects
    await Project.updateMany(
      { 'comments.user': userId },
      { $pull: { comments: { user: userId } } }
    )
    
    // Delete the user
    await User.findByIdAndDelete(userId)
    
    res.json({ message: 'User and associated data deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get all users with their activity
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })

    // Defensive: ensure all users are valid objects
    const safeUsers = users
      .filter(Boolean)
      .map(user => ({
        _id: user._id,
        name: user.name || '',
        email: user.email || '',
        institution: user.institution || '',
        avatar: user.avatar || '',
        isAdmin: !!user.isAdmin,
        banned: !!user.banned,
        createdAt: (user as any).createdAt,
        // add any other fields you want to expose
      }))

    res.json(safeUsers)
  } catch (error: any) {
    console.error('Error in /api/admin/users:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
})

// Get all projects with detailed info
router.get('/projects', adminAuth, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('author', 'name email')
      .populate('likes', 'name email')
      .populate('comments.user', 'name email')
      .sort({ createdAt: -1 })

    res.json(projects)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Patch route for toggling user admin status
router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { isAdmin } = req.body;
    if (typeof isAdmin !== 'boolean') return res.status(400).json({ message: 'isAdmin must be boolean' });
    const user = await User.findByIdAndUpdate(req.params.id, { isAdmin }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User role updated', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Patch route for banning/unbanning users
router.patch('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const { banned } = req.body;
    if (typeof banned !== 'boolean') return res.status(400).json({ message: 'banned must be boolean' });
    const user = await User.findByIdAndUpdate(req.params.id, { banned }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User ban status updated', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router 