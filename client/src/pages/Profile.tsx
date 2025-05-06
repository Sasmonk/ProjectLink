import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useParams } from 'react-router-dom'

export default function Profile() {
  const { user, token, setUser } = useAuth()
  const { id: paramId } = useParams()
  const isOwnProfile = !paramId || paramId === user?.id
  const [profile, setProfile] = useState<any>(null)
  const [followers, setFollowers] = useState<string[]>([])
  const [followLoading, setFollowLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    bio: '',
    skills: '',
    avatar: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // User's projects state
  const [projects, setProjects] = useState<any[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  // (Optional) Followers modal/section
  const [showFollowers, setShowFollowers] = useState(false)

  // Fetch profile (own or other)
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(paramId ? `/api/users/${paramId}` : '/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data)
        setFollowers(data.followers || [])
        setIsFollowing(user && data.followers?.includes(user.id))
        if (!paramId) {
          setFormData({
            name: data.name || '',
            institution: data.institution || '',
            bio: data.bio || '',
            skills: (data.skills || []).join(', '),
            avatar: data.avatar || '',
          })
          setUser && setUser(data)
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching profile')
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchProfile()
  }, [token, paramId])

  // Fetch user's projects
  const fetchProjects = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects?author=${user.id}`)
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch (err: any) {
      setError(err.message || 'Error fetching projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchProjects()
    // eslint-disable-next-line
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          institution: formData.institution,
          bio: formData.bio,
          avatar: formData.avatar,
          skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      const data = await res.json()
      setUser && setUser(data)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      fetchProjects() // Refetch projects in case name/avatar changed
    } catch (err: any) {
      setError(err.message || 'Error updating profile')
    }
  }

  // Follow/unfollow logic
  const handleFollow = async () => {
    if (!token || !profile || followLoading) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/users/${profile._id}/${isFollowing ? 'unfollow' : 'follow'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to update follow')
      setIsFollowing(!isFollowing)
      setFollowers(prev => isFollowing && user ? prev.filter(id => id !== user.id) : user ? [...prev, user.id] : prev)
    } catch (err: any) {
      alert(err.message || 'Error updating follow')
    } finally {
      setFollowLoading(false)
    }
  }

  if (!token) {
    return <div>Please log in to view your profile.</div>
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading profile...</div>
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-40 bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-300">
            <div className="absolute -bottom-20 left-8 flex items-center gap-4">
              <img
                src={profile?.avatar || 'https://ui-avatars.com/api/?name=User'}
                alt={profile?.name || 'User'}
                className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white"
              />
              <div className="mt-16">
                <h1 className="text-3xl font-bold text-primary drop-shadow-sm">{profile?.name || 'Your Name'}</h1>
                <p className="text-lg text-gray-700 font-medium">{profile?.institution || 'Your Institution'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    className="text-primary font-semibold hover:underline focus:outline-none"
                    onClick={() => setShowFollowers(true)}
                  >
                    {followers.length} follower{followers.length !== 1 ? 's' : ''}
                  </button>
                  {!isOwnProfile && user && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`px-4 py-2 rounded-full font-semibold shadow border transition-colors ${isFollowing ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-primary text-white border-primary'} ${followLoading ? 'opacity-60' : 'hover:bg-primary-dark'}`}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-20 pb-8 px-8">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                    Institution
                  </label>
                  <input
                    type="text"
                    id="institution"
                    name="institution"
                    required
                    value={formData.institution}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    required
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                    Skills
                  </label>
                  <input
                    type="text"
                    id="skills"
                    name="skills"
                    required
                    value={formData.skills}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter skills separated by commas"
                  />
                </div>

                <div>
                  <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                    Avatar URL
                  </label>
                  <input
                    type="text"
                    id="avatar"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://ui-avatars.com/api/?name=Your+Name"
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Save Changes
                  </button>
                </div>
                {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
                {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile?.name || 'Your Name'}</h1>
                    <p className="text-gray-600">{profile?.institution || 'Your Institution'}</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Edit Profile
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
                    <p className="text-gray-600">{profile?.bio || 'Tell us about yourself.'}</p>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {(profile?.skills ? (profile.skills.split(',').map((s: string) => s.trim()).filter((skill: string) => Boolean(skill))) : []).map((skill: string) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* My Projects Section */}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">My Projects</h2>
                    {projectsLoading ? (
                      <div className="text-gray-500">Loading projects...</div>
                    ) : projectsError ? (
                      <div className="text-red-500">{projectsError}</div>
                    ) : projects.length === 0 ? (
                      <div className="text-gray-500">You have not created any projects yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {projects.map(project => (
                          <div
                            key={project._id}
                            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => window.location.href = `/projects/${project._id}`}
                          >
                            <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{project.description}</p>
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
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1">
                                {project.tags && project.tags.map((tag: string) => (
                                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mr-1">{tag}</span>
                                ))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* (Optional) Followers modal/section */}
      {showFollowers && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Followers</h2>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {followers.length === 0 ? (
                <li className="text-gray-500">No followers yet.</li>
              ) : (
                followers.map(fid => (
                  <li key={fid} className="text-gray-700">{fid}</li>
                ))
              )}
            </ul>
            <button onClick={() => setShowFollowers(false)} className="mt-4 px-4 py-2 bg-primary text-white rounded-full">Close</button>
          </div>
        </div>
      )}
    </div>
  )
} 