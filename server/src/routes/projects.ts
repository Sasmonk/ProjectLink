import express, { Request, Response } from 'express'
import Project from '../models/Project'
import { User } from '../models/User'
import jwt from 'jsonwebtoken'
import mongoose, { Types } from 'mongoose'
import { IComment, IProject } from '../types/express'
import Notification from '../models/Notification'
import sanitizeHtml from 'sanitize-html'

const router = express.Router()

// Auth middleware
function auth(req: Request, res: Response, next: express.NextFunction) {
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

// In-memory cache for view tracking (userId or IP -> { projectId: lastViewTimestamp })
const projectViewCache: Record<string, Record<string, number>> = {}

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, longDescription, tags, githubUrl, demoUrl, images, progress } = req.body
    const project = new Project({
      title: sanitizeHtml(title),
      description: sanitizeHtml(description),
      longDescription: sanitizeHtml(longDescription),
      tags,
      githubUrl,
      demoUrl,
      images,
      author: req.userId,
      progress: typeof progress === 'number' ? progress : 0,
    })
    await project.save()
    await project.populate('author', 'name email institution avatar')
    res.status(201).json(project)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete project (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (project.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    await project.deleteOne()
    res.json({ message: 'Project deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get all projects (with search/filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. Current state:', mongoose.connection.readyState)
      return res.status(500).json({ message: 'Database connection error' })
    }

    const { search, tags, author } = req.query
    const query: any = {}
    
    if (author) {
      const authorId = String(author).trim()
      if (!mongoose.Types.ObjectId.isValid(authorId)) {
        return res.status(400).json({ message: 'Invalid author ID' })
      }
      query.author = new mongoose.Types.ObjectId(authorId)
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { longDescription: { $regex: search, $options: 'i' } },
      ]
    }
    if (tags) {
      const tagArr = Array.isArray(tags) ? tags : String(tags).split(',')
      query.tags = { $in: tagArr.map((t: any) => String(t).toLowerCase()) }
    }

    const projects = await Project.find(query)
      .populate('author', 'name email institution avatar')
      .populate('likes', 'name')
      .populate('comments.user', 'name avatar institution')
      .sort({ createdAt: -1 })

    res.json(projects)
  } catch (error: any) {
    console.error('Error in GET /projects:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
})

