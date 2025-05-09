import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Search, Heart, Tag } from 'lucide-react'

export default function Projects() {
  const { user, token } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Fetch projects from backend
  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = '/api/projects?'
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`
      if (selectedTag) url += `tags=${encodeURIComponent(selectedTag)}&`
      const res = await fetch(url)
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
    fetchProjects()
    // eslint-disable-next-line
  }, [searchQuery, selectedTag])

  // Collect all tags from projects
  const allTags = Array.from(new Set(projects.flatMap(project => project.tags || [])))

  // Clear filters handler
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedTag(null)
  }

  const handleLike = async (projectId: string, liked: boolean) => {
    if (!token || !user) return
    try {
      const res = await fetch(`/api/projects/${projectId}/${liked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to update like')
      setProjects(prev => prev.map(p =>
        p._id === projectId
          ? { ...p, likes: liked ? p.likes.filter((id: string) => id !== user.id) : [...(p.likes || []), user.id] }
          : p
      ))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight mb-2">Explore Student Projects</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Discover, like, and collaborate on innovative projects from students around the world.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <div className="flex-1 max-w-lg relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search projects by keyword..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg shadow-sm bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Tag Dropdown */}
          <div className="flex gap-2 items-center relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Tag className="w-5 h-5" />
            </span>
            <label htmlFor="tag-select" className="sr-only">Filter by tag</label>
            <select
              id="tag-select"
              title="Filter by tag"
              className="pl-10 pr-8 py-2 rounded-full border border-gray-300 bg-white text-primary text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm appearance-none min-w-[180px]"
              value={selectedTag || ''}
              onChange={e => setSelectedTag(e.target.value || null)}
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'16\' height=\'16\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\' viewBox=\'0 0 24 24\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em' }}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
            {(searchQuery || selectedTag) && (
              <button
                onClick={clearFilters}
                className="ml-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading/Error State */}
        {loading && <div className="text-center py-12 text-gray-500 text-lg">Loading projects...</div>}
        {error && <div className="text-center py-12 text-red-500 text-lg">{error}</div>}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {!loading && !error && projects.map(project => (
            <div
              key={project._id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer group relative border border-gray-100 flex flex-col h-full"
              onClick={e => {
                if ((e.target as HTMLElement).closest('button')) return
                navigate(`/projects/${project._id}`)
              }}
            >
              <div className="p-7 flex flex-col gap-3 h-full">
                <div className="flex items-center gap-3 mb-1">
                  <img
                    src={project.author?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.author?.name || 'User')}
                    alt={project.author?.name || 'User'}
                    className="w-10 h-10 rounded-full border border-gray-200 bg-white object-cover"
                    onError={e => {
                      const target = e.currentTarget;
                      const fallback = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.author?.name || 'User');
                      if (target.src !== fallback) target.src = fallback;
                    }}
                  />
                  <div>
                    <span className="font-semibold text-primary text-base">{project.author?.name || 'Unknown'}</span>
                    <span className="mx-1 text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{project.author?.institution || ''}</span>
                  </div>
                  {/* Collaborators Avatars */}
                  {project.collaborators && project.collaborators.filter(Boolean).length > 0 && (
                    <div className="flex items-center ml-2">
                      {project.collaborators.filter(Boolean).slice(0, 3).map((collab: any, idx: number) => (
                        <img
                          key={collab._id || idx}
                          src={collab.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name || 'User')}`}
                          alt={collab.name || 'Collaborator'}
                          className="w-7 h-7 rounded-full border-2 border-white -ml-2 shadow"
                          title={collab.name || 'Collaborator'}
                          style={{ zIndex: 10 }}
                        />
                      ))}
                      {project.collaborators.filter(Boolean).length > 3 && (
                        <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-semibold border border-gray-300" title={`${project.collaborators.filter(Boolean).length - 3} more`}>+{project.collaborators.filter(Boolean).length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {project.title}
                </h3>
                <p className="text-gray-600 text-base mb-2 line-clamp-2">
                  {project.description}
                </p>
                {/* Progress Bar */}
                <div className="mb-2">
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
                </div>
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
                <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition font-semibold ${user && project.likes?.includes(user.id) ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400 hover:bg-pink-50 hover:text-pink-500'}`}
                      onClick={e => { e.stopPropagation(); if (user) handleLike(project._id, project.likes?.includes(user.id)) }}
                      disabled={!user}
                      title={user ? (project.likes?.includes(user.id) ? 'Unlike' : 'Like') : 'Sign in to like'}
                    >
                      <Heart fill={user && project.likes?.includes(user.id) ? '#ec4899' : 'none'} stroke={user && project.likes?.includes(user.id) ? '#ec4899' : 'currentColor'} className="w-4 h-4" />
                      <span>{project.likes?.length || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <svg className="w-20 h-20 text-primary/20 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <h3 className="text-2xl font-bold text-gray-900">No projects found</h3>
            <p className="mt-2 text-lg text-gray-500">
              Try adjusting your search or filter to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 