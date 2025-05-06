import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [likeLoading, setLikeLoading] = useState(false)
  const [likes, setLikes] = useState<string[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const { user, token } = useAuth()

  useEffect(() => {
    async function fetchProject() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) throw new Error('Project not found')
        const data = await res.json()
        setProject(data)
      } catch (err: any) {
        setError(err.message || 'Error fetching project')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProject()
  }, [id])

  // Set likes from project data
  useEffect(() => {
    if (project && Array.isArray(project.likes)) {
      setLikes(project.likes.map((id: any) => id.toString()))
    }
  }, [project])

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const res = await fetch(`/api/projects/${id}/comments`)
        if (!res.ok) throw new Error('Failed to fetch comments')
        const data = await res.json()
        setComments(data)
      } catch (err: any) {
        setCommentsError(err.message || 'Error fetching comments')
      } finally {
        setCommentsLoading(false)
      }
    }
    if (id) fetchComments()
  }, [id])

  const hasLiked = user && likes.includes(user.id)

  const handleLike = async () => {
    if (!user || !token || likeLoading) return
    setLikeLoading(true)
    try {
      const res = await fetch(`/api/projects/${id}/${hasLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to update like')
      const data = await res.json()
      // Optimistically update UI
      if (hasLiked) {
        setLikes((prev) => prev.filter((uid) => uid !== user.id))
      } else {
        setLikes((prev) => [...prev, user.id])
      }
    } catch (err: any) {
      alert(err.message || 'Error updating like')
    } finally {
      setLikeLoading(false)
    }
  }

  // Post comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !token) return
    setPosting(true)
    try {
      const res = await fetch(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to post comment')
      }
      
      const data = await res.json()
      setComments((prev) => [...prev, data])
      setNewComment('')
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg'
      successMessage.textContent = 'Comment posted successfully!'
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)
    } catch (err: any) {
      // Show error message
      const errorMessage = document.createElement('div')
      errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg'
      errorMessage.textContent = err.message || 'Error posting comment'
      document.body.appendChild(errorMessage)
      setTimeout(() => errorMessage.remove(), 3000)
    } finally {
      setPosting(false)
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!token) return
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    
    try {
      const res = await fetch(`/api/projects/${id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to delete comment')
      }
      
      setComments((prev) => prev.filter((c) => c._id !== commentId))
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg'
      successMessage.textContent = 'Comment deleted successfully!'
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)
    } catch (err: any) {
      // Show error message
      const errorMessage = document.createElement('div')
      errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg'
      errorMessage.textContent = err.message || 'Error deleting comment'
      document.body.appendChild(errorMessage)
      setTimeout(() => errorMessage.remove(), 3000)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading project...</div>
  }
  if (error || !project) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Project not found'}</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Project Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-primary">{project.title}</h1>
            <button
              onClick={handleLike}
              disabled={!user || likeLoading}
              className={`flex items-center gap-1 px-3 py-1 rounded-full border font-semibold shadow transition-colors ${hasLiked ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-gray-100 text-gray-500 border-gray-200'} ${likeLoading ? 'opacity-60' : 'hover:bg-pink-200 hover:text-pink-700'}`}
              title={user ? (hasLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
            >
              <svg
                className={`w-6 h-6 ${hasLiked ? 'fill-pink-500' : 'fill-none stroke-pink-400'}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M16.5 3c-1.74 0-3.41 1.01-4.5 2.09C10.91 4.01 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54a2 2 0 0 0 2.9 0C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"
                  fill={hasLiked ? 'currentColor' : 'none'}
                  stroke={hasLiked ? 'currentColor' : 'currentColor'}
                />
              </svg>
              <span>{likes.length}</span>
            </button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={project.author?.avatar || 'https://ui-avatars.com/api/?name=User'}
              alt={project.author?.name || 'User'}
              className="w-12 h-12 rounded-full border-2 border-primary shadow"
            />
            <div>
              <div className="font-semibold text-primary text-lg">{project.author?.name || 'Unknown'}</div>
              <div className="text-sm text-gray-500">{project.author?.institution || ''}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(project.tags || []).map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''}</span>
            <span>Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''}</span>
          </div>
        </div>

        {/* Project Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-primary mb-4">About</h2>
          <p className="text-gray-700 whitespace-pre-line mb-6 text-lg">{project.longDescription || project.description}</p>
          <div className="flex gap-4">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow text-white bg-primary hover:bg-primary/90"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-full text-primary bg-white hover:bg-primary/10 shadow"
              >
                Live Demo
              </a>
            )}
          </div>
          {project.images && project.images.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt={`Project image ${idx + 1}`} className="rounded-lg border" />
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Comments</h2>
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "Add a comment..." : "Sign in to comment"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                !user ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              rows={3}
              disabled={!user || posting}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className={`px-4 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow ${
                  (!user || !newComment.trim() || posting) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!user || !newComment.trim() || posting}
              >
                {posting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Posting...
                  </span>
                ) : (
                  'Post Comment'
                )}
              </button>
            </div>
          </form>
          
          {commentsLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading comments...
            </div>
          ) : commentsError ? (
            <div className="text-red-500 text-center py-8">{commentsError}</div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <svg className="w-16 h-16 text-primary/20 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-gray-500">No comments yet. Be the first to comment!</span>
            </div>
          ) : (
            <ul className="space-y-6">
              {comments.map((c) => (
                <li key={c._id || c.createdAt + c.text} className="flex gap-4 items-start group">
                  <img
                    src={c.user?.avatar || 'https://ui-avatars.com/api/?name=' + (c.user?.name || 'User')}
                    alt={c.user?.name || 'User'}
                    className="w-10 h-10 rounded-full border border-primary/30 shadow"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{c.user?.name || 'User'}</span>
                      <span className="text-xs text-gray-400">{c.user?.institution ? `@${c.user.institution}` : ''}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </span>
                      {user && c.user && c.user._id === user.id && (
                        <button
                          onClick={() => handleDeleteComment(c._id)}
                          className="ml-2 text-xs text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete comment"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="text-gray-700 mt-1 whitespace-pre-line">{c.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
} 