// Get one project
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid project ID' })
    }
    const project = await Project.findById(req.params.id)
      .populate('author', 'name email institution avatar')
      .populate('collaborators', 'name username avatar email institution')
    if (!project) return res.status(404).json({ message: 'Project not found' })
    res.json(project)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add update project endpoint (owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (project.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    const { title, description, longDescription, tags, githubUrl, demoUrl, images, progress, collaborators } = req.body
    if (title !== undefined) project.title = sanitizeHtml(title)
    if (description !== undefined) project.description = sanitizeHtml(description)
    if (longDescription !== undefined) project.longDescription = sanitizeHtml(longDescription)
    if (tags !== undefined) project.tags = tags
    if (githubUrl !== undefined) project.githubUrl = githubUrl
    if (demoUrl !== undefined) project.demoUrl = demoUrl
    if (images !== undefined) project.images = images
    if (progress !== undefined) {
      project.progress = progress
      // Automatically update status based on progress
      if (progress >= 100) {
        project.status = 'completed'
      } else if (progress === 0) {
        project.status = 'active'
      } else if (progress < 100) {
        project.status = 'active'
      }
    }
    if (collaborators !== undefined) project.collaborators = collaborators
    await project.save()
    await project.populate('author', 'name email institution avatar')
    res.json(project)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Like a project
router.post('/:id/like', auth, async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id).populate('author', 'name _id')
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const userId = new Types.ObjectId(req.userId)
    if (project.likes.includes(userId)) {
      return res.status(400).json({ message: 'You have already liked this project' })
    }
    project.likes.push(userId)
    await project.save()
    // Create notification for author (if not self)
    if (project.author && project.author._id.toString() !== req.userId) {
      const liker = await User.findById(req.userId)
      await Notification.create({
        user: project.author._id,
        type: 'like',
        message: `${liker?.name || 'Someone'} liked your project "${project.title}"`,
        read: false
      })
    }
    res.json({ likes: project.likes.length })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Unlike a project
router.post('/:id/unlike', auth, async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const userId = new Types.ObjectId(req.userId)
    project.likes = project.likes.filter((id: Types.ObjectId) => id.toString() !== userId.toString())
    await project.save()
    res.json({ likes: project.likes.length })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add a comment to a project
router.post('/:id/comments', auth, async (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' })
    }

    const project = await Project.findById(req.params.id).populate('author', 'name _id')
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const comment = {
      user: new Types.ObjectId(req.userId),
      text: sanitizeHtml(text.trim()),
      createdAt: new Date()
    }

    project.comments.push(comment)
    await project.save()
    await project.populate('comments.user', 'name avatar institution')
    const newComment = project.comments[project.comments.length - 1]
    // Create notification for author (if not self)
    if (project.author && project.author._id.toString() !== req.userId) {
      const commenter = await User.findById(req.userId)
      await Notification.create({
        user: project.author._id,
        type: 'comment',
        message: `${commenter?.name || 'Someone'} commented on your project "${project.title}": "${sanitizeHtml(text.trim())}"`,
        read: false
      })
    }
    res.status(201).json(newComment)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get all comments for a project
router.get('/:id/comments', async (req, res) => {
  try {
    console.log('Fetching comments for project:', req.params.id)
    
    const project = await Project.findById(req.params.id)
      .populate('comments.user', 'name avatar institution')
    
    if (!project) {
      console.error('Project not found:', req.params.id)
      return res.status(404).json({ message: 'Project not found' })
    }

    console.log('Found comments:', project.comments.length)
    res.json(project.comments)
  } catch (error: any) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ 
      message: 'Error fetching comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Delete a comment from a project
router.delete('/:id/comments/:commentId', auth, async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const comment = project.comments.find(c => c._id?.toString() === req.params.commentId)
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    // Only comment author or project owner can delete
    if (
      comment.user.toString() !== req.userId &&
      project.author.toString() !== req.userId
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' })
    }

    project.comments = project.comments.filter(c => c._id?.toString() !== req.params.commentId)
    await project.save()

    res.json({ message: 'Comment deleted successfully' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Increment project views
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    // Identify user or IP
    let viewerKey = ''
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Try to get userId from JWT
      try {
        const token = req.headers.authorization.split(' ')[1]
        const payload: any = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        viewerKey = payload.id || payload._id || ''
      } catch {}
    }
    if (!viewerKey) {
      // Fallback to IP address
      viewerKey = req.ip || req.connection.remoteAddress || 'unknown'
    }

    // Only count a view if this user/IP hasn't viewed this project in the last 24 hours
    const now = Date.now()
    if (!projectViewCache[viewerKey]) projectViewCache[viewerKey] = {}
    const lastView = projectViewCache[viewerKey][project._id.toString()] || 0
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    if (now - lastView > TWENTY_FOUR_HOURS) {
      project.views += 1
      await project.save()
      projectViewCache[viewerKey][project._id.toString()] = now
    }
    res.json({ views: project.views })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Bookmark/Unbookmark project
router.post('/:id/bookmark', auth, async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const userId = new Types.ObjectId(req.userId)
    
    const isBookmarked = project.bookmarks.includes(userId)
    if (isBookmarked) {
      project.bookmarks = project.bookmarks.filter(id => id.toString() !== userId.toString())
    } else {
      project.bookmarks.push(userId)
    }
    
    await project.save()
    res.json({ bookmarked: !isBookmarked })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update project status
router.patch('/:id/status', auth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (!['active', 'completed', 'on-hold'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    
    // Only author can update status
    if (project.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    project.status = status
    await project.save()
    res.json({ status: project.status })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add/Remove collaborator
router.post('/:id/collaborators', auth, async (req: Request, res: Response) => {
  try {
    const { userId, action } = req.body
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' })
    }
    
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    
    // Only author can manage collaborators
    if (project.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    const collaboratorId = new Types.ObjectId(userId)
    if (action === 'add') {
      if (!project.collaborators.includes(collaboratorId)) {
        project.collaborators.push(collaboratorId)
      }
    } else {
      project.collaborators = project.collaborators.filter(id => id.toString() !== userId)
    }
    
    await project.save()
    res.json({ collaborators: project.collaborators })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router 