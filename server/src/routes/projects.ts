import express from 'express'
import Project from '../models/Project'
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

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, longDescription, tags, githubUrl, demoUrl, images, progress } = req.body
    const project = new Project({
      title,
      description,
      longDescription,
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
router.get('/', async (req, res) => {
  try {
    const { search, tags, author } = req.query
    const query: any = {}
    
    // Handle author filter
    if (author) {
      console.log('Author query param:', author) // Debug log
      console.log('Author type:', typeof author) // Debug log
      
      // Convert author to string and trim any whitespace
      const authorId = String(author).trim()
      
      if (!mongoose.Types.ObjectId.isValid(authorId)) {
        console.error('Invalid author ID:', authorId) // Debug log
        return res.status(400).json({ 
          message: 'Invalid author ID',
          details: {
            providedId: authorId,
            type: typeof authorId
          }
        })
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
      query.tags = { $in: tagArr.map((t: string) => t.toLowerCase()) }
    }

    console.log('Final query:', JSON.stringify(query, null, 2)) // Debug log

    const projects = await Project.find(query)
      .populate('author', 'name email institution avatar')
      .populate('likes', 'name')
      .populate('comments.user', 'name avatar institution')
      .sort({ createdAt: -1 })

    console.log('Found projects:', projects.length) // Debug log
    res.json(projects)
  } catch (error: any) {
    console.error('Error fetching projects:', error) // Debug log
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
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
    const { title, description, longDescription, tags, githubUrl, demoUrl, images, progress } = req.body
    if (title !== undefined) project.title = title
    if (description !== undefined) project.description = description
    if (longDescription !== undefined) project.longDescription = longDescription
    if (tags !== undefined) project.tags = tags
    if (githubUrl !== undefined) project.githubUrl = githubUrl
    if (demoUrl !== undefined) project.demoUrl = demoUrl
    if (images !== undefined) project.images = images
    if (progress !== undefined) project.progress = progress
    await project.save()
    await project.populate('author', 'name email institution avatar')
    res.json(project)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Like a project
router.post('/:id/like', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const userId = req.userId
    if (project.likes.includes(userId)) {
      return res.status(400).json({ message: 'You have already liked this project' })
    }
    project.likes.push(userId)
    await project.save()
    res.json({ likes: project.likes.length })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Unlike a project
router.post('/:id/unlike', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    const userId = req.userId
    project.likes = project.likes.filter((id: any) => id.toString() !== userId)
    await project.save()
    res.json({ likes: project.likes.length })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Add a comment to a project
router.post('/:id/comments', auth, async (req, res) => {
  try {
    console.log('Adding comment to project:', req.params.id)
    const { text } = req.body
    if (!text || !text.trim()) {
      console.error('Empty comment text')
      return res.status(400).json({ message: 'Comment text is required' })
    }

    const project = await Project.findById(req.params.id)
    if (!project) {
      console.error('Project not found:', req.params.id)
      return res.status(404).json({ message: 'Project not found' })
    }

    const comment = { 
      user: req.userId, 
      text: text.trim(), 
      createdAt: new Date() 
    }
    
    console.log('Adding comment:', {
      projectId: project._id,
      userId: req.userId,
      textLength: text.length
    })

    project.comments.push(comment)
    await project.save()
    
    // Populate the user data for the new comment
    await project.populate('comments.user', 'name avatar institution')
    const newComment = project.comments[project.comments.length - 1]
    
    console.log('Comment added successfully:', {
      commentId: newComment._id,
      projectId: project._id
    })

    res.status(201).json(newComment)
  } catch (error: any) {
    console.error('Error adding comment:', error)
    res.status(500).json({ 
      message: 'Error adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
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
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    console.log('Deleting comment:', {
      projectId: req.params.id,
      commentId: req.params.commentId,
      userId: req.userId
    })

    const project = await Project.findById(req.params.id)
    if (!project) {
      console.error('Project not found:', req.params.id)
      return res.status(404).json({ message: 'Project not found' })
    }

    const comment = project.comments.id(req.params.commentId)
    if (!comment) {
      console.error('Comment not found:', req.params.commentId)
      return res.status(404).json({ message: 'Comment not found' })
    }

    // Only comment author or project owner can delete
    if (
      comment.user.toString() !== req.userId &&
      project.author.toString() !== req.userId
    ) {
      console.error('Unauthorized comment deletion attempt:', {
        commentUserId: comment.user,
        projectAuthorId: project.author,
        requestUserId: req.userId
      })
      return res.status(403).json({ message: 'Not authorized to delete this comment' })
    }

    comment.remove()
    await project.save()
    
    console.log('Comment deleted successfully:', {
      commentId: req.params.commentId,
      projectId: project._id
    })

    res.json({ message: 'Comment deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ 
      message: 'Error deleting comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router 