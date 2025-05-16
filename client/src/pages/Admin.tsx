import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User } from '../types/User'
import { exportCSV } from '../utils/exportCSV'
import { MoreVertical, Shield, UserX, UserCheck, Trash2 } from 'lucide-react'

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

interface DashboardStats {
  totalUsers: number
  totalProjects: number
  totalLikes: number
  totalComments: number
  activeUsers: number
}

interface Project {
  _id: string
  title: string
  description: string
  owner: User
  members: User[]
  skills: string[]
  status: 'open' | 'in-progress' | 'completed'
  createdAt: string
  updatedAt: string
}

export default function Admin() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their projects, likes, and comments.')) return

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete user')
      await Promise.all([fetchStats(), fetchUsers(), fetchProjects()])
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filtered users based on search
  const filteredUsers = users.filter(user => {
    const q = userSearch.toLowerCase()
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.institution && user.institution.toLowerCase().includes(q))
    )
  })

  // Add these handlers inside the Admin component
  const handleRoleChange = async (userId: string, isAdmin: boolean) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAdmin }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBanChange = async (userId: string, banned: boolean) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ banned }),
      });
      if (!res.ok) throw new Error('Failed to update ban status');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([fetchStats(), fetchUsers(), fetchProjects()])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">Error: {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor and manage your platform
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="mt-2 text-3xl font-semibold text-primary">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
              <p className="mt-2 text-3xl font-semibold text-primary">{stats.totalProjects}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Total Likes</h3>
              <p className="mt-2 text-3xl font-semibold text-primary">{stats.totalLikes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Total Comments</h3>
              <p className="mt-2 text-3xl font-semibold text-primary">{stats.totalComments}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <p className="mt-2 text-3xl font-semibold text-primary">{stats.activeUsers}</p>
            </div>
          </div>
        )}

        {/* Users Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <input
              type="text"
              placeholder="Search users by name, email, or institution..."
              className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => exportCSV(users, 'all-users.csv')}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
              >
                Export All Users
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-8 w-8 rounded-full"
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                          alt={user.name}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.institution}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="relative group">
                        <button className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary" title="User Actions">
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-10">
                          <ul className="py-1">
                            <li>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-800"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </button>
                            </li>
                            <li>
                              {user.isAdmin ? (
                                <button
                                  onClick={() => handleRoleChange(user._id, false)}
                                  className="flex items-center w-full px-4 py-2 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-800"
                                  title="Remove Admin"
                                >
                                  <Shield className="w-4 h-4 mr-2" /> Remove Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRoleChange(user._id, true)}
                                  className="flex items-center w-full px-4 py-2 text-green-600 hover:bg-green-50 hover:text-green-800"
                                  title="Make Admin"
                                >
                                  <Shield className="w-4 h-4 mr-2" /> Make Admin
                                </button>
                              )}
                            </li>
                            <li>
                              {user.banned ? (
                                <button
                                  onClick={() => handleBanChange(user._id, false)}
                                  className="flex items-center w-full px-4 py-2 text-green-600 hover:bg-green-50 hover:text-green-800"
                                  title="Unban User"
                                >
                                  <UserCheck className="w-4 h-4 mr-2" /> Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanChange(user._id, true)}
                                  className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-800"
                                  title="Ban User"
                                >
                                  <UserX className="w-4 h-4 mr-2" /> Ban
                                </button>
                              )}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => exportCSV(projects, 'all-projects.csv')}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
              >
                Export All Projects
              </button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map(project => (
                  <tr key={project._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.title}</div>
                      <div className="text-sm text-gray-500">{project.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.owner?.name}</div>
                      <div className="text-sm text-gray-500">{project.owner?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.likes?.length || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.comments?.length || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 