import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, UserCheck } from 'lucide-react'

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

export default function ProjectDetail() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [likes, setLikes] = useState<string[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [views, setViews] = useState(0)
  const [collabFollowing, setCollabFollowing] = useState<{[id: string]: boolean}>({})

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_URL}/projects/${id}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const data = await res.json()
      setProject(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
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
        const res = await fetch(`${API_URL}/projects/${id}/comments`)
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

  // Track view
  useEffect(() => {
    if (id) {
      fetch(`${API_URL}/projects/${id}/view`, { method: 'POST' })
        .then(res => res.json())
        .then(data => setViews(data.views))
        .catch(console.error)
    }
  }, [id])

  // Fetch following status for collaborators
  useEffect(() => {
    if (user && project && project.collaborators) {
      const followingMap: {[id: string]: boolean} = {}
      project.collaborators.forEach((collab: any) => {
        if (collab && collab._id && user.following && Array.isArray(user.following)) {
          followingMap[collab._id] = user.following.includes(collab._id)
        }
      })
      setCollabFollowing(followingMap)
    }
  }, [user, project])

  const handleLike = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/projects/${id}/${project?.likes?.includes(user?.id) ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to update like')
      fetchProject()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBookmark = async () => {
    if (!token || !user) return
    try {
      const res = await fetch(`${API_URL}/projects/${id}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to update bookmark')
      const data = await res.json()
      setIsBookmarked(data.bookmarked)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Post comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !token) return
    setPosting(true)
    try {
      const res = await fetch(`${API_URL}/projects/${id}/comments`, {
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
      const res = await fetch(`${API_URL}/projects/${id}/comments/${commentId}`, {
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

  // Follow/unfollow handlers for collaborators
  const handleFollowCollab = async (collabId: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/users/${collabId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setCollabFollowing(prev => ({ ...prev, [collabId]: true }))
    } catch {}
  }
  const handleUnfollowCollab = async (collabId: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/users/${collabId}/unfollow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setCollabFollowing(prev => ({ ...prev, [collabId]: false }))
    } catch {}
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading project...</div>
  }
  if (error || !project) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Project not found'}</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-12">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-10">
        {/* Project Info Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex-1 min-w-0 mb-8 lg:mb-0">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary mb-2 tracking-tight leading-tight">{project.title}</h1>
            <div className="flex flex-wrap gap-4 items-center mb-2">
              {/* Status Badge */}
              {project?.status && (
                <span 
                  className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm border transition-all duration-200
                    ${project.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                  title={
                    project.status === 'active' ? 'Project is currently in development' :
                    project.status === 'completed' ? 'Project has been completed' :
                    'Project development is temporarily paused'
                  }
                >
                  {project.status === 'active' ? '🚀 Active' :
                    project.status === 'completed' ? '✅ Completed' :
                    '⏸️ On Hold'}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 border border-gray-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {views} views
              </span>
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 border border-gray-200">
                Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''}
              </span>
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 border border-gray-200">
                Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''}
              </span>
            </div>
            {/* Collaborators Inline Section (professional, minimal) */}
            <div className="flex items-center gap-2 mb-2">
              {project.collaborators && project.collaborators.filter(Boolean).length > 0 && (
                <>
                  <span className="text-sm text-primary font-semibold mr-2">Collaborators:</span>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1 gap-1">
                    {project.collaborators.filter(Boolean).slice(0, 5).map((collab: any, idx: number) => {
                      if (!collab) return null;
                      const displayName = collab.username || collab.name || 'Collaborator';
                      const avatarUrl = collab.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
                      return (
                        <div key={`collab-inline-${collab._id || idx}`} className="relative group flex flex-col items-center">
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-9 h-9 rounded-full border border-gray-200 bg-white object-cover"
                            style={{ zIndex: 10 }}
                          />
                          {/* Minimal Tooltip */}
                          <div className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-gray-800 text-white text-xs font-medium px-3 py-1 rounded shadow opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap transition-opacity duration-150">
                            {displayName}
                          </div>
                          {/* Follow/Unfollow Button (only on hover) */}
                          {user && collab._id !== user._id && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-12 opacity-0 group-hover:opacity-100 pointer-events-auto z-30 transition-opacity duration-150">
                              {collabFollowing[collab._id] ? (
                                <button
                                  className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs flex items-center gap-1 hover:bg-gray-300 transition"
                                  onClick={() => handleUnfollowCollab(collab._id)}
                                  title="Unfollow"
                                >
                                  <UserCheck className="w-3 h-3" /> Unfollow
                                </button>
                              ) : (
                                <button
                                  className="px-2 py-0.5 bg-primary text-white rounded-full text-xs flex items-center gap-1 hover:bg-primary/90 transition"
                                  onClick={() => handleFollowCollab(collab._id)}
                                  title="Follow"
                                >
                                  <UserPlus className="w-3 h-3" /> Follow
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {project.collaborators.filter(Boolean).length > 5 && (
                      <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-semibold border border-gray-300" title={`${project.collaborators.filter(Boolean).length - 5} more`}>+{project.collaborators.filter(Boolean).length - 5}</span>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {(project.tags || []).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20 font-semibold shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
            {/* Like & Bookmark Buttons */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleLike}
                disabled={!user || !token}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold shadow-sm border transition text-base focus:outline-none focus:ring-2 focus:ring-primary/30
                  ${user && likes.includes(user.id) ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-pink-50 hover:text-pink-500'}`}
                title={user ? (likes.includes(user.id) ? 'Unlike' : 'Like') : 'Sign in to like'}
              >
                <svg className="w-5 h-5" fill={user && likes.includes(user.id) ? '#ec4899' : 'none'} stroke={user && likes.includes(user.id) ? '#ec4899' : 'currentColor'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <span>{likes.length}</span>
              </button>
              <button
                onClick={handleBookmark}
                disabled={!user || !token}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold shadow-sm border transition text-base focus:outline-none focus:ring-2 focus:ring-primary/30
                  ${isBookmarked ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-yellow-50 hover:text-yellow-600'}`}
                title={user ? (isBookmarked ? 'Remove bookmark' : 'Bookmark') : 'Sign in to bookmark'}
              >
                <svg className="w-5 h-5" fill={isBookmarked ? '#facc15' : 'none'} stroke={isBookmarked ? '#facc15' : 'currentColor'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            </div>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 font-semibold">Progress</span>
                <span className="text-xs text-gray-700 font-bold">{project.progress ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300 bg-primary"
                  style={{ width: `${project.progress ?? 0}%` }}
                ></div>
              </div>
              {project.progress >= 100 && (
                <div className="mt-2 flex items-center gap-2 text-green-700 font-semibold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Project completed!
                </div>
              )}
            </div>
            {/* Project Description */}
            <p className="text-gray-700 whitespace-pre-line mb-8 text-lg leading-relaxed border-l-4 border-primary/20 pl-4 bg-primary/5 rounded-lg py-4">
              {project.longDescription || project.description}
            </p>
            {/* Links */}
            <div className="flex gap-4 mb-4">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-full shadow text-white bg-primary hover:bg-primary/90 transition"
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
                  className="inline-flex items-center px-4 py-2 border border-primary text-sm font-semibold rounded-full text-primary bg-white hover:bg-primary/10 shadow transition"
                >
                  Live Demo
                </a>
              )}
            </div>
            {/* Images */}
            {project.images && project.images.length > 0 && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {project.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt={`Project image ${idx + 1}`} className="rounded-xl border shadow hover:scale-105 transition-transform duration-200 cursor-pointer" />
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Comments Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex-1 min-w-0 max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold text-primary mb-8">Comments</h2>
          <form onSubmit={handleSubmitComment} className="mb-8 sticky top-0 z-10 bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "Add a comment..." : "Sign in to comment"}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base shadow-sm transition ${!user ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              rows={3}
              disabled={!user || posting}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-7 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow transition disabled:opacity-50 disabled:cursor-not-allowed`}
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
                <li key={c._id || c.createdAt + c.text} className="flex gap-4 items-start group bg-gray-50 rounded-2xl p-5 shadow border border-gray-100">
                  <img
                    src={c.user?.avatar || 'https://ui-avatars.com/api/?name=' + (c.user?.name || c.user?.username || 'User')}
                    alt={c.user?.name || c.user?.username || 'User'}
                    className="w-10 h-10 rounded-full border border-primary/30 shadow"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary text-base">{c.user?.name || c.user?.username || 'User'}</span>
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
                    <div className="text-gray-700 mt-1 whitespace-pre-line text-base">{c.text}</div>
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