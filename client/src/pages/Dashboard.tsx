import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Plus } from 'lucide-react'

interface Activity {
  id: string
  type: 'like' | 'comment' | 'follow'
  project?: {
    _id: string
    title: string
  }
  user: {
    _id: string
    name: string
  }
  content?: string
  timestamp: string
}

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  timestamp: string
}

interface Stats {
  totalProjects: number
  totalLikes: number
  totalComments: number
  totalFollowers: number
}

export default function Dashboard() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<'activity' | 'notifications'>('activity')
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())

  // Fetch user's projects and stats
  const fetchProjectsAndStats = async () => {
    if (!user || !token) {
      console.error('No user or token available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Fetching projects for user:', {
        id: user.id,
        _id: user._id,
        email: user.email
      })

      // Use id consistently (it's now guaranteed to be available from the backend)
      const userId = user.id
      if (!userId) {
        console.error('No valid user ID found')
        return
      }

      // First check if the API is accessible
      const healthCheck = await fetch('/api/projects')
      if (!healthCheck.ok) {
        throw new Error('API server is not responding')
      }

      const projectsRes = await fetch(`/api/projects?author=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!projectsRes.ok) {
        const errorText = await projectsRes.text()
        console.error('Projects API error:', {
          status: projectsRes.status,
          statusText: projectsRes.statusText,
          response: errorText
        })
        throw new Error(`Failed to fetch projects: ${projectsRes.statusText}`)
      }

      const projects = await projectsRes.json()
      console.log('Fetched projects:', projects)
      
      // Set the projects state
      setProjects(projects)

      // Calculate total likes and comments
      const totalLikes = projects.reduce((sum: number, project: any) => sum + (project.likes?.length || 0), 0)
      const totalComments = projects.reduce((sum: number, project: any) => sum + (project.comments?.length || 0), 0)

      // Fetch user data
      const userRes = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!userRes.ok) {
        const errorText = await userRes.text()
        console.error('Users API error:', {
          status: userRes.status,
          statusText: userRes.statusText,
          response: errorText
        })
        throw new Error(`Failed to fetch user data: ${userRes.statusText}`)
      }

      const userData = await userRes.json()
      console.log('Fetched user data:', userData)

      // Update stats
      setStats({
        totalProjects: projects.length,
        totalLikes,
        totalComments,
        totalFollowers: userData.followers?.length || 0
      })

      // Create activities list
      const activities: Activity[] = []

      // Add project activities
      projects.forEach((project: any) => {
        // Add likes to activities
        project.likes?.forEach((like: any) => {
          activities.push({
            id: `${project._id}-like-${like._id}`,
            type: 'like',
            project: {
              _id: project._id,
              title: project.title
            },
            user: {
              _id: like._id,
              name: like.name || 'Unknown User'
            },
            timestamp: new Date(like.createdAt || Date.now()).toISOString()
          })
        })

        // Add comments to activities
        project.comments?.forEach((comment: any) => {
          activities.push({
            id: `${project._id}-comment-${comment._id}`,
            type: 'comment',
            project: {
              _id: project._id,
              title: project.title
            },
            user: {
              _id: comment.user._id,
              name: comment.user.name || 'Unknown User'
            },
            content: comment.text,
            timestamp: new Date(comment.createdAt).toISOString()
          })
        })
      })

      // Add followers to activities
      userData.followers?.forEach((follower: any) => {
        activities.push({
          id: `follow-${follower._id}`,
          type: 'follow',
          user: {
            _id: follower._id,
            name: follower.name || 'Unknown User'
          },
          timestamp: new Date().toISOString()
        })
      })

      // Sort activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(activities)

      // Create notifications list with respect to read status
      const notifications = activities.slice(0, 5).map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.type === 'like' 
          ? `${activity.user.name} liked your project "${activity.project?.title}"`
          : activity.type === 'comment'
          ? `${activity.user.name} commented on your project "${activity.project?.title}": "${activity.content}"`
          : `${activity.user.name} started following you`,
        read: readNotifications.has(activity.id),
        timestamp: activity.timestamp
      }))
      setNotifications(notifications)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Add a refresh function that can be called after creating a new project
  const refreshDashboard = () => {
    fetchProjectsAndStats()
  }

  useEffect(() => {
    if (user && token) {
      fetchProjectsAndStats()
    }
  }, [user, token])

  // Edit project handlers
  const startEdit = (project: any) => {
    setEditId(project._id)
    setEditForm({
      title: project.title,
      description: project.description,
      longDescription: project.longDescription,
      tags: (project.tags || []).join(', '),
      githubUrl: project.githubUrl || '',
      demoUrl: project.demoUrl || '',
      progress: project.progress ?? 0,
    })
    setIsModalOpen(true)
  }
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setEditForm((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }
  const closeModal = () => {
    setIsModalOpen(false)
    setEditId(null)
    setEditForm(null)
  }
  const saveEdit = async (id: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editForm,
          tags: editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          progress: Number(editForm.progress),
        }),
      })
      if (!res.ok) throw new Error('Failed to update project')
      closeModal()
      fetchProjectsAndStats()
    } catch (err: any) {
      alert(err.message || 'Error updating project')
    } finally {
      setIsSaving(false)
    }
  }
  // Delete project
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    setDeleteId(id)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to delete project')
      setProjects(prev => prev.filter(p => p._id !== id))
    } catch (err: any) {
      alert(err.message || 'Error deleting project')
    } finally {
      setDeleteId(null)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  // Update handleNotificationClick to persist read status
  const handleNotificationClick = (notification: Notification) => {
    if (!readNotifications.has(notification.id)) {
      setReadNotifications(prev => new Set([...prev, notification.id]))
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, read: true }
            : n
        )
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <span role="img" aria-label="wave">👋</span> Welcome, {user?.name || 'Student'}!
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Here's what's happening with your projects.
            </p>
          </div>
          <Link
            to="/create-project"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            <Plus className="w-5 h-5" /> Create Project
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl shadow p-6 bg-blue-100/80 text-blue-900 flex items-center">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">Total Projects</p>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
            </div>
          </div>
          <div className="rounded-xl shadow p-6 bg-green-100/80 text-green-900 flex items-center">
            <div className="p-3 rounded-full bg-green-500/20 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">Total Likes</p>
              <p className="text-2xl font-bold">{stats.totalLikes}</p>
            </div>
          </div>
          <div className="rounded-xl shadow p-6 bg-yellow-100/80 text-yellow-900 flex items-center">
            <div className="p-3 rounded-full bg-yellow-400/20 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">Total Comments</p>
              <p className="text-2xl font-bold">{stats.totalComments}</p>
            </div>
          </div>
          <div className="rounded-xl shadow p-6 bg-purple-100/80 text-purple-900 flex items-center">
            <div className="p-3 rounded-full bg-purple-500/20 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium">Followers</p>
              <p className="text-2xl font-bold">{stats.totalFollowers}</p>
            </div>
          </div>
        </div>

        {/* Activity and Notifications Tabs */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-4 px-6 text-sm font-medium relative ${
                  activeTab === 'activity'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Activity
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-6 text-sm font-medium relative ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Notifications
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-bounce">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'activity' ? (
              <div className="space-y-6">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {activity.type === 'like' && (
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                      )}
                      {activity.type === 'comment' && (
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                      )}
                      {activity.type === 'follow' && (
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.type === 'like' && (
                          <>{activity.user.name} liked your project "{activity.project?.title}"</>
                        )}
                        {activity.type === 'comment' && (
                          <>
                            {activity.user.name} commented on your project "{activity.project?.title}": "{activity.content}"
                          </>
                        )}
                        {activity.type === 'follow' && (
                          <>{activity.user.name} started following you</>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No recent activity</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start space-x-4 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-primary/5 rounded-lg p-4 hover:bg-primary/10' : 'hover:bg-gray-50 rounded-lg p-4'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{notification.message}</p>
                      <p className="text-sm text-gray-500">{formatTimestamp(notification.timestamp)}</p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {isModalOpen && editId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div 
              className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary">Edit Project</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form
                className="space-y-4"
                onSubmit={e => {
                  e.preventDefault()
                  saveEdit(editId)
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      placeholder="Project Title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
                    <input
                      type="text"
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      placeholder="Short Description"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                  <textarea
                    name="longDescription"
                    value={editForm.longDescription}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={4}
                    placeholder="Detailed Description"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={editForm.tags}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Tags (comma separated)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
                    <input
                      type="range"
                      name="progress"
                      min={0}
                      max={100}
                      value={editForm.progress}
                      onChange={handleEditChange}
                      className="w-full"
                      title="Project progress"
                      aria-label="Project progress"
                    />
                    <div className="text-sm text-gray-600 mt-1">{editForm.progress}% complete</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                    <input
                      type="url"
                      name="githubUrl"
                      value={editForm.githubUrl}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="GitHub URL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo URL</label>
                    <input
                      type="url"
                      name="demoUrl"
                      value={editForm.demoUrl}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Demo URL"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                    onClick={closeModal}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Recent Projects Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Recent Projects Added</h2>
          {loading ? (
            <div className="text-gray-500">Loading projects...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <svg className="w-16 h-16 text-primary/20 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="text-gray-500">You have not created any projects yet.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project._id} className="relative group bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 rounded-lg p-4 shadow flex flex-col gap-2 hover:scale-[1.01] transition">
                  <div 
                    onClick={() => startEdit(project)}
                    className="cursor-pointer"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs text-gray-700 font-medium">{project.progress ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress ?? 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        {project.tags && project.tags.map((tag: string) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mr-1">{tag}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                  {user && project.author._id === user.id && (
                    <button
                      onClick={() => handleDelete(project._id)}
                      disabled={deleteId === project._id}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                      title="Delete project"
                    >
                      {deleteId === project._id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 