import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

export default function Profile() {
  const { id } = useParams()
  if (!id) return <div>User not found</div>
  const { user, token, setUser } = useAuth()
  const [profileUser, setProfileUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Fetch user data and projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user data
        const userRes = await fetch(`${API_URL}/users/${id}`)
        if (!userRes.ok) throw new Error('Failed to fetch user')
        const userData = await userRes.json()
        setProfileUser(userData)
        
        // Check if current user is following
        if (user && user.id !== id) {
          const following = (user as any).following || [];
          setIsFollowing(following.includes(userData._id))
        }
        // Fetch user's projects
        const projectsRes = await fetch(`${API_URL}/projects?author=${id}`)
        if (!projectsRes.ok) throw new Error('Failed to fetch projects')
        const projectsData = await projectsRes.json()
        setProjects(projectsData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchData()
  }, [id, user])

  const handleEditProfile = () => {
    setEditForm({
      name: profileUser.name,
      institution: profileUser.institution,
      avatar: profileUser.avatar,
      bio: profileUser.bio || '',
      skills: (profileUser.skills || []).join(', '),
    })
    setEditMode(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setEditLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editForm,
          skills: editForm.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const updated = await res.json()
      setProfileUser(updated)
      setUser && setUser({ ...user, ...updated })
      setEditMode(false)
    } catch (err: any) {
      alert(err.message || 'Error updating profile')
    } finally {
      setEditLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!user || !token || !profileUser) return
    setFollowLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/${profileUser._id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to follow user')
      setIsFollowing(true)
    } catch (err) {
      alert('Error following user')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!user || !token || !profileUser) return
    setFollowLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/${profileUser._id}/unfollow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to unfollow user')
      setIsFollowing(false)
    } catch (err) {
      alert('Error unfollowing user')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!profileUser) return <div>User not found</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* User Profile */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-10 mb-12 max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <img
              src={profileUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name)}`}
              alt={profileUser.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
            />
            <div className="flex-1 w-full">
              <h1 className="text-3xl font-extrabold text-primary mb-1">{profileUser.name}</h1>
              <p className="text-lg text-gray-500 mb-2">{profileUser.institution}</p>
              {profileUser.bio && <p className="mb-2 text-gray-600 text-base">{profileUser.bio}</p>}
              {profileUser.skills && profileUser.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {profileUser.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20 font-semibold shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {/* Edit Profile Button (only for self) */}
              {user && user._id === profileUser._id && !editMode && (
                <button
                  onClick={handleEditProfile}
                  className="mt-3 px-7 py-2 bg-primary text-white rounded-full font-bold shadow hover:bg-primary/90 transition text-lg"
                >
                  Edit Profile
                </button>
              )}
              {/* Edit Profile Form */}
              {editMode && (
                <form onSubmit={handleEditSubmit} className="mt-6 space-y-6 border-t pt-6">
                  <h2 className="text-xl font-bold text-primary mb-2">Edit Profile</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                        required
                        placeholder="Your Name"
                        title="Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Institution</label>
                      <input
                        type="text"
                        name="institution"
                        value={editForm.institution}
                        onChange={handleEditChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                        required
                        placeholder="Your Institution"
                        title="Institution"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Avatar URL</label>
                    <input
                      type="url"
                      name="avatar"
                      value={editForm.avatar}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                      placeholder="https://..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste a direct image URL (e.g., from Imgur, Unsplash, or <a href='https://ui-avatars.com/' target='_blank' rel='noopener noreferrer' className='underline'>ui-avatars.com</a>).<br />
                      Right-click any web image and choose "Copy image address" to use it as your avatar.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                    <textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                      rows={3}
                      placeholder="Tell us about yourself"
                      title="Bio"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Skills (comma separated)</label>
                    <input
                      type="text"
                      name="skills"
                      value={editForm.skills}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                      placeholder="e.g. React, Node.js, MongoDB"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      className="px-7 py-2 bg-primary text-white rounded-full font-bold shadow hover:bg-primary/90 transition text-lg disabled:opacity-50"
                      disabled={editLoading}
                    >
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="px-7 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition text-lg"
                      onClick={() => setEditMode(false)}
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {/* Follow/Unfollow Button */}
              {user && user.id !== profileUser._id && (
                isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    disabled={followLoading}
                    className="mt-4 px-7 py-2 bg-gray-300 text-gray-700 rounded-full font-bold shadow hover:bg-gray-400 transition text-lg"
                  >
                    {followLoading ? 'Unfollowing...' : 'Unfollow'}
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="mt-4 px-7 py-2 bg-primary text-white rounded-full font-bold shadow hover:bg-primary/90 transition text-lg"
                  >
                    {followLoading ? 'Following...' : 'Follow'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* User's Projects */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                onClick={() => window.location.href = `/projects/${project._id}`}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <span>{project.likes?.length || 0} likes</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No projects found</p>
            </div>
          )}
        </div>

        {/* Followers/Following Lists */}
        <div className="flex flex-col md:flex-row gap-8 mt-8">
          {/* Followers */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary mb-2">Followers</h2>
            {profileUser.followers && profileUser.followers.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {profileUser.followers.map((f: any) => (
                  <a
                    key={f._id || f}
                    href={`/profile/${f._id || f}`}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 hover:bg-primary/10 transition"
                  >
                    <img
                      src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || f.username || 'User')}`}
                      alt={f.name || f.username || 'User'}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white object-cover"
                    />
                    <span className="text-sm font-semibold text-primary">{f.name || f.username || 'User'}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No followers yet.</div>
            )}
          </div>
          {/* Following */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary mb-2">Following</h2>
            {profileUser.following && profileUser.following.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {profileUser.following.map((f: any) => (
                  <a
                    key={f._id || f}
                    href={`/profile/${f._id || f}`}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 hover:bg-primary/10 transition"
                  >
                    <img
                      src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || f.username || 'User')}`}
                      alt={f.name || f.username || 'User'}
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white object-cover"
                    />
                    <span className="text-sm font-semibold text-primary">{f.name || f.username || 'User'}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Not following anyone yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 