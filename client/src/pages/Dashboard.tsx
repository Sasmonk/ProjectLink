import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Plus, UserPlus, Heart, MessageCircle, Bell } from 'lucide-react'
import { exportCSV } from '../utils/exportCSV'

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
  timestamp?: string
  _id?: string
  createdAt?: string
}

interface Stats {
  totalProjects: number
  totalLikes: number
  totalComments: number
  totalFollowers: number
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

const Dashboard = () => {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
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
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    // Optionally, persist in localStorage
    const saved = localStorage.getItem('readNotifications')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const notificationsRef = useRef<Notification[]>([])
  const [activeProjectTab, setActiveProjectTab] = useState<'recent' | 'bookmarked'>('recent')
  const [bookmarkedProjects, setBookmarkedProjects] = useState<any[]>([])
  const [collabSearch, setCollabSearch] = useState('')
  const [collabResults, setCollabResults] = useState<any[]>([])
  const [collabLoading, setCollabLoading] = useState(false)

  // Persist readNotifications in localStorage
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(readNotifications)))
  }, [readNotifications])

  // When notifications are set, update their read status based on readNotifications
  useEffect(() => {
    if (notifications.length > 0) {
      notificationsRef.current = notifications.map(n => ({ ...n, read: readNotifications.has(n.id) }))
    }
  }, [notifications, readNotifications])

  // Fetch user's projects and stats
  const fetchProjectsAndStats = async () => {
    if (!user || !token) {
      navigate('/login')
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
      const healthCheck = await fetch(`${API_URL}/projects`)
      if (!healthCheck.ok) {
        throw new Error('API server is not responding')
      }

      const projectsRes = await fetch(`${API_URL}/projects?author=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (projectsRes.status === 401) {
        logout && logout()
        navigate('/login')
        return
      }

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
      const userRes = await fetch(`${API_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (userRes.status === 401) {
        logout && logout()
        navigate('/login')
        return
      }

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

      // Helper to group and deduplicate notifications
      function groupAndDeduplicateNotifications(activities: Activity[]): Notification[] {
        const seen = new Set<string>()
        const grouped: Notification[] = []
        for (const activity of activities) {
          // Group by type+project+user+content (for comments)
          const key = `${activity.type}-${activity.project?._id || ''}-${activity.user._id}-${activity.content || ''}`
          if (!seen.has(key)) {
            seen.add(key)
            grouped.push({
              id: activity.id,
              type: activity.type,
              message: activity.type === 'like'
                ? `${activity.user.name} liked your project "${activity.project?.title}"`
                : activity.type === 'comment'
                ? `${activity.user.name} commented on your project "${activity.project?.title}": "${activity.content}"`
                : `${activity.user.name} started following you`,
              read: readNotifications.has(activity.id),
              timestamp: activity.timestamp
            })
          }
        }
        // Sort by timestamp desc
        grouped.sort(
          (a, b) =>
            new Date(String(b.timestamp ?? b.createdAt ?? '')).getTime() -
            new Date(String(a.timestamp ?? a.createdAt ?? '')).getTime()
        )
        return grouped
      }

      // Replace the notifications logic:
      const dedupedNotifications = groupAndDeduplicateNotifications(activities)
      setNotifications(dedupedNotifications)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load your dashboard. Please try logging in again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    if (!token) {
      navigate('/login')
      return
    }
    try {
      const res = await fetch(`${API_URL}/users/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) {
        logout && logout()
        navigate('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      setError('Failed to load notifications. Please try logging in again.')
    }
  }

  useEffect(() => {
    if (user && token) {
      fetchProjectsAndStats()
      fetchBookmarkedProjects()
      fetchNotifications()
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
      status: project.status || 'active',
      collaborators: project.collaborators || []
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
  const handleSave = async () => {
    if (!editId || !token) return
    setIsSaving(true)
    try {
      const formData = {
        ...editForm,
        tags: editForm.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        collaborators: editForm.collaborators.map((c: any) => c._id)
      }

      const res = await fetch(`${API_URL}/projects/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Failed to update project')
      await fetchProjectsAndStats()
      setIsModalOpen(false)
      setEditId(null)
      setEditForm(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }
  // Delete project
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    setDeleteId(id)
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
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

  // Fetch bookmarked projects
  const fetchBookmarkedProjects = async () => {
    if (!user || !token) return
    const res = await fetch(`${API_URL}/users/${user.id}/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      setBookmarkedProjects(await res.json())
    }
  }

  // Remove bookmark handler
  const handleRemoveBookmark = async (projectId: string) => {
    if (!token) return
    const res = await fetch(`${API_URL}/projects/${projectId}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      setBookmarkedProjects(prev => prev.filter(p => p._id !== projectId))
    }
  }

  // Search for users to add as collaborators
  const handleCollabSearch = async (q: string) => {
    setCollabSearch(q)
    if (!q.trim() || q.trim().length < 2) {
      setCollabResults([])
      return
    }
    setCollabLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        throw new Error('Search failed')
      }
      const results = await res.json()
      setCollabResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setCollabResults([])
    } finally {
      setCollabLoading(false)
    }
  }

  // Add collaborator
  const handleAddCollaborator = (userToAdd: any) => {
    if (!userToAdd || !userToAdd._id) return;
    if (user && (user.id === userToAdd._id || user._id === userToAdd._id)) return; // Prevent adding yourself
    if (editForm.collaborators && editForm.collaborators.filter(Boolean).some((c: any) => c && c._id === userToAdd._id)) return;
    setEditForm({
      ...editForm,
      collaborators: [...(editForm.collaborators || []), userToAdd]
    })
    setCollabSearch(''); // Clear search field after adding
    setCollabResults([]); // Optionally clear results
  }

  // Remove collaborator
  const handleRemoveCollaborator = (userId: string) => {
    setEditForm({
      ...editForm,
      collaborators: (editForm.collaborators || []).filter((c: any) => c && c._id !== userId)
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-lg font-semibold">
        {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary flex items-center gap-2 mb-2">
              <span role="img" aria-label="wave">👋</span> Welcome, {user?.name || 'Student'}!
            </h1>
            <p className="text-lg text-gray-700">
              Here's what's happening with your projects.
            </p>
          </div>
          <Link
            to="/create-project"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-primary text-white font-bold shadow-lg hover:bg-primary/90 transition text-lg"
          >
            <Plus className="w-6 h-6" /> Create Project
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
                {Array.from(readNotifications).length < notifications.length && notifications.some(n => !readNotifications.has(n.id)) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center animate-bounce">
                    {notifications.filter(n => !readNotifications.has(n.id)).length}
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
                <div className="mb-4 flex justify-between items-center">
                  <span className="text-lg font-semibold text-primary">Notifications</span>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={() => {
                        setReadNotifications(new Set(notifications.map(n => n.id)))
                        setNotifications(notifications.map(n => ({ ...n, read: true })))
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-primary text-white hover:bg-primary-dark shadow"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {notifications.length === 0 && (
                    <div className="text-center text-gray-500 py-4">No notifications</div>
                  )}
                  {notifications.map(notification => {
                    let icon, iconBg, iconColor, label
                    if (notification.type === 'follow') {
                      icon = <UserPlus className="w-5 h-5" />
                      iconBg = 'bg-blue-100'
                      iconColor = 'text-blue-600'
                      label = 'New Follower'
                    } else if (notification.type === 'like') {
                      icon = <Heart className="w-5 h-5" />
                      iconBg = 'bg-pink-100'
                      iconColor = 'text-pink-600'
                      label = 'Project Liked'
                    } else if (notification.type === 'comment') {
                      icon = <MessageCircle className="w-5 h-5" />
                      iconBg = 'bg-green-100'
                      iconColor = 'text-green-600'
                      label = 'New Comment'
                    } else {
                      icon = <Bell className="w-5 h-5" />
                      iconBg = 'bg-gray-200'
                      iconColor = 'text-gray-600'
                      label = 'Notification'
                    }
                    // Extract user name (first word(s) before the action)
                    let name = ''
                    let rest = notification.message
                    const match = notification.message.match(/^([\w\s]+?) (started following you|liked your project|commented on your project)/)
                    if (match) {
                      name = match[1]
                      rest = notification.message.replace(name, '').trim()
                    }
                    const timeAgo = (() => {
                      const now = new Date()
                      const created = new Date(String(notification.createdAt ?? notification.timestamp ?? ''))
                      const diff = Math.floor((now.getTime() - created.getTime()) / 1000)
                      if (diff < 60) return `${diff}s ago`
                      if (diff < 3600) return `${Math.floor(diff/60)}m ago`
                      if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
                      return created.toLocaleDateString()
                    })()
                    return (
                      <div key={notification._id || notification.id} className="flex items-start gap-3 bg-white rounded-lg shadow p-3 relative">
                        <div className={`flex items-center justify-center rounded-full w-9 h-9 ${iconBg}`}>{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900">
                            {name && <span className="font-bold text-primary mr-1">{name}</span>}
                            {rest}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{timeAgo}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {isModalOpen && editForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
              <h2 className="text-2xl font-extrabold text-primary mb-6 tracking-tight">Edit Project</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-title">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    required
                    placeholder="Enter project title"
                    title="Project title"
                  />
                </div>
                {/* Short Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-description">Short Description</label>
                  <input
                    id="edit-description"
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    required
                    placeholder="Brief summary of your project"
                    title="Short description"
                  />
                </div>
                {/* Long Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-longdesc">Long Description</label>
                  <textarea
                    id="edit-longdesc"
                    value={editForm.longDescription}
                    onChange={(e) => setEditForm({ ...editForm, longDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    rows={4}
                    placeholder="Detailed description, goals, and features"
                    title="Long description"
                  />
                </div>
                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-tags">Tags (comma-separated)</label>
                  <input
                    id="edit-tags"
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    placeholder="e.g., react, node, mongodb"
                    title="Project tags"
                  />
                </div>
                {/* GitHub URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-github">GitHub URL</label>
                  <input
                    id="edit-github"
                    type="url"
                    value={editForm.githubUrl}
                    onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    placeholder="https://github.com/username/repo"
                    title="GitHub repository URL"
                  />
                </div>
                {/* Demo URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="edit-demo">Demo URL</label>
                  <input
                    id="edit-demo"
                    type="url"
                    value={editForm.demoUrl}
                    onChange={(e) => setEditForm({ ...editForm, demoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                    placeholder="https://your-demo-url.com"
                    title="Live demo URL"
                  />
                </div>
                <hr className="my-4 border-gray-200" />
                {/* Progress Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Progress</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editForm.progress}
                      onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                      className="flex-1 accent-primary"
                      title="Project progress"
                    />
                    <span className="text-sm font-semibold text-primary w-12 text-right">{editForm.progress}%</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        editForm.progress >= 100 ? 'bg-green-500' :
                        editForm.progress >= 75 ? 'bg-blue-500' :
                        editForm.progress >= 50 ? 'bg-primary' :
                        editForm.progress >= 25 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${editForm.progress}%` }}
                    />
                  </div>
                </div>
                {/* Status Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: 'active' })}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border transition-colors ${
                        editForm.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-green-50'
                      }`}
                    >
                      🚀 Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: 'completed' })}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border transition-colors ${
                        editForm.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-blue-50'
                      }`}
                    >
                      ✅ Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: 'on-hold' })}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border transition-colors ${
                        editForm.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-yellow-50'
                      }`}
                    >
                      ⏸️ On Hold
                    </button>
                  </div>
                </div>
                {/* Collaborators Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Collaborators</label>
                  <input
                    type="text"
                    value={collabSearch}
                    onChange={e => handleCollabSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                    placeholder="Search users by name or email to add..."
                  />
                  {/* Selected Collaborators */}
                  {editForm.collaborators && editForm.collaborators.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editForm.collaborators.filter(Boolean).map((collab: any) => (
                        <div key={collab._id} className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1">
                          <img
                            src={collab.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name || collab.username || 'User')}`}
                            alt={collab.name || collab.username || 'User'}
                            className="w-7 h-7 rounded-full border border-gray-200 bg-white object-cover"
                          />
                          <span className="text-sm text-gray-700 font-medium mr-1">{collab.name || collab.username || 'User'}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCollaborator(collab._id)}
                            className="text-gray-400 hover:text-red-500 text-lg px-1 rounded-full focus:outline-none"
                            title="Remove collaborator"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {collabLoading && <div className="text-xs text-gray-400 mb-2">Searching...</div>}
                  {collabResults.length > 0 && (
                    <div className="space-y-2">
                      {collabResults.map(user => (
                        <div
                          key={user._id}
                          onClick={() => handleAddCollaborator(user)}
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                        >
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!collabLoading && collabSearch.length >= 2 && collabResults.length === 0 && (
                    <div className="text-xs text-gray-500 py-2">No users found</div>
                  )}
                </div>
                <hr className="my-4 border-gray-200" />
                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditId(null)
                      setEditForm(null)
                    }}
                    className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-semibold shadow-sm border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold shadow-sm border border-primary"
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
              <button
                onClick={() => exportCSV(projects, 'my-projects.csv')}
                className="px-4 py-2 mb-4 bg-primary text-white rounded-md hover:bg-primary-dark transition"
              >
                Export My Projects
              </button>
            </div>
          )}
        </div>

        {/* Bookmarked Projects Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-primary mb-4">Bookmarked Projects</h2>
          {bookmarkedProjects.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No bookmarked projects yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedProjects.map(project => (
                <div
                  key={project._id}
                  className="bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative cursor-pointer hover:shadow-lg transition"
                  onClick={() => window.location.href = `/projects/${project._id}`}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                  <button
                    onClick={e => { e.stopPropagation(); handleRemoveBookmark(project._id) }}
                    className="absolute top-4 right-4 text-blue-400 hover:text-red-500 font-semibold text-sm"
                    title="Remove bookmark"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 